const aws = require("aws-sdk");
const sharp = require("sharp");
const fsp = require("fs").promises;
const fs = require("fs");
const path = require("path");
const exifReader = require("exif-reader");

const {
  awsRegion: region,
  awsBucket: Bucket,
} = require("../../chaffinch.config.js");

const shutterSpeed = require("../../lib/shutterSpeed");

function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
    arr.slice(i * size, i * size + size)
  );
}

async function processExifBuffer(buf) {
  const data = exifReader(buf);
  const correctedData = {
    ...data,
    exif: {
      ...data.exif,
      DateTimeOriginal: new Date(data.exif.DateTimeOriginal),
      FocalLength: data.exif.FocalLength ? `${data.exif.FocalLength}mm` : "-",
      FNumber: data.exif.FNumber ? `f${data.exif.FNumber}` : "-",
      ShutterSpeedValue: data.exif.ShutterSpeedValue
        ? `${shutterSpeed(
            Math.pow(2, -data.exif.ShutterSpeedValue).toFixed(3)
          )}s`
        : "-",
    },
  };

  return correctedData;
}

async function getPhotoMetadata(imgPath) {
  const img = sharp(imgPath);
  const metadata = await img.metadata();

  const { height, width } = metadata;

  const aspectRatio = ((height / width) * 100).toString();

  const exifData = await processExifBuffer(metadata.exif);
  const imgBuf = await img.resize(16).blur().toBuffer();
  const b64str = imgBuf.toString("base64");
  return { blurPreview: b64str, metadata: { ...exifData, aspectRatio } };
}

async function getS3ObjectHead(keys, s3) {
  const promises = keys.map((key) => {
    return s3.headObject({ Key: key, Bucket }).promise();
  });

  const heads = await Promise.all(promises);

  const data = new Map(heads.map((val, i) => [keys[i], val]));

  return data;
}

const dateSortFn = (a, b) =>
  b.metadata.exif.DateTimeOriginal - a.metadata.exif.DateTimeOriginal;

module.exports = async function () {
  console.log("Beginning photo download...");
  aws.config.setPromisesDependency();
  aws.config.update({
    region,
  });

  const s3 = new aws.S3();

  console.log(
    `Getting photo list from bucket ${Bucket} in S3 region ${region}`
  );
  const list = await s3
    .listObjectsV2({
      Bucket,
    })
    .promise();

  if (!list.Contents) throw new Error("Couldn't load list from S3");

  const s3ObjectHeadsPromise = getS3ObjectHead(
    list.Contents.map((x) => x.Key),
    s3
  );

  const listData = list.Contents.map((photo) => {
    return {
      file: photo.Key,
      description: "A photo",
    };
  });

  const parentDirectory = path.resolve(__dirname, "..");
  const imgDirectory = path.join(parentDirectory, "img");
  try {
    await fsp.mkdir(imgDirectory);
  } catch (e) {
    if (e.code != "EEXIST") throw e;
  }

  console.log(`Got ${listData.length}`);
  const chunkedList = chunk(listData, 100);
  console.log(`Downloading in ${chunkedList.length} chunks`);
  for (chunk of chunkedList) {
    const streams = [];
    chunk.forEach((photo) => {
      const imgPath = path.join(imgDirectory, photo.file);
      if (fs.existsSync(imgPath)) return;
      const stream = s3
        .getObject({ Key: photo.file, Bucket })
        .createReadStream();
      const outStream = fs.createWriteStream(imgPath);
      stream.pipe(outStream);

      streams.push(
        new Promise((resolve, reject) => {
          stream.on("error", (err) => reject(err));
          outStream.on("error", (err) => reject(err));
          stream.on("end", () => resolve());
        })
      );
    });
    console.log(`Downloading ${streams.length} new photos...`);
    await Promise.all(streams);
  }

  console.log("...Done");

  const s3ObjectHeads = await s3ObjectHeadsPromise;

  for (const photo of listData) {
    const imgPath = path.join(imgDirectory, photo.file);
    const { metadata, blurPreview } = await getPhotoMetadata(imgPath);

    photo.metadata = metadata;
    photo.blurPreview = blurPreview;
    photo.description = s3ObjectHeads.get(photo.file)?.Metadata.description;
    photo.path = path.join("img", photo.file);
  }

  return listData.sort(dateSortFn);
};

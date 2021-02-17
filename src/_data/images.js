const aws = require("aws-sdk");
const fsp = require("fs").promises;
const fs = require("fs");
const path = require("path");
const {
  awsRegion: region,
  awsBucket: Bucket,
} = require("../../chaffinch.config.js");

function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
    arr.slice(i * size, i * size + size)
  );
}

module.exports = async function () {
  console.log("Beginning photo download...");
  aws.config.setPromisesDependency();
  aws.config.update({ region });

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

  const listData = list.Contents.map((photo) => {
    return {
      file: photo.Key,
      description: "A photo",
      date: new Date(photo.LastModified),
    };
  }).sort((a, b) => a.date > b.date);

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
    const streams = chunk.map((photo) => {
      const stream = s3
        .getObject({ Key: photo.file, Bucket })
        .createReadStream();
      const outStream = fs.createWriteStream(
        path.join(imgDirectory, photo.file)
      );
      stream.pipe(outStream);

      return new Promise((resolve, reject) => {
        stream.on("error", (err) => reject(err));
        outStream.on("error", (err) => reject(err));
        stream.on("end", () => resolve());
      });
    });
    console.log(`Downloading ${streams.length} photos...`);
    await Promise.all(streams);
  }

  return listData;
};
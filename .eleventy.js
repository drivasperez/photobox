const sharp = require("sharp");
const exif = require("exif");
const shutterSpeed = require("./lib/shutterSpeed");
const { format } = require("date-fns");

module.exports = function(cfg) {
  const config = {
    dir: {
      input: "src",
      output: ".build-tmp",
    },
  };

  const exifData = new Map();

  cfg.addNunjucksFilter("date", function(date, formatStr, sep) {
    const fmt = formatStr || "dd/MM/yyyy";

    let dateArr = [date];
    if (sep) {
      dateArr = date.split(sep).flatMap(x => x.split(" "));
    }

    return format(new Date(...dateArr), fmt);
  });

  cfg.addNunjucksAsyncFilter("aspect", async function(path, callback) {
    try {
      const { height, width } = await sharp(path).metadata();

      callback(null, ((height / width) * 100).toString());
    } catch (error) {
      callback(null, "150");
    }
  });

  cfg.addNunjucksAsyncFilter("blurPreview", async function(path, callback) {
    try {
      const imgBuf = await sharp(path)
        .resize(16)
        .blur()
        .toBuffer();
      const b64str = imgBuf.toString("base64");
      callback(null, b64str);
    } catch (error) {
      callback(null, "");
    }
  });

  function returnExifData(data, attributes, callback) {
    if (!attributes) {
      callback(null, JSON.stringify(data));
      return;
    }

    let strs = [];
    for (const attrib of attributes) {
      const trail = attrib.split(".");
      let item = data[trail[0]];

      for (let i = 1; i < trail.length; i++) {
        item = item[trail[i]];
      }

      strs.push(item);
    }
    callback(null, strs.join(" "));
  }

  cfg.addNunjucksAsyncFilter("exif", async function(
    path,
    attributes,
    callback
  ) {
    attributes = Array.isArray(attributes) ? attributes : [attributes];

    if (exifData.has(path)) {
      returnExifData(exifData.get(path), attributes, callback);
      return;
    }

    exif({ image: path }, (_err, data) => {
      const correctedData = {
        ...data,
        exif: {
          ...data.exif,
          FocalLength: data.exif.FocalLength
            ? `${data.exif.FocalLength}mm`
            : "-",
          FNumber: data.exif.FNumber ? `f${data.exif.FNumber}` : "-",
          ShutterSpeedValue: data.exif.ShutterSpeedValue
            ? `${shutterSpeed(
                Math.pow(2, -data.exif.ShutterSpeedValue).toFixed(3)
              )}s`
            : "-",
        },
      };
      exifData.set(path, correctedData);
      returnExifData(correctedData, attributes, callback);
    });
  });

  return config;
};

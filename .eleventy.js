const sharp = require("sharp");
const { format } = require("date-fns");
const exif = require("exif");
const shutterSpeed = require("./lib/shutterSpeed");
require("dotenv").config();

module.exports = function (cfg) {
  const config = {
    dir: {
      input: "src",
      output: ".build-tmp",
    },
  };

  cfg.addNunjucksFilter("date", function (date, formatStr = "dd/MM/yyyy") {
    console.log("date", date, typeof date);
    const formatted = format(date, formatStr);
    return formatted;
  });

  cfg.addNunjucksAsyncFilter("aspect", async function (path, callback) {
    try {
      const { height, width } = await sharp(path).metadata();

      callback(null, ((height / width) * 100).toString());
    } catch (error) {
      callback(null, "150");
    }
  });

  cfg.addNunjucksAsyncFilter("blurPreview", async function (path, callback) {
    try {
      const imgBuf = await sharp(path).resize(16).blur().toBuffer();
      const b64str = imgBuf.toString("base64");
      callback(null, b64str);
    } catch (error) {
      callback(null, "");
    }
  });

  cfg.addFilter("log", (value) => {
    console.log(value);
  });

  return config;
};

const sharp = require("sharp");
const { format } = require("date-fns");
require("dotenv").config();

module.exports = function (cfg) {
  const config = {
    dir: {
      input: "src",
      output: ".build-tmp",
    },
  };

  cfg.addNunjucksFilter("date", function (date, formatStr = "dd/MM/yyyy") {
    const formatted = format(date, formatStr);
    return formatted;
  });

  cfg.addFilter("log", (value) => {
    console.log(value);
  });

  return config;
};

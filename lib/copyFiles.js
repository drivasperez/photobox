const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const copyFilePromise = promisify(fs.copyFile);

export default function copyFiles(srcDir, destDir, files) {
  return Promise.all(
    files.map(f => copyFilePromise(path.join(srcDir, f), path.join(destDir, f)))
  );
}

import sharp from "sharp";
import { join, resolve, relative, parse, sep } from "path";

const imgPrefix = /img-([\d]+)\((["'])(.*)\2\)/;

function assetURLToPath(filePath, parentPath) {
  if (filePath.startsWith("/")) {
    return filePath
      .slice(1)
      .split("/")
      .join(sep);
  }

  const parentDir = parse(parentPath).dir;
  const resolvedPath = resolve(parentDir, ...filePath.split("/"));
  return relative(".build-tmp", resolvedPath);
}

export default function sharpPlugin() {
  let assetCache;

  function processContent(rollup, filePath) {
    let content = fs.readFileSync(filePath, { encoding: "utf8" });

    content = content.replace(
      imgPrefix,
      (_fullMatch, width, _quote, path) => {}
    );
  }

  return {
    name: "sharp-plugin",
    buildStart() {
      assetCache = new Map();
    },

    generateBundle(options, bundle) {
      console.log("BUNDLE:", Object.keys(bundle));
    },
  };
}

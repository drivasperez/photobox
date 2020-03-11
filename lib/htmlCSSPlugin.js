import fs, { promises as fsp } from "fs";
import { join, resolve, relative, parse, sep, basename } from "path";
import sharp from "sharp";

import { minify as minifyHTML } from "html-minifier";
import requireFromString from "require-from-string";
import escapeRE from "escape-string-regexp";

const { path: urlPrefix } = require("./chaffinch.config.js");

const imgPrefix = /img-([\d]+)\((["']?)([^'"\\]*)\2\)/g;

const contentStart = "£££CONTENTSTART";
const contentEnd = "£££CONTENTEND";

const replaceAsync = async (input, regex, replacer) => {
  // we need to remove the 'g' flag, if defined, so that all replacements can be made
  let flags = (regex.flags || "").replace("g", "");
  let re = new RegExp(regex.source || regex, flags);
  let index = 0;
  let match;

  while ((match = re.exec(input.slice(index)))) {
    let value = await replacer(...match);
    index += match.index;
    input =
      input.slice(0, index) + value + input.slice(index + match[0].length);
    index += match[0].length;

    // if 'g' was not defined on flags, break
    if (flags === regex.flags) {
      break;
    }
  }

  return input;
};

const contentStrRE = new RegExp(
  `['"]${escapeRE(contentStart)}([\\w\\W]*)${escapeRE(contentEnd)}['"]`
);

const contentRE = new RegExp(
  `${escapeRE(contentStart)}([\\w\\W]*)${escapeRE(contentEnd)}`
);

const importMetaStart = "#";
const importMetaEnd = "#";
const importMetaRE = new RegExp(
  escapeRE(importMetaStart) +
    "(import.meta.ROLLUP_.*?)" +
    escapeRE(importMetaEnd),
  "g"
);

function getAsset(path) {
  try {
    return fs.readFileSync(join(".build-tmp", path));
  } catch (_err) {
    return fs.readFileSync(join("src", path));
  }
}

async function resizeImage(path, width, newPath) {
  const cachedFilename = basename(newPath);
  try {
    return await fsp.readFile(join(".imgCache", cachedFilename));
  } catch (err) {
    console.log("Could not find", cachedFilename, "in cache, resizing");
  }
  try {
    const imgBuf = await sharp(join(".build-tmp", path))
      .resize(parseInt(width, 10), null, { withoutEnlargement: true })
      .toBuffer();

    await fsp.writeFile(join(".imgCache", cachedFilename), imgBuf);

    return imgBuf;
  } catch (_err) {
    const imgBuf = await sharp(join("src", path))
      .resize(parseInt(width, 10))
      .toBuffer();

    await fsp.writeFile(join(".imgCache", cachedFilename), imgBuf);

    return imgBuf;
  }
}

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

const defaultOptions = {
  htmlMinify: {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
  },
};

export default function htmlCSSPlugin(userOptions = {}) {
  let assetCache;
  let imgCache;
  let nonJSChunks;
  const options = { ...defaultOptions, ...userOptions };

  async function processContent(rollup, filePath) {
    let content = fs.readFileSync(filePath, { encoding: "utf8" });

    content = content.replace(
      /chaffinchAsset\((['"]?)(.*?)\1\)/g,
      (_fullMatch, _quote, path) => {
        const targetPath = assetURLToPath(path, filePath);

        if (/\.(jsx?|css|html|json)$/.test(targetPath)) {
          const isJS = /\.jsx?$/.test(targetPath);
          const isInSrc = isJS || /\.json$/.test(targetPath);
          const parentDir = isInSrc ? "src" : ".build-tmp";
          const moduleId = join(parentDir, targetPath);

          if (!isJS) {
            nonJSChunks.add(join(process.cwd(), moduleId));
          }

          const id = rollup.emitFile({
            type: "chunk",
            id: moduleId,
            name: targetPath.replace(/\.[^\.]+$/, ""),
          });

          return `${importMetaStart}import.meta.ROLLUP_FILE_URL_${id}${importMetaEnd}`;
        }

        if (!assetCache.has(targetPath)) {
          const source = getAsset(targetPath);
          const id = rollup.emitFile({
            type: "asset",
            name: targetPath,
            source,
          });
          assetCache.set(targetPath, id);
        }

        return `${importMetaStart}import.meta.ROLLUP_FILE_URL_${assetCache.get(
          targetPath
        )}${importMetaEnd}`;
      }
    );

    content = replaceAsync(
      content,
      imgPrefix,
      async (_fullMatch, width, _quote, path) => {
        // console.log("Resizing image", path, "to", width, "px");
        const targetPath = assetURLToPath(path, filePath);

        const isImage = /\.(jpg|png)$/.test(targetPath);
        if (!isImage)
          throw new Error(
            `img-${width} imports must use valid image format. Found ${targetPath}`
          );

        const beforeExt = targetPath.slice(0, targetPath.lastIndexOf("."));
        const ext = targetPath.slice(targetPath.lastIndexOf("."));
        const newPath = beforeExt + "-" + width + ext;

        if (!imgCache.has(newPath)) {
          const source = await resizeImage(targetPath, width, newPath);
          const id = rollup.emitFile({ type: "asset", name: newPath, source });
          imgCache.set(newPath, id);
        }

        return `${importMetaStart}import.meta.ROLLUP_FILE_URL_${imgCache.get(
          newPath
        )}${importMetaEnd}`;
      }
    );

    return content;
  }

  return {
    name: "html-css-plugin",
    async buildStart() {
      assetCache = new Map();
      imgCache = new Map();
      nonJSChunks = new Set();
    },
    async load(id) {
      if (!(id.endsWith(".html") || nonJSChunks.has(id))) return;

      nonJSChunks.add(id);

      const content = await processContent(this, id);

      const jsContent = JSON.stringify(
        contentStart + content + contentEnd
      ).replace(importMetaRE, '"+$1+"');
      return `export default ${jsContent}`;
    },
    generateBundle(_, bundle) {
      const renames = new Map();

      for (const [key, item] of Object.entries(bundle)) {
        if (!nonJSChunks.has(item.facadeModuleId)) continue;

        const codeReResult = contentStrRE.exec(item.code);
        if (!codeReResult) {
          throw Error(`Cannot find module content for ${key}`);
        }

        const codeStr = requireFromString(
          `module.exports = ${codeReResult[0]}`
        );

        item.code = contentRE.exec(codeStr)[1];

        const destFileName = item.fileName.replace(
          /\.jsx?$/i,
          /\.[^\.]+$/.exec(item.facadeModuleId)[0]
        );
        delete bundle[key];
        item.fileName = destFileName;
        bundle[destFileName] = item;
        renames.set(key, item.fileName);

        // Remove sourcemaps for html and css (postcss adds its own).
        if (
          item.facadeModuleId.endsWith(".html") ||
          item.facadeModuleId.endsWith(".css")
        ) {
          item.map = null;
        }

        if (item.facadeModuleId.endsWith(".html") && options.htmlMinify) {
          item.code = minifyHTML(item.code, options.htmlMinify);
        }
      }

      for (const [from, to] of renames) {
        const fromRE = new RegExp(escapeRE(from), "g");
        for (const item of Object.values(bundle)) {
          if (item.isAsset) continue;
          item.code = item.code.replace(fromRE, to);
        }
      }

      for (const item of Object.values(bundle)) {
        if (!nonJSChunks.has(item.facadeModuleId)) continue;

        item.code = item.code.replace(
          /chaffinchInline\((['"]?)(.*?)\1\)/g,
          (fullMatch, quote, path) => bundle[path.slice(urlPrefix.length)].code
        );
      }
    },
  };
}

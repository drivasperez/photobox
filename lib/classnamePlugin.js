import { promises as fsp } from "fs";
import { join } from "path";

const defaultOptions = {
  prefix: "classnames",
};

function hyphenToCamel(str) {
  return str.replace(/-\w/g, match => match[1].toUpperCase());
}

export default function(cssFileDir, options = {}) {
  options = { ...defaultOptions, ...options };
  if (!cssFileDir) {
    this.error("Must provide CSS file directory");
  }

  const PREFIX = options.prefix + ":";

  return {
    name: "classnames-loader",
    resolveId(source) {
      if (!source.startsWith(PREFIX)) {
        return;
      }
      return source;
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) {
        return;
      }
      const path = id.slice(PREFIX.length);
      const realPath = join(cssFileDir, path) + ".json";
      const contents = await fsp.readFile(realPath, "utf-8");
      const data = JSON.parse(contents);
      const outputExports = Object.entries(data).map(
        ([from, to]) => `export const ${hyphenToCamel(from)} = '${to}'`
      );
      return outputExports.join(";");
    },
  };
}

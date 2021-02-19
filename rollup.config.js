import fs from "fs";
import path from "path";
import { promisify } from "util";
import globNoPromise from "glob";
import copyFiles from "./lib/copyFiles";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import del from "rollup-plugin-delete";
import liveReload from "rollup-plugin-livereload";

import buildPostCSS from "./lib/buildPostCSS";
import buildStartSequence from "./lib/buildStartSequencePlugin";
import eleventyPlugin from "./lib/eleventyPlugin";
import globInputPlugin from "./lib/globInputPlugin";
import htmlCSSPlugin from "./lib/htmlCSSPlugin";
import assetPlugin from "./lib/assetPlugin";
import classnamePlugin from "./lib/classnamePlugin";

const glob = promisify(globNoPromise);

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

const chaffinchConfig = require("./chaffinch.config.js");
const usePostCSS = fs.existsSync(chaffinchConfig.postCSSconfig);

export default async function ({ watch }) {
  if (usePostCSS) {
    await buildPostCSS("src/**/*.css", ".build-tmp", { watch });
  } else {
    let files = await glob("src/**/*.css");
    // TODO: Watch src for CSS files if watch mode is set.
    // I guess this is a reason to learn what chokidar is.
    files = files.map((file) => file.split(path.sep).slice(1).join(path.sep));

    await copyFiles("src", ".build-tmp", files);
  }

  return {
    input: {},
    output: {
      dir: chaffinchConfig.outputDir + chaffinchConfig.path,
      format: "esm",
      assetFileNames: "[name]-[hash][extname]",
      sourcemap: true,
    },
    watch: {
      clearScreen: false,
      chokidar: false,
      exclude: ".build-tmp/**/*.html",
    },
    plugins: [
      resolve(),
      commonjs(),
      {
        resolveFileUrl({ fileName }) {
          return JSON.stringify(chaffinchConfig.path + fileName);
        },
      },
      buildStartSequence(),
      eleventyPlugin(),
      globInputPlugin(".build-tmp/**/*.html"),
      htmlCSSPlugin(),
      assetPlugin(),
      classnamePlugin(".build-tmp"),
      production && del({ targets: chaffinchConfig.outputDir + "/*" }),
      !production && liveReload(chaffinchConfig.outputDir),
      production && terser({ ecma: 8, module: true }), // minify, but only in production
    ],
  };
}

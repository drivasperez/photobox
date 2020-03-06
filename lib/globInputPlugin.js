import path from "path";
import globNoPromise from "glob";
import { promisify } from "util";

const glob = promisify(globNoPromise);

// Take every file matched by globInput and add it to rollup's input section.
export default function globInputPlugin(globInput) {
  return {
    name: "glob-input-plugin",
    async buildStartSequence(options) {
      const paths = await glob(globInput);
      const entries = paths.map(inputPath => [
        inputPath
          .split(path.sep)
          .slice(1)
          .join(path.sep)
          .replace(/\.[^\.]+$/, ""),
        inputPath,
      ]);

      options.input = { ...options.input, ...Object.fromEntries(entries) };
    },
  };
}

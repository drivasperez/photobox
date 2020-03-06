import { spawn } from "child_process";
import { promisify } from "util";

import globNoPromise from "glob";

const glob = promisify(globNoPromise);

export default function eleventyPlugin() {
  return {
    name: "11ty-plugin",
    async buildStart() {
      const files = await glob("src/**/*.{njk,md}", { nodir: true });
      for (const file of files) this.addWatchFile(file);
    },
    async buildStartSequence() {
      const proc = spawn("eleventy", { stdio: "inherit" });

      await new Promise((resolve, reject) => {
        proc.on("exit", code => {
          if (code !== 0) {
            reject(new Error(`Eleventy build failed with error code ${code}`));
          } else {
            resolve();
          }
        });
      });
    },
  };
}

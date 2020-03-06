import { spawn } from "child_process";

export default async function buildPostCSS(inGlob, outPath, { watch } = {}) {
  const firstDir = inGlob.split("/")[0];
  const options = [inGlob, "--dir", outPath, "--base", firstDir];
  const proc = spawn("postcss", options, { stdio: "inherit" });

  await new Promise(resolve => {
    proc.on("exit", code => {
      if (code !== 0)
        throw new Error(`PostCSS build failed with error code ${code}`);
      resolve();
    });
  });

  if (watch) {
    spawn("postcss", [...options, "--watch"], { stdio: "inherit" });
  }
}

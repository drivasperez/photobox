import sharp from "sharp";
import globNoPromise from "glob";
import { promisify } from "util";
const glob = promisify(globNoPromise);

export default async function resizeImages(sizes = [400, 800, 1200]) {
  console.log("Resizing images");

  const files = await glob("src/img/**/*.{jpg, png}");

  for (const file of files) {
    const beforeExt = file.slice(0, file.lastIndexOf("."));
    const ext = file.slice(file.lastIndexOf("."));
    const resize = width =>
      sharp(file)
        .resize(width)
        .toFile(`${beforeExt}-${width}${ext}`);

    await Promise.all(sizes.map(resize));
  }

  console.log(`Resized ${files.length} images`);
}

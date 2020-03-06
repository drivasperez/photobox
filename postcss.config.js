const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["src/**/*.@(js|ts|jsx|tsx|njk|html)"],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
});

const production = !process.env.ROLLUP_WATCH;
module.exports = {
  plugins: [
    require("postcss-import"),
    require("tailwindcss"),
    require("autoprefixer"),
    ...(production ? [purgecss, require("cssnano")] : []),
  ],
};

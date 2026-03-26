module.exports = function(eleventyConfig) {
  // Ignore non-page files
  eleventyConfig.ignores.add("SITE-DEV.md");

  // Passthrough copy for static assets (paths relative to input dir)
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("img");

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};

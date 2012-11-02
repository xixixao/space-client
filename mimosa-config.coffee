exports.config =
  modules:['lint','require','server','minify','web-package']
  minify:
    exclude:["\\.min\\.", "main.js"]

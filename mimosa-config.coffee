exports.config =
  modules:['lint','require','server','minify','live-reload','web-package']
  minify:
    exclude:["\\.min\\.", "main.js"]

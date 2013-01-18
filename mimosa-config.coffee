exports.config =
  minMimosaVersion: "0.8.5"
  modules:['lint','require','server','minify','live-reload','web-package']
  minify:
    exclude:[/\.min\./, "javascripts/main.js"]

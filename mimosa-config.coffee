exports.config =
  minMimosaVersion: "0.11.1"
  modules:['lint','require','server','minify','live-reload','web-package']
  minify:
    exclude:[/\.min\./, "javascripts/main.js"]

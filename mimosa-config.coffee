exports.config =
  minMimosaVersion: "0.11.1"
  modules:['lint','require','server','minify','live-reload','web-package']
  minify:
    exclude:[/\.min\./, "javascripts/main.js"]
  copy:
    extensions: ["js","css","png","jpg","jpeg","gif","html","eot","svg","ttf","woff","otf","yaml","kml","ico","htc","htm","json","txt","xml","xsd","map","md", "properties", "pdf"]

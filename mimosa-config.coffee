exports.config =
  compilers:
    template:
      compileWith: "html"
      extensions: ["template"]
    css:
      compileWith: "less"
      extensions: ["less"]
  minify:
    exclude:["\.min\.", "main.js"]
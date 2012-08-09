exports.config =
  compilers:
    template:
      compileWith: "html"
      extensions: ["template"]
    css:
      compileWith: "less"
      extensions: ["less"]
  require:
    optimize :
      optimize:'none'    # No idea whatsoever why uglify is jacking up the result
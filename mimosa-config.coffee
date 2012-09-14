exports.config =
  minify:
    exclude:["\.min\.", "main.js"]
  compilers:
    extensionOverrides:                 # A list of extension overrides, format is compilerName:[arrayOfExtensions]
                                          # see http://mimosajs.com/compilers.html for a list of compiler names
      coffee: ["coff", "coffee"]                  # This is an example override, this is not a default
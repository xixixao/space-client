exports.config =
  minMimosaVersion: "0.11.1"
  modules:['lint','require','server','minify','live-reload','web-package']
  minify:
    exclude:[/\.min\./, "javascripts/main.js"]
  copy:
    extensions: ["js","css","png","jpg","jpeg","gif","html","eot","svg","ttf","woff","otf","yaml","kml","ico","htc","htm","json","txt","xml","xsd","map","md", "properties", "pdf"]
  lint:                      # settings for js, css linting/hinting
    # exclude:[]               # array of strings or regexes that match files to not lint,
                               # strings are paths that can be relative to the watch.compiledDir
                               # or absolute
    compiled:                # settings for compiled files
      # javascript:true        # fire jshint on successful compile of meta-language to javascript
      css: false               # fire csslint on successful compile of meta-language to css
    # copied:                  # settings for copied files, files already in .css and .js files
      # javascript: true       # fire jshint for copied javascript files
      # css: true              # fire csslint for copied css files
    # vendor:                  # settings for vendor files
      # javascript: false      # fire jshint for copied vendor javascript files (like jquery)
      # css: false             # fire csslint for copied vendor css files (like bootstrap)
    # rules:                   # All hints/lints come with defaults built in.  Here is where
                               # you'd override those defaults. Below is listed an example of an
                               # overridden default for each lint type, also listed, next to the
                               # lint types is the url to find the settings for overriding.
      # jshintrc: ".jshintrc"  # This is the path, either relative to the root of the project or
                               # absolute, to a .jshintrc file. By default mimosa will look at
                               # the root of the project for this file. The file does not need to
                               # be present. If it is present, it must be valid JSON. To learn
      # javascript:            # Settings: http://www.jshint.com/options/, these settings will
                               # override any settings set up in the jshintrc
        # plusplus: true       # This is an example override, this is not a default
      # css:                   # Settings: https://github.com/stubbornella/csslint/wiki/Rules
        # floats: false        # This is an example override, this is not a default 

express = require 'express'
engines = require 'consolidate'
httpProxy =  require 'http-proxy'


exports.startServer = (config, callback) ->

  app = express()
  server = app.listen config.server.port, ->
     console.log "Express server listening on port %d in %s mode", config.server.port, app.settings.env

  app.configure ->
    app.set 'port', config.server.port
    app.set 'views', config.server.views.path
    app.engine config.server.views.extension, engines[config.server.views.compileWith]
    app.set 'view engine', config.server.views.extension
    app.use express.favicon()
    #app.use express.bodyParser()
    app.use express.methodOverride()
    app.use express.compress()
    app.use app.router
    app.use express.static(config.watch.compiledDir)

  app.configure 'development', ->
    app.use express.errorHandler()

  options =
    reload:    if config.liveReload?.enabled? then config.liveReload.enabled
    optimize:  config.isOptimize ? false
    cachebust: if process.env.NODE_ENV isnt "production" then "?b=#{(new Date()).getTime()}" else ''

  app.get '/', (req, res) ->
    res.render 'index', options
  app.get '/partials/:name', (req, res) ->
    res.render "partials/#{req.params.name}", options

  # Redirect api requests (*all* HTTP verbs) to the Cloud
  apiProxy = new httpProxy.RoutingProxy
  app.all '/api/*', (req, res) ->
    console.log req.originalUrl
    req.url = req.url.replace "/api", ''
    apiProxy.proxyRequest req, res,
      host: 'localhost'
      port: 3333

  callback server
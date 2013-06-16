define ['services/services', 'vendor/angularResource'], (services) ->

	services.factory 'topic', ['$resource', ($resource) ->

    resource = $resource('/api/topics/:topicId')

    topicId = undefined

    get: (params, cb) ->
      topicId = params.topicId
      resource.get params, cb

    topicId: ->
      topicId

	]
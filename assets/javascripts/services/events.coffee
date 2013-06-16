define ['services/services', 'vendor/angularResource'], (services) ->

  services.factory 'events', ['$resource', ($resource) ->
    events = ->
      $resource('/api/events').query()

    {events}
  ]
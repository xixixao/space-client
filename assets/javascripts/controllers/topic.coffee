define ['c/controllers', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->
      console.log "inside topic"
  ]

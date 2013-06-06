define ['c/controllers', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'news', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->
      console.log "wtf"

  ]

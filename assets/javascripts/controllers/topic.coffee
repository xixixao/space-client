define ['c/controllers', 'vendor/fuse', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->
      true
  ]

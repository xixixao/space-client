define ['c/controllers', 'vendor/fuse', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'news', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->

  ]

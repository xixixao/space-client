define ['c/controllers', 'vendor/fuse', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'user', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->
      $scope.user = user = service.user()
      console.log "hello from user"
  ]

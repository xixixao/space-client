define ['c/controllers', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'user', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->
      $scope.user = user = service.user()
  ]

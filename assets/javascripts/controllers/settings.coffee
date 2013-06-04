###global define###

define ['c/controllers', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'settings', ['$scope', 'user', ($scope, service) ->
     $scope.user = service.user()
  ]

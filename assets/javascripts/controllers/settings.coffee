###global define###

define ['c/controllers', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'settings', ['$scope', 'user', ($scope, service) ->
     $scope.username = service.username()
     $scope.name = service.name()
     $scope.password = service.password()
     $scope.email = service.email()
     $scope.facebook = service.facebook()
  ]

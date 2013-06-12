define ['c/controllers', 'services/user'], (controllers) ->
  'use strict'

  controllers.controller 'login', [
    '$scope'
    '$http'
    '$location'
    'user'
    ($scope, $http, $location, service) ->

      $scope.error = ''
      $scope.values = {}

      $scope.login = ->
        service.login(_id: $scope.values.username, password: $scope.values.password)
        .success (data) ->
          $location.path '/'
        .error (error) ->
          $scope.error = error
  ]
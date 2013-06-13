define ['c/controllers', 'services/user'], (controllers) ->
  'use strict'

  controllers.controller 'login', [
    '$scope'
    '$http'
    '$location'
    '$rootScope'
    'user'
    ($scope, $http, $location, $rootScope, service) ->

      $scope.error = ''
      $scope.values = {}

      $scope.login = ->
        service.login(_id: $scope.values.username, password: $scope.values.password)
        .success (data) ->
          if $rootScope.beforeRedirect?
            $location.path $rootScope.beforeRedirect
          else
            $location.path '/'
        .error (error) ->
          $scope.error = error
  ]
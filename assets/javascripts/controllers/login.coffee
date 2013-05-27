define ['c/controllers', 'services/login'], (controllers) ->
  'use strict'

  controllers.controller 'login', [
    '$scope'
    '$http'
    '$location'
    ($scope, $http, $location) ->

      $scope.error = ''
      $scope.values = {}

      URL = '/api/login'

      $scope.login = ->
        console.log "Loginning in %o", $scope.values
        #$http.post(URL, $scope.values)
        #.success (data) ->
        #  $location.path('/');
        #.error (error) ->
        #  $scope.error = error
        $location.path '/home'
  ]
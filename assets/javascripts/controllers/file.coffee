define ['c/controllers', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'file', [
    '$scope'
    '$routeParams'
    '$http'
    'user', ($scope, $routeParams, $http, service) ->

      file = $routeParams.file
      $http.get('/files/#{file}')
      .success (data) ->
        console.log data
      .error (error) ->
        $scope.error = error
  ]

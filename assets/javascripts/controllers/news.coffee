define ['c/controllers'], (controllers) ->
  'use strict'

  controllers.controller 'news', [
    '$scope', '$stateParams', '$resource'
    ($scope, $stateParams, $resource) ->
      $scope.events = $resource('/api/events').query()
  ]

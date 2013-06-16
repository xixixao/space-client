define ['c/controllers', 'services/events'], (controllers) ->
  'use strict'

  controllers.controller 'sideMenu', [
    '$scope', '$resource', 'events'
    ($scope, $resource, service) ->

      $scope.questions = $resource('/api/questions').query()
  ]

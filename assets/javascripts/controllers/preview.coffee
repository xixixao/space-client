define ['c/controllers'], (controllers) ->
  'use strict'

  controllers.controller 'preview', [
    '$scope'
    ($scope) ->
      $scope.question =
        url: 'topics/222/files/intro'
  ]

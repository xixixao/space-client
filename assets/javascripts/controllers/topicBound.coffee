define ['c/controllers', 'services/topic'], (controllers) ->
  'use strict'

  controllers.controller 'topicBound', [
    '$scope'
    'topic'
    ($scope, service) ->

      $scope.current = service

      $scope.questionInTopic = (event) ->
        event.type == 'question' and event.topicId = $scope.current._id
  ]

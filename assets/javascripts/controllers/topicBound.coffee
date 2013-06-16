define ['c/controllers', 'services/questions', 'services/topic'], (controllers) ->
  'use strict'

  controllers.controller 'topicBound', [
    '$scope', 'questions', 'topic'
    ($scope, service, current) ->
      $scope.questions = service.query()

      $scope.questionInTopic = (question) ->
        question.topic._id is current.topicId()
  ]

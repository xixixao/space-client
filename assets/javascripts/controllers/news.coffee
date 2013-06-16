define ['c/controllers', 'services/events'], (controllers) ->
  'use strict'

  controllers.controller 'news', [
    '$scope', '$stateParams', '$resource', 'events'
    ($scope, $stateParams, $resource, service) ->
      $scope.events = service.events()
      $scope.trim = (text, limit) ->
        text.substr(0, limit) + if text.length > limit then "..." else ""
      $scope.constructUrl = (url) ->
        string = "topics/#{url.topicId}"
        if url.fileId?
          string += "/files/#{url.fileId}"
          if url.questionId?
            string += "/questions/#{url.questionId}"
            if url.answerId?
              string += "/answers/#{url.answerId}"
            if url.commentId?
              string += "/comments/#{url.commentId}"
        return string
  ]

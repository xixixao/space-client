define ['c/controllers'], (controllers) ->
  'use strict'

  controllers.controller 'news', [
    '$scope', '$stateParams', '$resource'
    ($scope, $stateParams, $resource) ->
      $scope.events = $resource('/api/events').query()
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

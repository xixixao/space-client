define ['c/controllers', 'services/user'], (controllers) ->
  'use strict'

  controllers.controller 'user', [
    '$scope'
    '$location'
    '$rootScope'
    'user'
    ($scope, $location, $rootScope, service) ->

      service.loadUser()
      .success ->
        $scope.user = service.user()
      .error ->
        $rootScope.beforeRedirect = $location.path()
        $location.path '/login'

      $scope.trim = (text, limit) ->
        text.substr(0, limit) + if text.length > limit then "..." else ""

      $scope.constructURL = (url) ->
        console.log url
        string = "topics/#{url.topicId}"
        if url.fileId?
          string += "/files/#{url.fileId}"
          if url.questionId?
            string += "/questions/#{url.questionId}"
            if url.answerId?
              string += "/answers/#{url.answerId}"
            if url.commentId?
              string += "/comments/#{url.commentId}"
        console.log string
        return string
  ]

define ['c/controllers', 'services/user'], (controllers) ->
  'use strict'

  controllers.controller 'user', [
    '$scope'
    '$location'
    '$rootScope'
    'user'
    ($scope, $location, $rootScope, service) ->

      if !service.user()?
        service.loadUser()
        .success ->
          $scope.user = service.user()
        .error ->
          $rootScope.beforeRedirect = $location.path()
          $location.path '/login'
      else
        $scope.user = service.user()

      $scope.trim = (text, limit) ->
        text.substr(0, limit) + if text.length > limit then "..." else ""

      $scope.constructURL = (url) ->
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

      $scope.lookup = (id, array) ->
        return el for el in array when el._id is id
  ]

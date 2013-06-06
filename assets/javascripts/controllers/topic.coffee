define ['c/controllers'], (controllers) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$stateParams'
    ($scope, $stateParams) ->

      topicWithId = (topicId) ->
        for course in $scope.user.courses when course.id is topicId
          course.allFiles = [].concat (files for type, files of course.types)
          return course

      $scope.topic = topicWithId $stateParams.topicId
      $scope.canWrite = $scope.topic.permission == 'w'

      $scope.filesToUpload = []

      $scope.triggerFileBrowse = ->
        fileInput = $('.pretty-file input[type="file"]')
        fileInput.change -> $scope.$apply ->
          files = fileInput[0].files
          for file in files
            file.nameWithoutExt = file.name[0...file.name.lastIndexOf '.']
          $scope.filesToUpload = files

        fileInput.click()
  ]

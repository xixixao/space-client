define ['c/controllers', 'services/topic'], (controllers) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$stateParams'
    'topic'
    ($scope, $stateParams, service) ->


      groupFiles = (topic) ->
        dates = {}
        for {files} in topic.types
          for file in files
            if !dates[file.date]?
              dates[file.date] = date: file.date, files: []
            dates[file.date].files.push file
        return dates

      topicWithId = (topicId) ->
        for course in $scope.user.courses when course.id is topicId
          if !course.allFiles?
            console.log course
            course.allFiles = groupFiles course
          return course

      $scope.topic = service.topic = topicWithId $stateParams.topicId
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

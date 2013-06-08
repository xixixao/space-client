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
        for topic in $scope.user.topics when topic.id is topicId
          if !topic.allFiles?
            topic.allFiles = groupFiles topic
          return topic

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

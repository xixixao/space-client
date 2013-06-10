define ['c/controllers', 'services/topic'], (controllers) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$stateParams'
    'topic'
    ($scope, $stateParams, service) ->

      groupFiles = (topic) ->
        dates = {}
        for id, file of topic.files
          if !dates[file.date]?
            dates[file.date] = date: file.date, files: []
          dates[file.date].files.push file
        return dates

      topicWithId = (topicId) ->
        topic = $scope.user.topics[topicId]
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

      $scope.filter = (files, type) ->
        filtered = {}
        filtered[id] = file for id, file of files when file.type is type
        return filtered
  ]



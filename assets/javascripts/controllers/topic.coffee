define ['c/controllers', 'services/topic'], (controllers) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$stateParams'
    '$resource'
    'topic'
    ($scope, $stateParams, $resource, service) ->

      groupFiles = (topic) ->
        dates = {}
        for file in topic.files
          if !dates[file.date]?
            dates[file.date] = date: file.date, files: []
          dates[file.date].files.push file
        return dates

      $scope.$watch 'topic', (topic) ->
        if topic?
          topic.allFiles = groupFiles topic
      , true

      $scope.topic = $resource('/api/topics/:topicId').get
        topicId: $stateParams.topicId
      $scope.canWrite = $scope.topic.permission == 'w'

      $scope.filesToUpload = []

      $scope.triggerFileBrowse = (type) ->
        fileInput = $(".pretty-file input[type=\"file\"][data-type=\"#{type}\"]")
        console.log fileInput.length, ".pretty-file input[type=\"file\"][data-type=\"#{type}\"]"
        fileInput.change -> $scope.$apply ->
          files = fileInput[0].files
          for file in files
            file.displayName = file.name[0...file.name.lastIndexOf '.']
          $scope.filesToUpload = files

        fileInput.click()

      $scope.filter = (files, type) ->
        filtered = {}
        filtered[id] = file for id, file of files when file.type is type
        return filtered
  ]



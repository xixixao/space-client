define [
  'c/controllers'
  'jquery'
  'templates'
  'services/topic'
], (controllers, $, templates) ->
  'use strict'

  controllers.controller 'topic', [
    '$scope'
    '$stateParams'
    '$resource'
    '$modal'
    'topic'
    ($scope, $stateParams, $resource, $modal, service) ->

      groupFiles = (topic) ->
        dates = {}
        for file in topic.files
          if !dates[file.date]?
            dates[file.date] = date: file.date, files: []
          dates[file.date].files.push file
        return dates

      $scope.topic = service.get
        topicId: $stateParams.topicId
      , (topic) ->
        for file in topic.files
          file.date = new Date file.date
        topic.allFiles = groupFiles topic
        $scope.canWrite = topic.permission == 'w'

      $scope.filesToUpload = []

      $scope.triggerFileBrowse = (type) ->
        fileInput = $(".pretty-file input[type=\"file\"][data-type=\"#{type}\"]")
        fileInput.change -> $scope.$apply ->
          files = fileInput[0].files
          for file in files
            file.displayName = file.name[0...file.name.lastIndexOf '.']
            file.date = new Date
            file.date.setUTCHours 0, 0, 0
          $scope.filesToUpload = files

        fileInput.click()

      $scope.uploadFiles = (type) ->
        File = $resource "/api/topics/:topicId/files/:fileId",
          topicId: $scope.topic._id

        form = $("form[data-type=\"#{type}\"]")[0]
        data = new FormData form
        $.ajax
          data: data
          type: 'POST'
          url: "/api/topics/#{$scope.topic._id}/upload"
          processData: false
          contentType: false
          mimeType: 'multipart/form-data'
        .then (names) -> $scope.$apply ->
          names = JSON.parse names
          for {tmpName}, i in names
            metadata = $scope.filesToUpload[i]
            newFile = new File
              _id: metadata.displayName.toLowerCase().replace().replace(/\W+/g, '-')
              name: metadata.displayName
              fileName: metadata.name
              owner: $scope.user._id
              date: metadata.date
              tmpName: tmpName
              type: type
            newFile.$save()
            $scope.topic.files.push newFile
          $scope.filesToUpload = [] # hide ui


        #xhr = new XMLHttpRequest()
        #xhr.addEventListener("load", (e) ->
        #  console.log e
        #  #newFile = new File
        #  #newFile.$save()
        #, false)
        #xhr.open("POST", "/api/topics/#{$scope.topic._id}/upload")
        #xhr.send(data)

      $scope.confirm = (message, cb) ->
        scope = $scope.$new true
        scope.message = message
        #scope.$watch 'result', (value) ->
        #  if value?
        #    cb()
        modal = $modal
          template: templates.confirm
          show: true
          backdrop: 'static'
          scope: scope



      #$scope.cancelUpload = (index) ->
      #  $scope.filesToUpload.splice index, 1

      $scope.numOfType = (files, type) ->
        sum = 0
        sum++ for id of $scope.filter(files, type)
        return sum

  ]



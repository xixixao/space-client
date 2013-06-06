define ['c/controllers', 'jquery', 'vendor/fuse', 'services/fakeuser'], (controllers, $) ->
  'use strict'

  controllers.controller 'courses', [
    '$scope'
    '$location'
    'user'
    ($scope, $location, service) ->
      $scope.user = user = service.user()
      allFiles = new Fuse user.files, keys: ['name']

      $scope.setTopic = (course) ->
        $scope.topic = course
        $scope.canWrite = course.permission == 'w'

      $scope.setTopic user.courses[0]

      $scope.$watch 'query', (query = "") ->
        deactivate()
        $scope.files = allFiles.search query
        if $scope.files.length > 0
          $scope.activate 0
        else
          $scope.lastActive = undefined

      $scope.scroll = (event) ->
        KEYUP   = 38
        KEYDOWN = 40
        ENTER = 13
        numFiles = $scope.files.length
        switch event.keyCode
          when KEYUP   then $scope.activate ($scope.lastActive - 1 + numFiles) % numFiles
          when KEYDOWN then $scope.activate ($scope.lastActive + 1) % numFiles
          when ENTER then $scope.open $scope.lastActive

      $scope.activate = (index) ->
        if $scope.lastActive?
          $scope.files[$scope.lastActive].active = ""
        $scope.lastActive = index
        $scope.files[index].active = "current-active"

      $scope.open = (index) ->
        file = $scope.files[index]
        #course = file.course
        #$location.path "/#{course.code}/#{file.filename}"
        $location.path "/file/222-MDK"

      deactivate = ->
        if $scope.lastActive?
          $scope.files[$scope.lastActive].active = ""


      $scope.clickFile = ->
        fileInput = $('.pretty-file input[type="file"]')
        fileInput.change ->
          files = fileInput[0].files
          if files.length > 1 
            info = files.length + ' files selected'
          else 
            path = fileInput.val().split('\\')
            info = path[path.length - 1]
          $scope.fileInfo = info
          $('.pretty-file .input-append input').val info
        
        fileInput.click()
        
  ]

define [
  'd/directives'
  'templates'
  'vendor/fuse'
], (directives, templates) ->
  'use strict'

  directives.directive 'searchBar', [->
    controller = ['$scope', '$element', '$location', ($scope, $element, $location) ->
      if !$scope.allFiles?
        throw new Error "Missing attribute all-files"

      fusedFiles = new Fuse $scope.allFiles, keys: ['name']

      $scope.$watch 'query', (query = "") ->
        deactivate()
        $scope.files = fusedFiles.search query
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
        $location.path "/topics/222/files/MDK"

      deactivate = ->
        if $scope.lastActive?
          $scope.files[$scope.lastActive].active = ""
    ]

    controller: controller
    link: ($scope, $element) ->
      true

    replace: true
    restrict: 'E'
    scope: {
      allFiles: '='
    }
    template: templates.searchBar
    transclude: true
  ]
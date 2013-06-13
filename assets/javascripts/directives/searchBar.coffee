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

      labelKey = 'name'
      fusedFiles = new Fuse $scope.allFiles, keys: [labelKey]

      mappedFiles = {}
      for file in $scope.allFiles
        mappedFiles[file[labelKey]] = file

      $scope.matchQuery = (query) ->
        return (name for {name} in fusedFiles.search(query))

      $scope.selected = ->
        #$location.path "/topics/222/files/#{mappedFiles[$scope.query]}"
        $scope.$apply ->
          $location.path "/topics/222/files/intro"
    ]

    controller: controller
    link: ($scope, $element) ->
      $scope.$on 'typeahead-updated', ->
        $scope.selected()

    replace: true
    restrict: 'E'
    scope: {
      allFiles: '='
    }
    template: templates.searchBar
    transclude: true
  ]
define [
  'd/directives'
  'templates'
  'vendor/fuse'
], (directives, templates) ->
  'use strict'

  directives.directive 'searchBar', [->
    controller = ['$scope', '$element', '$location', ($scope, $element, $location) ->

      fusedFiles = []
      mappedFiles = {}

      $scope.$watch 'allFiles', (allFiles) ->
        if allFiles?
          labelKey = 'name'
          fusedFiles = new Fuse allFiles, keys: [labelKey]

          for file in allFiles
            mappedFiles[file[labelKey]] = file

      $scope.matchQuery = (query) ->
        return (name for {name} in fusedFiles.search(query))

      $scope.selected = ->
        $scope.$apply ->
          $location.path "/topics/222/files/#{mappedFiles[$scope.query]._id}"
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
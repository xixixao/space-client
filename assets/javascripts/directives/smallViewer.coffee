###global define###

define [
  'ang'
  'd/directives'
  'viewer'
  'templates'
  'jquery'
], (angular, directives, PDFViewer, templates, $) ->
  'use strict'

  directives.directive 'smallViewer', [->
    controller = ['$scope', '$element', '$location', ($scope, $element, $location) ->
      $scope.action = ->
        console.log $scope.goto
        $location.path $scope.goto
    ]

    controller: controller
    link: ($scope, $element) ->
      PDFViewer.loadFile 'files/lecture9.pdf', 'pdf-small-'

    replace: true
    restrict: 'E'
    scope: {
      goto: '@'
    }
    template: templates.smallViewer
    transclude: true
  ]
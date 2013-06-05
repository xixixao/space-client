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
    controller = ['$scope', '$element', '$rootScope', ($scope, $element, $rootScope) ->
      $scope.tabs = []
      #

      #     $scope.select = (tab) ->
      #       return if tab.selected is true
      #
      #       angular.forEach $scope.tabs, (tab) ->
      #         tab.selected = false
      #
      #       tab.selected = true
      #
      #     @addTab = (tab, tabId) ->
      #       $scope.select tab if $scope.tabs.length is 0
      #
      #       $scope.tabs.push tab
      #
      #       if tabId
      #         $rootScope.$on "changeTab##{tabId}", ->
      #           $scope.select tab
    ]

    controller: controller
    link: ($scope, $element) ->
      PDFViewer.loadFile 'files/ch5.pdf', 'pdf-small-'

    replace: true
    restrict: 'E'
    scope: {}
    template: templates.smallViewer
    transclude: true
  ]
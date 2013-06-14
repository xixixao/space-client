define [
  'd/directives'
  'templates'
  'jquery'
], (directives, templates, $) ->

  directives.directive 'collapsable', [->
    controller = [
      '$scope', '$element'
      ($scope, $element) ->
        #$scope.stuff
    ]

    controller: controller
    link: ($scope, $element) ->
      

    replace: true
    restrict: 'E'
    scope: {
    }
    template: templates.collapsable
    transclude: true
  ]
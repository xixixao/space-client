# THIS DOESNT WORK, BUT IS A USEFUL TEMPLATE FOR ACTION DIRECTIVES

define [
  'ang'
  'd/directives'
  'viewer'
  'templates'
  'jquery'
], (angular, directives, PDFViewer, templates, $) ->

  directives.directive 'resize', [
    '$parse'
    ($parse) ->
      link: ($scope, $element, $attributes) ->
        fn = $parse $attributes.resize
        console.log $element
        $element.resize (event) ->
          console.log "RESIZED"
          scope.$apply ->
            fn $scope, {$event:event}
      restrict: 'A'
  ]
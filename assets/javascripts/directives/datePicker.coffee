define [
  'd/directives'
  'templates'
  'vendor/dp'
], (directives, templates) ->
  'use strict'

  directives.directive 'datePicker', [->
  
    link: ($scope, $element) ->
      window.jQuery($element).datepicker
        pickTime: false

    replace: true
    restrict: 'E'
    scope: {}
    template: templates.datePicker
    transclude: true
  ]
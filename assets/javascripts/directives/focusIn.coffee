define (require) ->
  'use strict'

  directives = require('d/directives')

  directives.directive 'focusIn', [
    ->
      link: ($scope, element) ->
        element[0].focus()
  ]
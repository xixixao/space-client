define (require) ->
  'use strict'

  directives = require('d/directives')

  directives.directive 'draggable', [
    '$document'
    ($document) ->
      ($scope, $element, $attributes) ->

        # Prevent default dragging of selected content
        mousemove = (event) ->
          y = event.screenY - startY
          x = event.screenX - startX
          element.css
            top: y + "px"
            left: x + "px"

        mouseup = ->
          $document.unbind "mousemove", mousemove
          $document.unbind "mouseup", mouseup

        startX = 0
        startY = 0

        x = 0
        y = 0

        element.css
          position: "relative"
          cursor: "pointer"

        element.bind "mousedown", (event) ->
          event.preventDefault()
          startX = event.screenX - x
          startY = event.screenY - y
          $document.bind "mousemove", mousemove
          $document.bind "mouseup", mouseup

  ]
define [
  'd/directives'
  'utils/vector'
  'utils/rectangle'
], (directives, V, Rectangle) ->

  directives.directive 'outside', [
    '$window'
    ($window) ->
      link: ($scope, $element) ->

        boundingBox = ->
          new Rectangle new V(0, 0), new V($element.width(), $element.height())

        $scope.$watch 'outside', (rect) ->
          if rect?
            box = boundingBox()
            $element.offset rect.center()
            .addV(new V(0, rect.size().y / 2 + box.size().y / 2))
            .subV(box.size().divS(2)).offset()
            $element.show()
          else
            $element.hide()

        $element.hide()

      scope:
        outside: '='
  ]
define [
  'd/directives'
  'utils/vector'
  'utils/rectangle'
], (directives, V, Rectangle) ->

  directives.directive 'outside', [
    ->
      link: ($scope, $element, $attributes) ->

        margin = $attributes.margin ? 20

        boundingBox = ->
          new Rectangle new V(0, 0), new V($element.width(), $element.height())

        $scope.$watch $attributes.outside, (rect) ->
          if rect?
            box = boundingBox()
            $element.show()
            $element.offset rect.center()
            .addV(new V(0, margin + rect.size().y / 2 + box.size().y / 2))
            .subV(box.size().divS(2)).offset()
          else
            $element.hide()

        $element.hide()
  ]
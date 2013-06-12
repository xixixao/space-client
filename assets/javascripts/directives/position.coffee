define [
  'd/directives'
  'utils/vector'
  'utils/rectangle'
], (directives, V, Rectangle) ->

  directives.directive 'position', [
    ->
      link: ($scope, $element, $attributes) ->

        $element.hide()

        $scope.$watch $attributes.position, (at) ->
          if at?
            $scope.questionPosition(at).then ([questionPos]) ->
              $element.show()
              #$element.offset top: 0, left: 0
              $element.offset questionPos.br.offset()
          else
            $element.hide()
  ]
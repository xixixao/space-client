define [
  'd/directives'
  'templates'
], (directives, templates) ->

  directives.directive 'highlighter', [
    ->
      link: ($scope, $element) ->

        position = (el, [x1, y1], [x2, y2]) ->
          if y1 > y2
            tmp = y2
            y2 = y1
            y1 = tmp
          if x1 > x2
            tmp = x2
            x2 = x1
            x1 = tmp
          el.offset
            left: x1
            top: y1
          el.width x2 - x1
          el.height y2 - y1

        listener = (value) ->
          if $scope.visible = $scope.from? and $scope.to?
            position $element, $scope.from, $scope.to

        $scope.$watch 'from', listener
        $scope.$watch 'to', listener

      scope:
        from: '='
        to: '='
      restrict: 'E'
      transclude: true
      replace: true
      template: templates.highlighter
  ]
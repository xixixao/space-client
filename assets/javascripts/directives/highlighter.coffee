define [
  'd/directives'
  'templates'
  'utils/rectangle'
], (directives, templates, Rectangle) ->

  directives.directive 'highlighter', [
    ->
      link: ($scope, $element) ->

        position = (el, from, to) ->
          rect = new Rectangle from, to
          size = rect.size()
          el.offset rect.offset()
          el.width size.x
          el.height size.y

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
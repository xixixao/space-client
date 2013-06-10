define [
  'd/directives'
  'templates'
  'utils/rectangle'
], (directives, templates, Rectangle) ->

  directives.directive 'highlighter', [
    ->
      link: ($scope, $element) ->

        position = (el, from, to) ->
          console.log from, to
          rect = new Rectangle from, to
          #rect.@tl.x += (if rect.@tl.x % 2 == 0 then 0 else 1)
          size = rect.size()
          el.width size.x# + (if size.x % 2 == 0 then 0 else 1)
          el.height size.y
          el.offset rect.offset()

        listener = (value) ->
          if $scope.visible = $scope.from? and $scope.to?
            $element.css display: 'block' # needs to be set for offset to work correctly
            position $element, $scope.from, $scope.to

        $scope.$watch '[from, to]', listener, true

      scope:
        from: '='
        to: '='
      restrict: 'E'
      transclude: true
      replace: true
      template: templates.highlighter
  ]
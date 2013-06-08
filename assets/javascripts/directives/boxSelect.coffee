define [
  'd/directives'
  'templates'
  'utils/vector'
  'utils/rectangle'
], (directives, templates, V, Rectangle) ->

  directives.directive 'boxSelect', [
    ->
      link: ($scope, $element) ->

        $scope.down = (event) ->
          if event.ctrlKey
            event.preventDefault()
            $scope.open = true
            $scope.from = new V(event.pageX, event.pageY)

        $scope.move = (event) ->
          if $scope.open
            event.preventDefault()
            $scope.to = new V(event.pageX, event.pageY)

        $scope.up = (event) ->
          if $scope.open
            event.preventDefault()
            $scope.boxSelect $rect: new Rectangle $scope.from, $scope.to
            $scope.open = false

        reset = ->
          $scope.from = $scope.to = null

        reset()

      scope:
        boxSelect: '&'
      template: templates.boxSelect
      replace: true
      transclude: true
  ]
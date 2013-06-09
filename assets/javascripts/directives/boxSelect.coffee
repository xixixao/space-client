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
            $scope.to = null

        $scope.move = (event) ->
          if $scope.open
            event.preventDefault()
            $scope.to = new V(event.pageX, event.pageY)

        $scope.up = (event) ->
          if $scope.open
            event.preventDefault()
            $scope.boxSelect = new Rectangle $scope.from, $scope.to
            $scope.open = false

        $scope.$watch 'boxSelect', (value) ->
          console.log value
          if !value?
            reset()

        reset = ->
          $scope.from = $scope.to = null
          $scope.open = false

        reset()

      scope:
        boxSelect: '='
      template: templates.boxSelect
      replace: true
      transclude: true
  ]
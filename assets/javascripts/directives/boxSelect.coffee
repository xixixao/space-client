define [
  'd/directives'
  'templates'
  'utils/vector'
  'utils/rectangle'
  'jquery'
], (directives, templates, V, Rectangle, $) ->

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
            $scope.open = false
            $scope.boxSelect = new Rectangle $scope.from, $scope.to
            $scope.selected $selection: $scope.boxSelect

        $scope.deselect = (event) ->
          if !event.ctrlKey and $('#pdf-viewer').has(event.target).length
            reset()
            $scope.boxSelect = null

        $scope.$watch 'boxSelect', (value) ->
          if !value?
            reset()
          else
            console.log value
            $scope.from = value.tl
            $scope.to = value.br

        reset = ->
          $scope.from = $scope.to = null
          $scope.open = false

        reset()

      scope:
        boxSelect: '='
        selected: '&selected'
      template: templates.boxSelect
      replace: true
      transclude: true
  ]
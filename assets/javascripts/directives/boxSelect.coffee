define [
  'd/directives'
  'templates'
], (directives, templates) ->

  directives.directive 'boxSelect', [
    ->
      link: ($scope, $element) ->

        $scope.down = (event) ->
          if event.ctrlKey
            $scope.open = true
            $scope.from = [event.pageX, event.pageY]

        $scope.move = (event) ->
          if $scope.open
            $scope.to = [event.pageX, event.pageY]

        $scope.up = (event) ->
          if $scope.open
            $scope.boxSelect $from: $scope.from, $to: $scope.to
            reset()

        reset = ->
          $scope.from = $scope.to = null
          $scope.open = false

        reset()

      scope:
        boxSelect: '&'
      template: templates.boxSelect
      replace: true
      transclude: true
  ]
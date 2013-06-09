define [
  'd/directives'
  'templates'
], (directives, templates) ->
  directives.directive 'discussionBoard', [->
    controller: [
      '$scope', '$element', '$location'
      ($scope, $element, $location) ->
        console.log $scope.question
    ]
    link: ($scope, $element) ->
      true
    scope: {
      question: '='
    }
    template: templates.discussionBoard
    transclude: true
    replace: true
    restrict: 'E'
  ]
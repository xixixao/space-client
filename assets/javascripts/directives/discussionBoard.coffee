define [
  'd/directives'
  'templates'
  'services/question'
], (directives, templates) ->
  directives.directive 'discussionBoard', [->
    controller: [
      '$scope', '$element', '$location', 'question'
      ($scope, $element, $location, service) ->
        $scope.getQuestion = service.get
    ]
    link: ($scope, $element) ->
      true
    scope:
      question: '='
      questions: '='
    template: templates.discussionBoard
    transclude: true
    replace: true
    restrict: 'E'
  ]
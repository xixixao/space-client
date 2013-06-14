define [
  'd/directives'
  'templates'
  'services/question'
], (directives, templates) ->
  directives.directive 'discussionBoard', [->
    link: ($scope, $element) ->
      true
    scope:
      question: '='
      questions: '='
      setQuestion: '&'
    template: templates.discussionBoard
    transclude: true
    replace: true
    restrict: 'E'
  ]
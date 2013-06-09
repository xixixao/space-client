define ['services/services'], (services) ->
  services.factory 'question', [
    '$http'
    ($http) ->
      class QuestionService
        @newQuestion = (text, user) ->
          text: text
          user: user
          answers: []
          comments: []
  ]
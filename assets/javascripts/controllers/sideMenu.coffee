define ['c/controllers', 'services/questions'], (controllers) ->

  controllers.controller 'sideMenu', [
    '$scope', 'questions'
    ($scope, service) ->

      $scope.questions = service.query()
  ]

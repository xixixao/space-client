define ['c/controllers', 'services/courses'], (controllers) ->
  'use strict'

  controllers.controller 'courses', ['$scope', 'courses', ($scope, service) ->
    $scope.name = ''
    $scope.courses = service.courses

    #service.get()
  ]
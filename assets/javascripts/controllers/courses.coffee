define ['c/controllers', 'vendor/fuse', 'services/fakeuser'], (controllers) ->
  'use strict'

  controllers.controller 'courses', ['$scope', 'user', ($scope, service) ->
    $scope.courses = service.courses()
    allFiles = new Fuse service.files(), keys: ['name']

    $scope.$watch 'query', (query = "") ->
      $scope.files = allFiles.search query
  ]

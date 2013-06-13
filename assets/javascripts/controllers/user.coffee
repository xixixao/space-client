define ['c/controllers', 'services/user'], (controllers) ->
  'use strict'

  controllers.controller 'user', [
    '$scope'
    '$location'
    '$rootScope'
    'user'
    ($scope, $location, $rootScope, service) ->

      $scope.user = user = service.user()
      if !user?
        $rootScope.beforeRedirect = $location.path()
        $location.path '/login'
  ]

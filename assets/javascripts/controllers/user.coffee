define ['c/controllers', 'services/user'], (controllers) ->
  'use strict'

  controllers.controller 'user', [
    '$scope'
    '$location'
    '$rootScope'
    'user'
    ($scope, $location, $rootScope, service) ->

      service.loadUser()
      .success ->
        $scope.user = service.user()
      .error ->
        $rootScope.beforeRedirect = $location.path()
        $location.path '/login'
  ]

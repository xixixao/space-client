###global define###

define ['c/controllers'], (controllers) ->
  'use strict'

  controllers.controller 'settings', [
    '$scope', '$resource'
    ($scope, $resource) ->

      User = $resource '/api/users/:username',
        username: $scope.user._id

      $scope.updateUser = ->
        user = new User
          name: $scope.user.name
          password: $scope.user.password
          facebook: $scope.user.facebook
          email: $scope.user.email
        user.$save()

      $scope.updateUserPassword = ->
        console.log $scope.oldPassword, $scope.newPassword, $scope.newPassword2
        if $scope.oldPassword != $scope.user.password
          return #fail

        if $scope.newPassword != $scope.newPassword2
          return #fail

        $scope.user.password = $scope.newPassword
        $scope.updateUser()




  ]

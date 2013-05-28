###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
  'use strict'

  services.factory 'user', ['$http', ($http) ->

    URL = '/api/login'
    user = {}
    auth = {}

    login = (values) ->
      handle = $http.post(URL, values)
      handle.success (data) ->
        {auth, user} = data

    courses = -> user.courses

    {login, courses}
  ]
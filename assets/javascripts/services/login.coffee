###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
  'use strict'

  services.factory 'login', ['$http', ($http) ->
    login = result: []
    person = result: {}

    activity = $resource './login', {},
      get:
        method: 'GET'
        isArray: true
      post:
        method: 'POST'

    personActivity = $resource './login/details/:id', {},
      get:
        method: 'GET'
        isArray: false

    get = (success, failure) ->
      login.result = activity.get ->
        success.apply(this, arguments) if angular.isFunction success
      , ->
        failure.apply(this, arguments) if angular.isFunction failure

    post = (name = "Somebody else", success, failure) ->
      activity.post "name": name
      , (person) ->
        login.result.push person

        success.apply(this, arguments) if angular.isFunction success
      , failure

    URL = '/api/login'

    login = (values) ->
      $http.post(URL, values)

    login: login
    user: user
  ]
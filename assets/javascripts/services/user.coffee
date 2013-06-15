###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
  'use strict'

  services.factory 'user', ['$http', '$resource', ($http, $resource) ->

    URL = '/api/login'
    userData = null

    preprocessUserData = (data) ->
      userData = data
      userData.flattened = {}
      userData.flattened.files = []
      for topicId, topic of userData.topics
        for fileId, file of topic.files
          file
          file.id = fileId # id == _id
          file.date = new Date file.date
          userData.flattened.files.push file

    login = (values) ->
      $http.post(URL, values)
      .success (data) ->
        preprocessUserData data

    loadUser = ->
      $http.get('/api/data')
      .success (data) ->
        preprocessUserData data

    user = ->
      userData

    {login, user, loadUser}
  ]
###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
  'use strict'

  services.factory 'user', ['$http', ($http) ->

    URL = '/api/login'
    userData = {}
    auth = {}

    login = (values) ->
      handle = $http.post(URL, values)
      handle.success (data) ->
        userData = data
        userData.flattened = {}
        userData.flattened.files = []
        for topicId, topic of userData.topics
          for fileId, file of topic.files
            file
            file.id = fileId # id == _id
            file.date = new Date file.date
            userData.flattened.files.push file
        console.log userData

    user = ->
      console.log "Getting user"
      console.log userData
      userData

    {login, user}
  ]
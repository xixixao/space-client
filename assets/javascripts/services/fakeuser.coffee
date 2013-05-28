###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
  'use strict'

  services.factory 'user', ['$http', ($http) ->

    URL = '/api/login'
    user = {}
    auth = {}

    data =
      user:
        username: "ms6611"
        courses: [
          name: "Bla asdjoghue"
        ,
          name: "Dassdaas aoije"
        ]
        files: [
          name: "Introduction and Methods"
          uri: ""
        ,
          name: "Uninformed Search"
          uri: ""
        ,
          name: "Informed Search"
          uri: ""
        ,
          name: "Adversarial Search"
          uri: ""
        ,
          name: "Planning and Logic"
          uri: ""
        ,
          name: "Planning Algorithms"
          uri: ""
        ,
          name: "KRR"
          uri: ""
        ,
          name: "SemanticWeb"
          uri: ""
        ,
          name: "NMR"
          uri: ""
        ,
          name: "IntroLearning"
          uri: ""
        ,
          name: "ReinfLearning"
          uri: ""
        ,
          name: "AbdArg"
          uri: ""
        ]
      auth:
        username: "ms6611"
        key: "982739287362835"
    {auth, user} = data

    login = (values) ->
      handle =
        success: (cb) ->
          cb data
          handle
        error: (cb) ->
          handle
      handle

    courses = -> user.courses
    files = -> user.files

    {login, courses, files}
  ]
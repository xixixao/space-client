###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
  'use strict'

  services.factory 'user', ['$http', ($http) ->

    URL = '/api/login'
    user = {}
    auth = {}

    data =
      userData:
        username: "ms6611"
        name: "Michal Srb"
        password: "12345678"
        email: "ms6611@ic.ac.uk"
        facebook: "michal@facebook.com"
        courses: [
          name: "AI"
          permission: "w"
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
          tutorials: [
            name: "Tutorial 1"
            uri: ""
          ,
            name: "Tutorial 2"
            uri: ""
          ,
            name: "Tutorial 3"
            uri: ""
          ,
            name: "Tutorial 4"
            uri: ""
          ,
            name: "Tutorial 5"
            uri: ""
          ]
          solutions: [
            name: "Solution 1"
            uri: ""
          ,
            name: "Solution 2"
            uri: ""
          ,
            name: "Solution 3"
            uri: ""
          ,
            name: "Solution 4"
            uri: ""
          ,
            name: "Solution 5"
            uri: ""
          ]
        ,
          name: "Architecture"
          permission: "r"
          files: [
            name: "Hello ronnie"
            uri: ""
          ,
            name: "Blabla"
            uri: ""
          ]

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
    {auth, userData} = data

    login = (values) ->
      handle =
        success: (cb) ->
          cb data
          handle
        error: (cb) ->
          handle
      handle

    user = ->
      console.log userData
      userData

    {login, user}
  ]
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
<<<<<<< HEAD
        courses: [
          name: "AI"
          permission: "w"
          id: "222"
          files: [
            name: "Introduction and Methods"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "Uninformed Search"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "Informed Search"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "Adversarial Search"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "Planning and Logic"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "Planning Algorithms"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "KRR"
            uri: ""
            date: new Date('12/23/2014')
          ,
            name: "SemanticWeb"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "NMR"
            uri: ""
            date: new Date('12/23/2011')
          ,
            name: "IntroLearning"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "ReinfLearning"
            uri: ""
            date: new Date('12/23/2013')
          ,
            name: "AbdArg"
            uri: ""
            date: new Date('12/23/2013')
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
=======
        events: [
          timestamp: new Date()
          url: 'topics/222/files/introduction-and-methods/questions/1'
>>>>>>> d228f957c17f093ff3263739096a006712e5b90f
        ,
          timestamp: new Date()
          url: 'topics/222/files/introduction-and-methods'
        ]
        topics:
          "222":
            name: "AI"
            permission: "w"
            types: [
              'Notes'
              'Tutorials'
              'Solutions'
            ]
            files:
              'introduction-and-methods':
                name: "Introduction and Methods"
                uri: ""
                date: "1/12/12"
                type: 'Notes'
                questions:
                  '1':
                    author: "Anonymous"
                    text: "I am not sure what this means."
                    position:
                      x: 220
                      y: 100
                    area: [
                        x: 230
                        y: 120
                        w: 500
                        h: 300
                    ]
                    timestamp: new Date()
              'uninformed-search':
                name: "Uninformed Search"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'informed-search':
                name: "Informed Search"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'adversarial-search':
                name: "Adversarial Search"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'planning-and logic':
                name: "Planning and Logic"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'planning-algorithms':
                name: "Planning Algorithms"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'krr':
                name: "KRR"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'semanticweb':
                name: "SemanticWeb"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'nmr':
                name: "NMR"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'introlearning':
                name: "IntroLearning"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'reinflearning':
                name: "ReinfLearning"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'abdarg':
                name: "AbdArg"
                uri: ""
                date: "12/12/12"
                type: 'Notes'
              'tutorial-1':
                name: "Tutorial 1"
                uri: ""
                type: 'Tutorials'
              'tutorial-2':
                name: "Tutorial 2"
                uri: ""
                type: 'Tutorials'
              'tutorial-3':
                name: "Tutorial 3"
                uri: ""
                type: 'Tutorials'
              'tutorial-4':
                name: "Tutorial 4"
                uri: ""
                type: 'Tutorials'
              'tutorial-5':
                name: "Tutorial 5"
                uri: ""
                type: 'Tutorials'
              'solution-1':
                name: "Solution 1"
                uri: ""
                type: 'Solutions'
              'solution-2':
                name: "Solution 2"
                uri: ""
                type: 'Solutions'
              'solution-3':
                name: "Solution 3"
                uri: ""
                type: 'Solutions'
              'solution-4':
                name: "Solution 4"
                uri: ""
                type: 'Solutions'
              'solution-5':
                name: "Solution 5"
                uri: ""
                type: 'Solutions'
          "223":
            name: "Architecture"
            permission: "r"
            types: [
              'Cool notes'
            ]
            files:
              'hello-ronnie':
                name: "Hello ronnie"
                uri: ""
                date: "12/12/12"
                type: 'Cool notes'
              'blabla':
                name: "Blabla"
                uri: ""
                date: "12/12/12"
                type: 'Cool notes'
      auth:
        username: "ms6611"
        key: "982739287362835"
    {auth, userData} = data

    userData.flattened = {}
    userData.flattened.files = []
    for topicId, topic of userData.topics
      for fileId, file of topic.files
        file
        file.id = fileId
        userData.flattened.files.push file

    # This provides a fake promise, faking service $http.get
    login = (values) ->
      handle =
        success: (cb) ->
          cb data
          handle
        error: (cb) ->
          handle
      handle

    user = ->
      console.log userData.username + "loaded"
      userData

    {login, user}
  ]
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
        events: [
          timestamp: new Date()
          url: 'topics/222/files/intro/questions/1'
        ,
          timestamp: new Date()
          url: 'topics/222/files/intro/questions/1/answers/2'
          text: "I think it's because the fragment identifier is 4 bytes long. If you look on slide 40, the data size is 1000 bytes and the header size is 20 bytes, and the 'total size' column says 1020. For slide 41, it looks like the data is 488 bytes, the header is 20 bytes (giving 508 in the total size column), plus the 4-byte fragment identifier which gives the MTU of 512."
          topic: 'Networks and Communications'
          file: 'Network Layer'
          owner:
            name: 'Alex Rozanski'
        ,
          timestamp: new Date()
          url: 'topics/222/files/intro'
        ,
          timestamp: new Date()
          url: 'topics/222/files/uninformed-search'
        ]
        topics:
          "222":
            name: "Artificial Intelligence"
            permission: "w"
            types: [
              'Notes'
              'Tutorials'
              'Solutions'
            ]
            files:
              'intro':
                name: "Network Layer"
                uri: ""
                date: "Jun 12, 2013"
                type: 'Notes'
                owner:
                  name: "Peter Pietzuch"
                questions:
                  '1':
                    owner:
                      name: "Varun Verma"
                      username: "an2211"
                    text: "Why to use packet size of 508 rather than 512 which is the MTU? like even if we use 512 then we still 3 packets but I am not sure why he chose 508 for the size. Cheers"
                    uri: "topics/222/files/intro/questions/1"
                    timestamp: new Date()
                  '2':
                    owner:
                      name: "Anonymous"
                    text: "How come?"
                    uri: "topics/222/files/intro/questions/2"
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
            id: "223"
            name: "Architecture"
            permission: "r"
            types: [
              'Cool notes'
            ]
          "224":
            id: "224"
            name: "Models of Computation"
            permission: "r"
            types: [
              'Cool notes'
            ]
          "225":
            id: "225"
            name: "Algorithms"
            permission: "r"
            types: [
              'Cool notes'
            ]
          "226":
            id: "226"
            name: "Compilers"
            permission: "r"
            types: [
              'Cool notes'
            ]
          "227":
            id: "227"
            name: "Softwer Engineering Design"
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
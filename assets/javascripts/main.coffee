#using requirejs config + require

requirejs.config
  urlArgs: "bust=" +  (new Date()).getTime()
  map:
    '*':
      'vendor/angularResource': 'vendor/angular-resource'
  paths:
    c:"controllers"
    d:"directives"
    jquery:"vendor/jquery"
    ang:"vendor/angular"
    angui:"vendor/angular-ui-router"
  shim:
    'ang':
      deps: ['vendor/modernizr']
      exports: 'angular'
    'vendor/angular-resource': ['ang']
    'vendor/modernizr':
      exports: 'Modernizr'

requirejs [
  'app'
  'jquery'
  'bootstrap'
  'c/login'
  'c/user'
  'c/topic'
  'c/news'
  'c/questions'
  'c/settings'
  'd/ngController'
  'd/tab'
  'd/tabs'
  'd/smallViewer'
  'd/searchBar'
  'd/datePicker'
  'd/focusIn'
  'filters/twitterfy'
  'ang'
  'angui'
  'responseInterceptors/dispatcher'
], (app, $) ->
  app.config ['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) ->

    # Let's keep the structure of our app here (corresponds to the jade file names)
    # - login             > Where user logs in
    # - user (no url)
    #   |- questions      > Display full pdf with questions
    #   |- settings       > User credentials
    #   |- split (no url)
    #      |- home        > News and choose a topic
    #         +(homeSideMenu, news)
    #      |- topic       > See all files for given topic
    #         +(topicSideMenu, files)

    $stateProvider
    .state 'login',
      url: "/login"
      controller: 'login'
      templateUrl: 'partials/login'

    .state 'user',
      abstract: true
      controller: 'user'
      templateUrl: 'partials/user'

    .state 'user.questions',
      url: "/topics/:topicId/files/:fileId"
      controller: 'questions'
      templateUrl: 'partials/questions'
    .state 'user.settings',
      url: "/settings"
      controller: 'settings'
      templateUrl: 'partials/settings'

    .state 'user.split',
      abstract: true
      templateUrl: 'partials/split'
    .state 'user.split.home',
      url: "/"
      views:
        'sideMenu':
          templateUrl: 'partials/homeSideMenu'
          controller: 'news'
        'mainView':
          templateUrl: 'partials/news'
          controller: 'news'
    .state 'user.split.topic',
      url: "/topics/:topicId"
      views:
        'sideMenu':
          templateUrl: 'partials/topicSideMenu'
          controller: 'topic'
        'mainView':
          templateUrl: 'partials/files'
          controller: 'topic'
    $urlRouterProvider.otherwise '/login'
  ]


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
  'c/questions'
  'c/settings'
  'd/ngController'
  'd/tab'
  'd/tabs'
  'd/smallViewer'
  'd/searchBar'
  'd/focusIn'
  'filters/twitterfy'
  'ang'
  'angui'
  'responseInterceptors/dispatcher'
], (app, $) ->
  #app.config ['$routeProvider', ($routeProvider) ->
  #  $routeProvider
  #    .when '/login',
  #      controller: 'login'
  #      templateUrl: 'partials/login'
  #    .when '/home',
  #      controller: 'courses'
  #      templateUrl: 'partials/courses'
  #    .when '/file/:file',
  #      controller: 'questions'
  #      templateUrl: 'partials/questions'
  #    .when '/settings',
  #      controller: 'settings'
  #      templateUrl: 'partials/settings'
  #    .otherwise
  #      redirectTo: '/login'
  #]
  app.config ['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) ->
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
      controller: 'news'
      views:
        'sideMenu': 'partials/homeSideMenu'
        'mainView': 'partials/news'
    .state 'user.split.topic',
      url: "/topics/:topicId"
      controller: 'topic'
      views:
        'sideMenu': 'partials/topicSideMenu'
        'mainView': 'partials/files'
    $urlRouterProvider.otherwise '/login'
  ]


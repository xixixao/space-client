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
  'c/courses'
  'c/file'
  'd/ngController'
  'd/tab'
  'd/tabs'
  'd/focusIn'
  'filters/twitterfy'
  'ang'
  'responseInterceptors/dispatcher'
], (app, $) ->
    app.config ['$routeProvider', ($routeProvider) ->
      $routeProvider
        .when '/login',
          controller: 'login'
          templateUrl: 'partials/login'
        .when '/home',
          controller: 'courses'
          templateUrl: 'partials/courses'
        .when '/file/:file',
          controller: 'file'
          templateUrl: 'partials/file'
        .otherwise
          redirectTo: '/login'
    ]







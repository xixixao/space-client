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
  'c/gitHub'
  'c/people'
  'c/personDetails'
  'c/searchHistory'
  'c/twitter'
  'c/phoneList'
  'd/ngController'
  'd/tab'
  'd/tabs'
  'filters/twitterfy'
  'ang'
  'responseInterceptors/dispatcher'
], (app, $) ->
    rp = ($routeProvider) ->
      $routeProvider
        .when '/github/:searchTerm',
          controller: 'gitHub'
          reloadOnSearch: true
          resolve:
            changeTab: ($rootScope) ->
              $rootScope.$broadcast 'changeTab#gitHub'
        .when '/people/details/:id',
          controller: 'personDetails'
          reloadOnSearch: true
          resolve:
            changeTab: ($rootScope) ->
              $rootScope.$broadcast 'changeTab#people'
        .when '/twitter/:searchTerm',
          controller: 'twitter'
          reloadOnSearch: true
          resolve:
            changeTab: ($rootScope) ->
              $rootScope.$broadcast 'changeTab#twitter'
        .otherwise
          redirectTo: '/github/dbashford'

    app.config ['$routeProvider', rp]

    app.run ['$rootScope', '$log', ($rootScope, $log) ->
      $rootScope.$on 'error:unauthorized', (event, response) ->
        #$log.error 'unauthorized'

      $rootScope.$on 'error:forbidden', (event, response) ->
        #$log.error 'forbidden'

      $rootScope.$on 'error:403', (event, response) ->
        #$log.error '403'

      $rootScope.$on 'success:ok', (event, response) ->
        #$log.info 'success'

      # fire an event related to the current route
      $rootScope.$on '$routeChangeSuccess', (event, currentRoute, priorRoute) ->
        $rootScope.$broadcast "#{currentRoute.controller}$routeChangeSuccess", currentRoute, priorRoute
    ]
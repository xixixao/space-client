define [
  'ang'
  'angui'
  'vendor/angular-ui-bootstrap'
  'c/controllers'
  'd/directives'
  'filters/filters'
  'vendor/angularResource'
  'services/services'
], (angular) ->

  angular.module 'app', [
    'ui.state'
    'ui.bootstrap'
    '$strap.directives'
    'controllers'
    'directives'
    'filters'
    'ngResource'
    'services'
  ]



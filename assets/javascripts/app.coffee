define [
	'ang'
	'angui'
	'vendor/angular-ui-bootstrap'
	'c/controllers'
	'd/directives'
	'filters/filters'
	'vendor/angularResource'
	'responseInterceptors/responseInterceptors'
	'services/services'
	], (angular) ->
	'use strict'


	angular.module 'app', [
		'ui.state'
		'ui.bootstrap'
		'$strap.directives'
		'controllers'
		'directives'
		'filters'
		'ngResource'
		'responseInterceptors'
		'services'
	]

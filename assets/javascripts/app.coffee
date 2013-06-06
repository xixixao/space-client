define [
	'ang'
	'angui'
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
		'controllers'
		'directives'
		'filters'
		'ngResource'
		'responseInterceptors'
		'services'
	]

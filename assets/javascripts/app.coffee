define [
	'vendor/angular'
	'controllers/controllers'
	'directives/directives'
	'filters/filters'
	'vendor/angularResource'
	'responseInterceptors/responseInterceptors'
	'services/services'
	], (angular) ->
	'use strict'

	angular.module 'app', [
		'controllers'
		'directives'
		'filters'
		'ngResource'
		'responseInterceptors'
		'services'
	]
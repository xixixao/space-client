define ['require', 'ang', 'app'], (require, angular) ->
	'use strict'
	require ['vendor/domReady!'], (document) ->
		angular.bootstrap document, ['app']



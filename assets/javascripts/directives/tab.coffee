###global define###

define ['d/directives', 'templates', 'd/tabs'], (directives, templates) ->
	'use strict'

	directives.directive 'tab', [->
		link = (scope, element, attrs, controller) ->
			controller.addTab scope, attrs.tabId

		link: link
		replace: true
		require: '^tabs'
		restrict: 'E'
		scope:
			caption: '@'
		template: templates.tab
		transclude: true
	]
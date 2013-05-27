###global define###

define ['ang', 'services/services', 'vendor/angularResource'], (angular, services) ->
	'use strict'

	services.factory 'courses', ['$resource', ($resource) ->
		courses = result: []
		person = result: {}

		activity = $resource './courses', {},
			get:
				method: 'GET'
				isArray: true
			post:
				method: 'POST'

		personActivity = $resource './courses/details/:id', {},
			get:
				method: 'GET'
				isArray: false

		get = (success, failure) ->
			courses.result = activity.get ->
				success.apply(this, arguments) if angular.isFunction success
			, ->
				failure.apply(this, arguments) if angular.isFunction failure

		post = (name = "Somebody else", success, failure) ->
			activity.post "name": name
			, (person) ->
				courses.result.push person

				success.apply(this, arguments) if angular.isFunction success
			, failure

		getPerson = (id, success, failure) ->
			person.result = personActivity.get {id: id}, ->
				success.apply(this, arguments) if angular.isFunction success
			, ->
				failure.apply(this, arguments) if angular.isFunction failure

		get: get
		courses: courses
		post: post
		person: person
		getPerson: getPerson
	]
define ['filters/filters', 'services/fakeuser'], (filters) ->
  'use strict'

  filters.filter 'fromUrl', ['user', (service) -> (events) ->

      user = service.user()

      elem = (list, id) ->
        el = list[id]
        el.id = id
        return el

      fetch = (url) ->
        [_1, topicId, _2, fileId, _3, questionId] = url.split('/').concat [null, null]
        topic = elem user.topics, topicId
        return topic unless fileId?
        file = elem topic.files, fileId
        return file unless questionId?
        question = elem file.questions, questionId
        question.topic = topic.name
        question.file = file.name
        return question

      transform = (event) ->
        elem = fetch event.url
        elem.url = event.url
        return elem

      events.map transform
  ]
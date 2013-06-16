define ['filters/filters', 'services/user'], (filters) ->
  'use strict'

  filters.filter 'fromUrl', ['$resource', 'user', ($resource, service) -> (events) ->

      user = service.user()

      elem = (list, id) ->
        el = list[id]
        el.id = id
        return el

      fetch = (url, event) ->
        [topicId, fileId, questionId, commentId, answerId, commentAId] = url.match(///
          (?:
            topics/([^/]+)
            (?:
              /files/([^/]+)
              (?:
                /questions/([^/]+)
                (?:
                  /comments/([^/]+)
                )?
                (?:
                  /answers/([^/]+)
                  (?:
                    /comments/([^/]+)
                  )?
                )?
              )?
            )?
          )?
        ///)[1..]
        topic = elem user.topics, topicId
        topic.type = 'topic'
        return topic unless fileId?
        file = elem topic.files, fileId
        file.topic = topic.name
        file.type = 'file'
        return file unless questionId?
        question = elem file.questions, questionId
        question.topic = topic.name
        question.file = file.name
        question.type = 'question'
        return question unless commentId? or answerId?
        if commentId?
          comment = event
          comment.type = 'commentQ'
          return comment
        else
          answer = event
          answer.type = 'answer'
          return answer unless commentAId?
          comment = event
          comment.type = 'commentA'
          return comment


      transform = (event) ->
        #element = fetch event.url, event
        #element = $resource("/api/#{event.url}").get()
        console.log "fromUrl called"
        element = event
        element.url = event.url
        return element

      events.map transform
  ]
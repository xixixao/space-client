define [
  'c/controllers'
  'viewer'
  'jquery'
  'utils/vector'
  'utils/rectangle'
  'vendor/q'
  'services/question'
], (controllers, PDFViewer, $, V, Rectangle) ->
  controllers.controller 'questions', [
    '$scope', '$stateParams', '$location', '$q', 'question', '$resource'
    ($scope, $stateParams, $location, Q, service, $resource) ->

      {topicId, fileId} = $stateParams
      [questionId, commentId, answerId, commentAId] = $stateParams.params.match(///
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
      ///)[1..]

      # Resource service
      Question = $resource '/api/topics/:topicId/files/:fileId/questions/:questionId',
        topicId: topicId
        fileId: fileId
      $scope.questions = Question.query()

      $scope.setQuestion = (id) ->
        console.log "calling setQuestion"
        $scope.discussed = Question.get questionId: id

      $scope.askQuestion = ->
        newQuestion = new Question
          text: $scope.question.text
          owner: $scope.user._id
          position: $scope.pdfSelection.toJSON()
        newQuestion.$save()
        $scope.questions.push newQuestion
        $scope.discussed = newQuestion
        $scope.question = null
        $scope.hideQuestionInput = true

      prefix = 'pdf-'

      converter = ->
        View = PDFViewer.View
        visible = View.getVisiblePages()

        container = View.container
        viewportContainer = $("##{prefix}viewerContainer").offset()
        viewport = $(".#{prefix}textLayer").offset()

        visiblePages = visible.views.sort (a, b) ->
          a.y - b.y

        toPDF: (onScreen) ->
          for page in visiblePages
            pageNumber = page.id
            currentPage = View.pages[pageNumber - 1]

            relativeX = container.scrollLeft + onScreen.x - viewport.left
            relativeY = container.scrollTop - page.y + onScreen.y - viewportContainer.top

            pdfCoors = currentPage.viewport.convertToPdfPoint relativeX, relativeY
            break if pdfCoors[1] > 0

          v = new V pdfCoors[0], pdfCoors[1], pageNumber
        toScreen: (inPdf) ->
          currentPage = View.pages[inPdf.page - 1]
          pageCoors = currentPage.viewport.convertToViewportPoint inPdf.x, inPdf.y

          currentPageY = currentPage.el.offsetTop + currentPage.el.clientTop

          relativeX = Math.floor pageCoors[0] - container.scrollLeft + viewport.left
          relativeY = Math.floor pageCoors[1] - container.scrollTop + currentPageY + viewportContainer.top
          new V relativeX, relativeY

      $scope.userSelected = (value) ->
        $scope.pdfSelection = value.translate converter().toPDF
        $scope.question = {}
        $scope.hideQuestionInput = false

      window.addEventListener 'scalechange', (event) ->
        $scope.$apply ->
          if $scope.pdfSelection?
            makeVisible $scope.pdfSelection
            $scope.selection = $scope.pdfSelection.translate converter().toScreen

      $scope.questionPosition = (question) ->
        $scope.rendered.then ->
          console.log "questionPosition", question
          pdfPosition = Rectangle.fromJSON(question.position)
          [pdfPosition.translate(converter().toScreen), pdfPosition]

      $scope.setDiscussed = (question) ->
        console.log "discussing", question
        $scope.discussed = question

      preventStateTransition = ->
        allowStateTransition = $scope.$on '$stateChangeStart', (e) ->
          e.preventDefault()
          allowStateTransition()

      makeVisible = (pdfPosition) ->
        PDFViewer.View.pages[pdfPosition.br.page - 1].scrollIntoView [
          null
          name: 'XYZ'
          pdfPosition.tl.x
          pdfPosition.br.y + 200
        ]

      displayQuestion = (question) ->
        $scope.questionPosition(question).then ([screenPosition, pdfPosition]) ->
          $scope.pdfSelection = pdfPosition
          makeVisible pdfPosition
          $scope.selection = screenPosition
          $scope.hideQuestionInput = true

      $scope.$watch 'discussed', (value, oldValue) ->
        console.log "discussed", value
        if !value?
          $scope.selection = null
        if value != oldValue
          preventStateTransition()
          if value?
            console.log "id", value._id
            $location.path "topics/#{topicId}/files/#{fileId}/questions/#{value._id}"
            displayQuestion value
            $scope.showDiscussion = true

            Answer = $resource '/api/topics/:topicId/files/:fileId/questions/:questionId/answers/:answerId',
              topicId: topicId
              fileId: fileId
              questionId: value._id

            $scope.submitCommentQ = (text, anonymous) ->
              Comment = $resource '/api/topics/:topicId/files/:fileId/questions/:questionId/comments/:commentId',
                topicId: topicId
                fileId: fileId
                questionId: value._id
              newComment = new Comment
                text: text
                owner: $scope.user._id
              newComment.$save()
              newComment.timestamp = new Date()
              value.comments.push newComment

            $scope.submitAnswer = (text, anonymous) ->
              newAnswer = new Answer
                text: text
                owner: $scope.user._id
              newAnswer.$save()
              newAnswer.timestamp = new Date()
              value.answers.push newAnswer

            $scope.submitCommentA = (answer, text, anonymous) ->
              Comment = $resource '/api/topics/:topicId/files/:fileId/questions/:questionId/answers/:answerId/comments/:commentId',
                topicId: topicId
                fileId: fileId
                questionId: value._id
                answerId: answer._id
              newComment = new Comment
                text: text
                owner: $scope.user._id
              newComment.$save()
              newComment.timestamp = new Date()
              answer.comments.push newComment

          else
            $location.path "topics/#{topicId}/files/#{fileId}"
      , true

      $scope.$watch 'selection', (value) ->
        if !value? and $scope.discussed?
          $scope.discussed = null

      $scope.focused = {topicId, fileId, questionId, commentId, answerId, commentAId}

      $scope.file = $resource '/api/topics/:topicId/files/:fileId',
        topicId: topicId
        fileId: fileId
      .get ->
        if questionId
          #$scope.discussed = service.get "topics/#{topicId}/files/#{fileId}/questions/#{questionId}"
          $scope.discussed = $scope.file.questions[questionId]
          if $scope.discussed?
            $scope.showDiscussion = true
        

      PDFViewer.loadFile 'files/lecture9.pdf', prefix

      file = $stateParams.file

      console.log Q
      deferred = Q.defer()
      window.addEventListener 'pagesRendered', (event) ->
        deferred.resolve()
      $scope.rendered = deferred.promise

      if $scope.discussed?
        displayQuestion $scope.discussed

      #$http.get('/files/#{file}')
      #.success (data) ->
      #  console.log data
      #.error (error) ->
      #  $scope.error = error

  ]







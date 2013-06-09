define [
  'c/controllers'
  'viewer'
  'jquery'
  'services/question'
], (controllers, PDFViewer, $) ->
  controllers.controller 'questions', [
    '$scope', '$stateParams', '$http', 'question'
    ($scope, $stateParams, $http, service) ->

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

      $scope.focused = {topicId, fileId, questionId, commentId, answerId, commentAId}

      if questionId
        console.log $scope.focused
        console.log $scope.user.topics[topicId].files
        $scope.discussed = $scope.user.topics[topicId].files[fileId].questions[questionId]
        $scope.showDiscussion = true

      file = $stateParams.file
      #$http.get('/files/#{file}')
      #.success (data) ->
      #  console.log data
      #.error (error) ->
      #  $scope.error = error

      prefix = 'pdf-'

      # x, y are window relative pixel coordinates
      # TODO: we could have two pages open, that would break stuff (we take question as put on the topmost visible page)
      pdfPosition = (x, y) ->
        View = PDFViewer.View
        visible = View.getVisiblePages()

        container = View.container
        viewportContainer = $("##{prefix}viewerContainer").offset()
        viewport = $(".#{prefix}textLayer").offset()

        visiblePages = visible.views.sort (a, b) ->
          a.y - b.y

        for page in visiblePages
          pageNumber = page.id
          currentPage = View.pages[pageNumber - 1]

          relativeX = container.scrollLeft + x - viewport.left
          relativeY = container.scrollTop - page.y + y - viewportContainer.top

          pdfCoors = currentPage.getPagePoint relativeX, relativeY
          break if pdfCoors[1] > 0

        x: pdfCoors[0]
        y: pdfCoors[1]
        page: pageNumber


      $scope.askQuestion = ->
        console.log $scope.selection, $scope.question.text
        $scope.discussed = service.newQuestion $scope.question.text, $scope.user
        reset()
        $scope.showDiscussion = true

      reset = ->
        $scope.question = {}
        $scope.selection = null

      reset()

      PDFViewer.loadFile 'files/lecture9.pdf', prefix

      $scope.file =
        questions:
          "1":
            text: "Really?"
            url: "topics/222/files/lecture9/questions/1"
  ]







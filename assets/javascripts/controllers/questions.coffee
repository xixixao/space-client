define [
  'c/controllers'
  'viewer'
  'jquery'
  'utils/vector'
  'utils/rectangle'
  'services/question'
], (controllers, PDFViewer, $, V, Rectangle) ->
  controllers.controller 'questions', [
    '$scope', '$stateParams', '$location', 'question'
    ($scope, $stateParams, $location, service) ->

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
          page = visiblePages[inPdf.page - 1]
          currentPage = View.pages[inPdf.page - 1]
          pageCoors = currentPage.viewport.convertToViewportPoint inPdf.x, inPdf.y

          relativeX = Math.floor pageCoors[0] - container.scrollLeft + viewport.left
          relativeY = Math.floor pageCoors[1] - container.scrollTop + page.y + viewportContainer.top
          new V relativeX, relativeY

      $scope.userSelected = (value) ->
        $scope.pdfSelection = value.translate converter().toPDF
        $scope.question = {}
        $scope.hideQuestionInput = false

      window.addEventListener 'scalechange', (event) ->
        $scope.$apply ->
          console.log $scope.pdfSelection
          $scope.selection = $scope.pdfSelection?.translate converter().toScreen

      $scope.askQuestion = ->
        $scope.discussed = service.newQuestion $scope.question.text, $scope.user
        $scope.question = null
        $scope.hideQuestionInput = true
        $scope.showDiscussion = true

      preventStateTransition = ->
        allowStateTransition = $scope.$on '$stateChangeStart', (e) ->
          e.preventDefault()
          allowStateTransition()

      displayQuestion = (question) ->
        pdfPosition = Rectangle.fromJSON(question.position)
        $scope.selection = pdfPosition.translate converter().toScreen
        # bottom left because pdf has normal cartesian system
        PDFViewer.View.pages[pdfPosition.br.page - 1].scrollIntoView [
          null
          name: 'XYZ'
          pdfPosition.tl.x
          pdfPosition.br.y + 200
        ]
        $scope.hideQuestionInput = true

      $scope.$watch 'discussed', (value, oldValue) ->
        if !value?
          $scope.selection = null
        if value != oldValue
          preventStateTransition()
          if value?
            # TODO: use a promise for value.id
            $location.path "topics/#{topicId}/files/#{fileId}/questions/#{value.id}"
            console.log "DISCUSSED SET"
            displayQuestion value
            console.log $scope.selection
          else
            $location.path "topics/#{topicId}/files/#{fileId}"

      $scope.focused = {topicId, fileId, questionId, commentId, answerId, commentAId}
      $scope.file = $scope.user.topics[topicId]?.files[fileId]

      PDFViewer.loadFile 'files/lecture9.pdf', prefix

      if questionId
        $scope.discussed = service.get "topics/#{topicId}/files/#{fileId}/questions/#{questionId}"
        if $scope.discussed?
          $scope.showDiscussion = true

      file = $stateParams.file

      window.addEventListener 'pagesRendered', (event) ->
        console.log event
        $scope.$apply ->
          if $scope.discussed?
            displayQuestion $scope.discussed

      #$http.get('/files/#{file}')
      #.success (data) ->
      #  console.log data
      #.error (error) ->
      #  $scope.error = error

  ]







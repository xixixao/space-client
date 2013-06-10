define [
  'c/controllers'
  'viewer'
  'jquery'
  'utils/vector'
  'services/question'
], (controllers, PDFViewer, $, V) ->
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

      $scope.focused = {topicId, fileId, questionId, commentId, answerId, commentAId}
      $scope.file = $scope.user.topics[topicId]?.files[fileId]

      if questionId
        $scope.discussed = service.get "topics/#{topicId}/files/#{fileId}/questions/#{questionId}"
        if $scope.discussed?
          $scope.showDiscussion = true

      file = $stateParams.file
      #$http.get('/files/#{file}')
      #.success (data) ->
      #  console.log data
      #.error (error) ->
      #  $scope.error = error

      prefix = 'pdf-'

      # x, y are window relative pixel coordinates
      pdfPosition = (onScreen) ->
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

          relativeX = container.scrollLeft + onScreen.x - viewport.left
          relativeY = container.scrollTop - page.y + onScreen.y - viewportContainer.top

          pdfCoors = currentPage.viewport.convertToPdfPoint relativeX, relativeY
          break if pdfCoors[1] > 0

        v = new V pdfCoors[0], pdfCoors[1], pageNumber

      pagePosition = (inPdf) ->
        View = PDFViewer.View
        visible = View.getVisiblePages()

        container = View.container
        viewportContainer = $("##{prefix}viewerContainer").offset()
        viewport = $(".#{prefix}textLayer").offset()

        visiblePages = visible.views.sort (a, b) ->
          a.y - b.y

        page = visiblePages[inPdf.page - 1]

        currentPage = View.pages[inPdf.page - 1]
        pageCoors = currentPage.viewport.convertToViewportPoint inPdf.x, inPdf.y

        relativeX = Math.floor pageCoors[0] - container.scrollLeft + viewport.left
        relativeY = Math.floor pageCoors[1] - container.scrollTop + page.y + viewportContainer.top
        new V relativeX, relativeY


      $scope.askQuestion = ->
        console.log $scope.selection, $scope.question.text
        console.log pdfPosition($scope.selection.tl), pdfPosition($scope.selection.br)
        $scope.discussed = service.newQuestion $scope.question.text, $scope.user
        $scope.question = {}
        $scope.hideQuestionInput = true
        $scope.showDiscussion = true

      preventStateTransition = ->
        allowStateTransition = $scope.$on '$stateChangeStart', (e) ->
          e.preventDefault()
          allowStateTransition()

      $scope.$watch 'discussed', (value, oldValue) ->
        if value != oldValue
          preventStateTransition()
          if value?
            # TODO: use a promise for value.id
            $location.path "topics/#{topicId}/files/#{fileId}/questions/#{value.id}"
          else
            $location.path "topics/#{topicId}/files/#{fileId}"

      reset = ->
        $scope.question = {}
        $scope.selection = null

      reset()

      $scope.userSelected = (value) ->
        $scope.pdfSelection = value.translate pdfPosition

      window.addEventListener 'scalechange', (event) ->
        $scope.$apply ->
          $scope.selection = $scope.pdfSelection?.translate pagePosition



      PDFViewer.loadFile 'files/lecture9.pdf', prefix
  ]







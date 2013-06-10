define [
  'c/controllers'
  'viewer'
  'jquery'
  'services/question'
], (controllers, PDFViewer, $) ->
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
      # TODO: we could have two pages open, that would break stuff (we take question as put on the topmost visible page)
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

          pdfCoors = currentPage.getPagePoint relativeX, relativeY
          break if pdfCoors[1] > 0

        x: pdfCoors[0]
        y: pdfCoors[1]
        page: pageNumber

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

      $scope.$watch 'discussed', (value, old) ->
        if value != old
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

      PDFViewer.loadFile 'files/lecture9.pdf', prefix
  ]







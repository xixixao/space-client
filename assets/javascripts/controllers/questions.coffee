define ['c/controllers',  'viewer', 'jquery', 'services/fakeuser'], (controllers, PDFViewer, $) ->
  'use strict'

  controllers.controller 'questions', [
    '$scope', '$routeParams', '$http', 'user',
    ($scope, $routeParams, $http, service) ->

      file = $routeParams.file
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

      $scope.prevent = (event) ->
        event.preventDefault()
        console.log "preventing"

      $scope.question =
        text: "hello"

      $scope.askQuestion = ->
        console.log "FUCK"

      PDFViewer.loadFile 'files/lecture9.pdf', prefix
  ]







define ['c/controllers',  'viewer', 'services/fakeuser'], (controllers, PDFViewer) ->
  'use strict'

  controllers.controller 'questions', [
    '$scope'
    '$routeParams'
    '$http'
    'user', ($scope, $routeParams, $http, service) ->

      file = $routeParams.file
      #$http.get('/files/#{file}')
      #.success (data) ->
      #  console.log data
      #.error (error) ->
      #  $scope.error = error

      PDFViewer.loadFile 'files/ch5.pdf', 'pdf-'
  ]

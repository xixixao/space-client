define ['c/controllers'], (controllers) ->
  'use strict'

  controllers.controller 'news', [
    '$scope', '$stateParams'
    ($scope, $stateParams) ->
      console.log "wtffff", $stateParams
  ]

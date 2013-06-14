define [
  'd/directives'
  'templates'
  'utils/vector'
  'utils/rectangle'
  'jquery'
], (directives, templates, V, Rectangle, $) ->

  directives.directive 'collapsable', [
    ->
      link: ($scope, $element) ->
        $element.click ->
          console.log "element", $element
          console.log "closest", $element.closest('[data-collapsing=parent]').length
          console.log "target", $element.closest('[data-collapsing=parent]').find('[data-collapsing=collapse]').length
          $element.closest('[data-collapsing=parent]').find('[data-collapsing=collapse]').collapse('toggle')
  ]
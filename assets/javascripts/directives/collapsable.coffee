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
        console.log "element", $element
        $element.click ->
          console.log "closest", $element.closest('[data-collapsable=parent]').length
          console.log "target", $element.closest('[data-collapsable=parent]').find('[data-collapsable=collapse]').length
          $element.closest('[data-collapsable=parent]').find('[data-collapsable=collapse]').collapse('toggle')
  ]
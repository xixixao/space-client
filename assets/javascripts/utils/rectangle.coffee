define ['utils/vector'], (V) ->
  class Rectangle
    constructor: (v1, v2) ->
      @tl = new V Math.min(v1.x, v2.x), Math.min(v1.y, v2.y)
      @br = new V Math.max(v1.x, v2.x), Math.max(v1.y, v2.y)

    size: ->
      @br.subV @tl

    center: ->
      @tl.addV(@br.subV(@tl).divS(2))

    offset: ->
      @tl.offset()
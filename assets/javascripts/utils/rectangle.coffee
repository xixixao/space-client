define ['utils/vector'], (V) ->
  class Rectangle
    constructor: (v1, v2) ->
      @tl = new V Math.min(v1.x, v2.x), Math.min(v1.y, v2.y), Math.min(v1.page, v2.page)
      @br = new V Math.max(v1.x, v2.x), Math.max(v1.y, v2.y), Math.max(v1.page, v2.page)

    size: ->
      @br.subV @tl

    center: ->
      @tl.addV(@br.subV(@tl).divS(2))

    offset: ->
      @tl.offset()

    translate: (fun) ->
      new Rectangle fun(@tl), fun(@br)

    toJSON: ->
      JSON.stringify [@tl.toJSON(), @br.toJSON()]

    @fromJSON = (json) ->
      [tl, br] = JSON.parse json
      console.log tl, br
      new Rectangle V.fromJSON(tl), V.fromJSON(br)
define ->
  class V
    constructor: (@x, @y, @page) ->

    # vector * scalar
    mulS: (value) -> new V(@x * value, @y * value)

    # vector * vector
    mulV: (vec_) -> new V(@x * vec_.x, @y * vec_.y)

    # vector / scalar
    divS: (value) -> new V(@x / value, @y / value)

    # vector + scalar
    addS: (value) -> new V(@x + value, @y + value)

    # vector + vector
    addV: (vec_) -> new V(@x + vec_.x, @y + vec_.y)

    # vector - scalar
    subS: (value) -> new V(@x - value, @y - value)

    # vector - vector
    subV: (vec_) -> new V(@x - vec_.x, @y - vec_.y)

    #  vector absolute
    abs: -> new V(Math.abs(@x), Math.abs(@y))

    # dot product
    dot: (vec_) -> @x * vec_.x + @y * vec_.y

    # vector length
    length: -> Math.sqrt @dot(this)

    # distance between vectors
    dist: (vec_) -> vec_.subV(this).length()

    # vector length, squared
    lengthSqr: -> @dot this

    #
    #    vector linear interpolation
    #    interpolate between two vectors.
    #    value should be in 0.0f - 1.0f space
    #
    lerp: (vec_, value) ->
      new V(@x + (vec_.x - @x) * value, @y + (vec_.y - @y) * value)


    # normalize THIS vector
    normalize: ->
      vlen = @length()
      @x = @x / vlen
      @y = @y / vlen

    # jquery compliant version
    offset: ->
      left: @x
      top: @y

    toJSON: ->
      JSON.stringify [@x, @y, @page]

    @fromJSON = (json) ->
      new V (JSON.parse json)...


define(function (){

  function getFileName(url) {
    var anchor = url.indexOf('#');
    var query = url.indexOf('?');
    var end = Math.min(
      anchor > 0 ? anchor : url.length,
      query > 0 ? query : url.length);
    return url.substring(url.lastIndexOf('/', end) + 1, end);
  }


  function scrollIntoView(element, spot) {
    // Assuming offsetParent is available (it's not available when viewer is in
    // hidden iframe or object). We have to scroll: if the offsetParent is not set
    // producing the error. See also animationStartedClosure.
    var parent = element.offsetParent;
    var offsetY = element.offsetTop + element.clientTop;
    if (!parent) {
      console.error('offsetParent is not set -- cannot scroll');
      return;
    }
    while (parent.clientHeight == parent.scrollHeight) {
      offsetY += parent.offsetTop;
      parent = parent.offsetParent;
      if (!parent)
        return; // no need to scroll
    }
    if (spot)
      offsetY += spot.top;
    parent.scrollTop = offsetY;
  }

  return {
    getFileName: getFileName
    , scrollIntoView: scrollIntoView
  }

});

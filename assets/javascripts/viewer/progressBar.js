define(function () {

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function ProgressBar(id, classPrefix, opts) {

    // Fetch the sub-elements for later
    this.classPrefix = classPrefix;
    this.div = document.querySelector(id + ' .' + this.classPrefix + 'progress');

    // Get options, with sensible defaults
    this.height = opts.height || 100;
    this.width = opts.width || 100;
    this.units = opts.units || '%';

    // Initialize heights
    this.div.style.height = this.height + this.units;
    this.percent = 0;
  }

  ProgressBar.prototype = {

    updateBar: function ProgressBar_updateBar() {
      if (this._indeterminate) {
        this.div.classList.add(this.classPrefix + 'indeterminate');
        this.div.style.width = this.width + this.units;
        return;
      }

      this.div.classList.remove(this.classPrefix + 'indeterminate');
      var progressSize = this.width * this._percent / 100;
      this.div.style.width = progressSize + this.units;
    },

    get percent() {
      return this._percent;
    },

    set percent(val) {
      this._indeterminate = isNaN(val);
      this._percent = clamp(val, 0, 100);
      this.updateBar();
    }
  };

  return ProgressBar;
});
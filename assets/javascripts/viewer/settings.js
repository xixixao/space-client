
// Settings Manager - This is a utility for saving settings
// First we see if localStorage is available
// If not, we use FUEL in FF
// Use asyncStorage for B2G
define(function () {
  var SETTINGS_MEMORY = 20;

//#if !(FIREFOX || MOZCENTRAL || B2G)
  var isLocalStorageEnabled = (function localStorageEnabledTest() {
    // Feature test as per http://diveintohtml5.info/storage.html
    // The additional localStorage call is to get around a FF quirk, see
    // bug #495747 in bugzilla
    try {
      return 'localStorage' in window && window['localStorage'] !== null &&
          localStorage;
    } catch (e) {
      return false;
    }
  })();
//#endif

  function Settings(fingerprint) {
    this.fingerprint = fingerprint;
    this.initializedPromise = new PDFJS.Promise();

    var resolvePromise = (function settingsResolvePromise(db) {
      this.initialize(db || '{}');
      this.initializedPromise.resolve();
    }).bind(this);

//#if B2G
//  asyncStorage.getItem('database', resolvePromise);
//#endif

//#if FIREFOX || MOZCENTRAL
//  resolvePromise(FirefoxCom.requestSync('getDatabase', null));
//#endif

//#if !(FIREFOX || MOZCENTRAL || B2G)
    if (isLocalStorageEnabled)
      resolvePromise(localStorage.getItem('database'));
//#endif
  }

  Settings.prototype = {
    initialize: function settingsInitialize(database) {
      database = JSON.parse(database);
      if (!('files' in database))
        database.files = [];
      if (database.files.length >= SETTINGS_MEMORY)
        database.files.shift();
      var index;
      for (var i = 0, length = database.files.length; i < length; i++) {
        var branch = database.files[i];
        if (branch.fingerprint == this.fingerprint) {
          index = i;
          break;
        }
      }
      if (typeof index != 'number')
        index = database.files.push({fingerprint: this.fingerprint}) - 1;
      this.file = database.files[index];
      this.database = database;
    },

    set: function settingsSet(name, val) {
      if (!this.initializedPromise.isResolved)
        return;

      var file = this.file;
      file[name] = val;
      var database = JSON.stringify(this.database);

//#if B2G
//    asyncStorage.setItem('database', database);
//#endif

//#if FIREFOX || MOZCENTRAL
//    FirefoxCom.requestSync('setDatabase', database);
//#endif

//#if !(FIREFOX || MOZCENTRAL || B2G)
      if (isLocalStorageEnabled)
        localStorage.setItem('database', database);
//#endif
    },

    get: function settingsGet(name, defaultValue) {
      if (!this.initializedPromise.isResolved)
        return defaultValue;

      return this.file[name] || defaultValue;
    }
  };

  return Settings;
});
/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals PDFJS, PDFBug, FirefoxCom, Stats */

define([
  './viewer/utilities'
  , './viewer/cache'
  , './viewer/progressBar'
  , './viewer/settings'
  , './viewer/customStyle'
], function (
  Utilities
  , Cache
  , ProgressBar
  , Settings
  , CustomStyle
) {

'use strict';

var DEFAULT_URL = '/files/ch5.pdf';
var DEFAULT_SCALE = 'auto';
var DEFAULT_SCALE_DELTA = 1.1;
var UNKNOWN_SCALE = 0;
var CACHE_SIZE = 20;
var CSS_UNITS = 96.0 / 72.0;
var SCROLLBAR_PADDING = 40;
var VERTICAL_PADDING = 5;
var MIN_SCALE = 0.25;
var MAX_SCALE = 4.0;
var RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3
};
var FindStates = {
  FIND_FOUND: 0,
  FIND_NOTFOUND: 1,
  FIND_WRAPPED: 2,
  FIND_PENDING: 3
};

//#if (FIREFOX || MOZCENTRAL || B2G || GENERIC || CHROME)
PDFJS.workerSrc = '/javascripts/vendor/pdf.js';
//#endif

var mozL10n = document.mozL10n || document.webL10n;


var getFileName = Utilities.getFileName;
var scrollIntoView = Utilities.scrollIntoView;


//#if FIREFOX || MOZCENTRAL
//#include firefoxcom.js
//#endif

var cache = new Cache(CACHE_SIZE);
var currentPageNumber = 1;

var PDFFindController = {
  startedTextExtraction: false,

  extractTextPromises: [],

  // If active, find results will be highlighted.
  active: false,

  // Stores the text for each page.
  pageContents: [],

  pageMatches: [],

  // Currently selected match.
  selected: {
    pageIdx: -1,
    matchIdx: -1
  },

  // Where find algorithm currently is in the document.
  offset: {
    pageIdx: null,
    matchIdx: null
  },

  resumePageIdx: null,

  resumeCallback: null,

  state: null,

  dirtyMatch: false,

  findTimeout: null,

  initialize: function() {
    var events = [
      'find',
      'findagain',
      'findhighlightallchange',
      'findcasesensitivitychange'
    ];

    this.handleEvent = this.handleEvent.bind(this);

    for (var i = 0; i < events.length; i++) {
      window.addEventListener(events[i], this.handleEvent);
    }
  },

  calcFindMatch: function(pageIndex) {
    var pageContent = this.pageContents[pageIndex];
    var query = this.state.query;
    var caseSensitive = this.state.caseSensitive;
    var queryLen = query.length;

    if (queryLen === 0) {
      // Do nothing the matches should be wiped out already.
      return;
    }

    if (!caseSensitive) {
      pageContent = pageContent.toLowerCase();
      query = query.toLowerCase();
    }

    var matches = [];

    var matchIdx = -queryLen;
    while (true) {
      matchIdx = pageContent.indexOf(query, matchIdx + queryLen);
      if (matchIdx === -1) {
        break;
      }

      matches.push(matchIdx);
    }
    this.pageMatches[pageIndex] = matches;
    this.updatePage(pageIndex);
    if (this.resumePageIdx === pageIndex) {
      var callback = this.resumeCallback;
      this.resumePageIdx = null;
      this.resumeCallback = null;
      callback();
    }
  },

  extractText: function() {
    if (this.startedTextExtraction) {
      return;
    }
    this.startedTextExtraction = true;

    this.pageContents = [];
    for (var i = 0, ii = PDFView.pdfDocument.numPages; i < ii; i++) {
      this.extractTextPromises.push(new PDFJS.Promise());
    }

    var self = this;
    function extractPageText(pageIndex) {
      PDFView.pages[pageIndex].getTextContent().then(
        function textContentResolved(data) {
          // Build the find string.
          var bidiTexts = data.bidiTexts;
          var str = '';

          for (var i = 0; i < bidiTexts.length; i++) {
            str += bidiTexts[i].str;
          }

          // Store the pageContent as a string.
          self.pageContents.push(str);

          self.extractTextPromises[pageIndex].resolve(pageIndex);
          if ((pageIndex + 1) < PDFView.pages.length)
            extractPageText(pageIndex + 1);
        }
      );
    }
    extractPageText(0);
    return this.extractTextPromise;
  },

  handleEvent: function(e) {
    if (this.state === null || e.type !== 'findagain') {
      this.dirtyMatch = true;
    }
    this.state = e.detail;
    this.updateUIState(FindStates.FIND_PENDING);

    this.extractText();

    clearTimeout(this.findTimeout);
    if (e.type === 'find') {
      // Only trigger the find action after 250ms of silence.
      this.findTimeout = setTimeout(this.nextMatch.bind(this), 250);
    } else {
      this.nextMatch();
    }
  },

  updatePage: function(idx) {
    var page = PDFView.pages[idx];

    if (this.selected.pageIdx === idx) {
      // If the page is selected, scroll the page into view, which triggers
      // rendering the page, which adds the textLayer. Once the textLayer is
      // build, it will scroll onto the selected match.
      page.scrollIntoView();
    }

    if (page.textLayer) {
      page.textLayer.updateMatches();
    }
  },

  nextMatch: function() {
    var pages = PDFView.pages;
    var previous = this.state.findPrevious;
    var numPages = PDFView.pages.length;

    this.active = true;

    if (this.dirtyMatch) {
      // Need to recalculate the matches, reset everything.
      this.dirtyMatch = false;
      this.selected.pageIdx = this.selected.matchIdx = -1;
      this.offset.pageIdx = previous ? numPages - 1 : 0;
      this.offset.matchIdx = null;
      this.hadMatch = false;
      this.resumeCallback = null;
      this.resumePageIdx = null;
      this.pageMatches = [];
      var self = this;

      for (var i = 0; i < numPages; i++) {
        // Wipe out any previous highlighted matches.
        this.updatePage(i);

        // As soon as the text is extracted start finding the matches.
        this.extractTextPromises[i].onData(function(pageIdx) {
          // Use a timeout since all the pages may already be extracted and we
          // want to start highlighting before finding all the matches.
          setTimeout(function() {
            self.calcFindMatch(pageIdx);
          });
        });
      }
    }

    // If there's no query there's no point in searching.
    if (this.state.query === '') {
      this.updateUIState(FindStates.FIND_FOUND);
      return;
    }

    // If we're waiting on a page, we return since we can't do anything else.
    if (this.resumeCallback) {
      return;
    }

    var offset = this.offset;
    // If there's already a matchIdx that means we are iterating through a
    // page's matches.
    if (offset.matchIdx !== null) {
      var numPageMatches = this.pageMatches[offset.pageIdx].length;
      if ((!previous && offset.matchIdx + 1 < numPageMatches) ||
          (previous && offset.matchIdx > 0)) {
        // The simple case, we just have advance the matchIdx to select the next
        // match on the page.
        this.hadMatch = true;
        offset.matchIdx = previous ? offset.matchIdx - 1 : offset.matchIdx + 1;
        this.updateMatch(true);
        return;
      }
      // We went beyond the current page's matches, so we advance to the next
      // page.
      this.advanceOffsetPage(previous);
    }
    // Start searching through the page.
    this.nextPageMatch();
  },

  nextPageMatch: function() {
    if (this.resumePageIdx !== null)
      console.error('There can only be one pending page.');

    var matchesReady = function(matches) {
      var offset = this.offset;
      var numMatches = matches.length;
      var previous = this.state.findPrevious;
      if (numMatches) {
        // There were matches for the page, so initialize the matchIdx.
        this.hadMatch = true;
        offset.matchIdx = previous ? numMatches - 1 : 0;
        this.updateMatch(true);
      } else {
        // No matches attempt to search the next page.
        this.advanceOffsetPage(previous);
        if (offset.wrapped) {
          offset.matchIdx = null;
          if (!this.hadMatch) {
            // No point in wrapping there were no matches.
            this.updateMatch(false);
            return;
          }
        }
        // Search the next page.
        this.nextPageMatch();
      }
    }.bind(this);

    var pageIdx = this.offset.pageIdx;
    var pageMatches = this.pageMatches;
    if (!pageMatches[pageIdx]) {
      // The matches aren't ready setup a callback so we can be notified,
      // when they are ready.
      this.resumeCallback = function() {
        matchesReady(pageMatches[pageIdx]);
      };
      this.resumePageIdx = pageIdx;
      return;
    }
    // The matches are finished already.
    matchesReady(pageMatches[pageIdx]);
  },

  advanceOffsetPage: function(previous) {
    var offset = this.offset;
    var numPages = this.extractTextPromises.length;
    offset.pageIdx = previous ? offset.pageIdx - 1 : offset.pageIdx + 1;
    offset.matchIdx = null;
    if (offset.pageIdx >= numPages || offset.pageIdx < 0) {
      offset.pageIdx = previous ? numPages - 1 : 0;
      offset.wrapped = true;
      return;
    }
  },

  updateMatch: function(found) {
    var state = FindStates.FIND_NOTFOUND;
    var wrapped = this.offset.wrapped;
    this.offset.wrapped = false;
    if (found) {
      var previousPage = this.selected.pageIdx;
      this.selected.pageIdx = this.offset.pageIdx;
      this.selected.matchIdx = this.offset.matchIdx;
      state = wrapped ? FindStates.FIND_WRAPPED : FindStates.FIND_FOUND;
      // Update the currently selected page to wipe out any selected matches.
      if (previousPage !== -1 && previousPage !== this.selected.pageIdx) {
        this.updatePage(previousPage);
      }
    }
    this.updateUIState(state, this.state.findPrevious);
    if (this.selected.pageIdx !== -1) {
      this.updatePage(this.selected.pageIdx, true);
    }
  },

  updateUIState: function(state, previous) {
    if (PDFView.supportsIntegratedFind) {
      FirefoxCom.request('updateFindControlState',
                         {result: state, findPrevious: previous});
      return;
    }
    PDFFindBar.updateUIState(state, previous);
  }
};

var PDFFindBar = {
  // TODO: Enable the FindBar *AFTER* the pagesPromise in the load function
  // got resolved

  opened: false,

  initialize: function() {
    this.bar = document.getElementById(pdfClassPrefix + 'findbar');

    if (!this.bar) return;

    this.toggleButton = document.getElementById(pdfClassPrefix + 'viewFind');
  //  this.questionButton = document.getElementById(pdfClassPrefix + 'viewQuestions');
    this.findField = document.getElementById(pdfClassPrefix + 'findInput');
    this.highlightAll = document.getElementById(pdfClassPrefix + 'findHighlightAll');
    this.caseSensitive = document.getElementById(pdfClassPrefix + 'findMatchCase');
    this.findMsg = document.getElementById(pdfClassPrefix + 'findMsg');
    this.findStatusIcon = document.getElementById(pdfClassPrefix + 'findStatusIcon');

    var self = this;
    this.toggleButton.addEventListener('click', function() {
      self.toggle();
    });

    //    this.questionButton.addEventListener('click', function() {
      //    self.toggle();
    //    });

    this.findField.addEventListener('input', function() {
      self.dispatchEvent('');
    });

    this.bar.addEventListener('keydown', function(evt) {
      switch (evt.keyCode) {
        case 13: // Enter
          if (evt.target === self.findField) {
            self.dispatchEvent('again', evt.shiftKey);
          }
          break;
        case 27: // Escape
          self.close();
          if (PDFView.secondaryToolbarOpen) {
            document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
          }
          break;
      }
    });

    document.getElementById(pdfClassPrefix + 'findPrevious').addEventListener('click',
      function() { self.dispatchEvent('again', true); }
    );

    document.getElementById(pdfClassPrefix + 'findNext').addEventListener('click', function() {
      self.dispatchEvent('again', false);
    });

    this.highlightAll.addEventListener('click', function() {
      self.dispatchEvent('highlightallchange');
    });

    this.caseSensitive.addEventListener('click', function() {
      self.dispatchEvent('casesensitivitychange');
    });
  },

  dispatchEvent: function(aType, aFindPrevious) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('find' + aType, true, true, {
      query: this.findField.value,
      caseSensitive: this.caseSensitive.checked,
      highlightAll: this.highlightAll.checked,
      findPrevious: aFindPrevious
    });
    return window.dispatchEvent(event);
  },

  updateUIState: function(state, previous) {
    var notFound = false;
    var findMsg = '';
    var status = '';

    switch (state) {
      case FindStates.FIND_FOUND:
        break;

      case FindStates.FIND_PENDING:
        status = 'pending';
        break;

      case FindStates.FIND_NOTFOUND:
        findMsg = mozL10n.get('find_not_found', null, 'Phrase not found');
        notFound = true;
        break;

      case FindStates.FIND_WRAPPED:
        if (previous) {
          findMsg = mozL10n.get('find_reached_top', null,
                      'Reached top of document, continued from bottom');
        } else {
          findMsg = mozL10n.get('find_reached_bottom', null,
                                'Reached end of document, continued from top');
        }
        break;
    }

    if (notFound) {
      this.findField.classList.add(pdfClassPrefix + 'notFound');
    } else {
      this.findField.classList.remove(pdfClassPrefix + 'notFound');
    }

    this.findField.setAttribute('data-status', status);
    this.findMsg.textContent = findMsg;
  },

  open: function() {
    if (this.opened) return;

    this.opened = true;
    this.toggleButton.classList.add(pdfClassPrefix + 'toggled');
    this.bar.classList.remove(pdfClassPrefix + 'hidden');
    this.findField.select();
    this.findField.focus();
  },

  close: function() {
    if (!this.opened) return;

    this.opened = false;
    this.toggleButton.classList.remove(pdfClassPrefix + 'toggled');
    this.bar.classList.add(pdfClassPrefix + 'hidden');

    PDFFindController.active = false;
  },

  toggle: function() {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  }
};

var PDFHistory = {
  initialized: false,
  allowHashChange: true,
  initialDestination: null,

  initialize: function pdfHistoryInitialize(params, fingerprint) {
    if (window.parent !== window) {
      // The browsing history is only enabled when the viewer is standalone,
      // i.e. not when it is embedded in a page.
      return;
    }
    this.initialized = true;
    this.reInitialized = false;
    this.historyUnlocked = true;

    this.fingerprint = fingerprint;
    this.currentUid = this.uid = 0;
    this.currentPage = 1;
    this.previousHash = '';
    this.current = {};

    var state = window.history.state;
    if (this._isStateObjectDefined(state)) {
      // This case corresponds to navigating back to the document
      // from another page in the browser history.
      if (state.target.dest) {
        this.initialDestination = state.target.dest;
      } else {
        PDFView.initialBookmark = state.target.hash;
      }
      this.currentUid = state.uid;
      this.uid = state.uid + 1;
      this.current = state.target;
    } else {
      // This case corresponds to the loading of a new document.
      if (state && state.fingerprint &&
          this.fingerprint !== state.fingerprint) {
        // Reinitialize the browsing history when a new document
        // is opened in the web viewer.
        this.reInitialized = true;
      }
      this._pushToHistory(params, false, true);
    }

    var self = this;
    window.addEventListener('popstate', function pdfHistoryPopstate(evt) {
      evt.preventDefault();
      evt.stopPropagation();

      if (evt.state) {
        self._goTo(evt.state);
      } else {
        self.previousHash = window.location.hash.substring(1);
        self._pushToHistory({ hash: self.previousHash },
                            false, true, !!self.previousHash);
      }
    }, false);

    window.addEventListener('beforeunload',
                            function pdfHistoryBeforeunload(evt) {
      if (self.current.page && self.current.page !== self.currentPage) {
        self._pushToHistory({ page: self.currentPage }, false);
      }
      if (PDFView.isPresentationMode) {
        // Prevent the user from accidentally navigating away from
        // the document when presentation mode is active.
        evt.preventDefault();
      }
    }, false);
  },

  _isStateObjectDefined: function pdfHistory_isStateObjectDefined(state) {
    return (state && state.uid >= 0 &&
            state.fingerprint && this.fingerprint === state.fingerprint &&
            state.target && state.target.hash) ? true : false;
  },

  get isHashChangeUnlocked() {
    // If the current hash changes when moving back/forward in the history,
    // this will trigger a 'popstate' event *as well* as a 'hashchange' event.
    // Since the hash generally won't correspond to the exact the position
    // stored in the history's state object, triggering the 'hashchange' event
    // would corrupt the browser history.
    //
    // When the hash changes during a 'popstate' event, we *only* prevent the
    // first 'hashchange' event and immediately reset allowHashChange.
    // If it is not reset, the user would not be able to change the hash.

    var temp = this.allowHashChange;
    this.allowHashChange = true;
    return temp;
  },

  updateCurrentPageNumber: function pdfHistoryUpdateCurrentPageNumber(page) {
    if (this.initialized) {
      this.currentPage = page | 0;
    }
  },

  push: function pdfHistoryPush(params) {
    if (!(this.initialized && this.historyUnlocked)) {
      return;
    }

    if (params.dest && !params.hash) {
      params.hash = (this.current.dest === params.dest && this.current.hash) ?
        this.current.hash :
        PDFView.getDestinationHash(params.dest).split('#')[1];
    }
    if (params.page) {
      params.page |= 0;
    }

    if (params.hash) {
      if (this.current.hash) {
        if (this.current.hash !== params.hash) {
          this._pushToHistory(params, true);
        } else if (!this.current.page && params.page) {
          this._pushToHistory(params, false, true, true);
        }
      } else {
        this._pushToHistory(params, true);
      }
    } else if (this.current.page && this.current.page !== params.page) {
      this._pushToHistory(params, true);
    }
  },

  _stateObj: function PDFHistory_stateObj(target) {
    return { fingerprint: this.fingerprint, uid: this.uid, target: target };
  },

  _pushToHistory: function pdfHistory_pushToHistory(params, addPrevious,
                                                    overwrite, addUrl) {
    if (!this.initialized) {
      return;
    }

    if (!params.hash && params.page) {
      params.hash = ('page=' + params.page);
    }
    var hash = addUrl ? ('#' + this.previousHash) : '';

    if (overwrite) {
      window.history.replaceState(this._stateObj(params), '', hash);
    } else {
      if (addPrevious &&
          this.current.page && this.current.page !== this.currentPage) {
        this._pushToHistory({ page: this.currentPage }, false);
      }
      window.history.pushState(this._stateObj(params), '', hash);
    }
    this.currentUid = this.uid++;
    this.current = params;
  },

  _goTo: function pdfHistory_goTo(state) {
    if (!(this.initialized && this.historyUnlocked &&
          this._isStateObjectDefined(state))) {
      return;
    }

    if (!this.reInitialized && state.uid < this.currentUid &&
        this.current.page && this.current.page !== this.currentPage) {
      this._pushToHistory(this.current, false, false, !!this.previousHash);
      this._pushToHistory({ page: this.currentPage }, false);

      window.history.back();
      return;
    }

    this.historyUnlocked = false;

    if (state.target.dest) {
      //PDFView.navigateTo(state.target.dest);
    } else {
      //PDFView.setHash(state.target.hash);
    }
    this.currentUid = state.uid;
    if (state.uid > this.uid) {
      this.uid = state.uid;
    }
    this.current = state.target;

    var currentHash = window.location.hash.substring(1);
    if (this.previousHash !== currentHash) {
      this.allowHashChange = false;
    }
    this.previousHash = currentHash;

    this.historyUnlocked = true;
  },

  back: function pdfHistoryBack() {
    this.go(-1);
  },

  forward: function pdfHistoryForward() {
    this.go(1);
  },

  go: function pdfHistoryGo(direction) {
    if (this.initialized && this.historyUnlocked) {
      var state = window.history.state;
      if (direction === -1 && state && state.uid > 0) {
        window.history.back();
      } else if (direction === 1 && state && state.uid < (this.uid - 1)) {
        window.history.forward();
      }
    }
  }
};

var PDFView = {
  pages: [],
  thumbnails: [],
  currentScale: UNKNOWN_SCALE,
  currentScaleValue: null,
  initialBookmark: document.location.hash.substring(1),
  startedTextExtraction: false,
  pageText: [],
  container: null,
  thumbnailContainer: null,
  initialized: false,
  fellback: false,
  pdfDocument: null,
  sidebarOpen: false,
  secondaryToolbarOpen: false,
  pageViewScroll: null,
  thumbnailViewScroll: null,
  isPresentationMode: false,
  previousScale: null,
  pageRotation: 0,
  mouseScrollTimeStamp: 0,
  mouseScrollDelta: 0,
  lastScroll: 0,
  previousPageNumber: 1,

  // called once when the document is loaded
  initialize: function pdfViewInitialize() {
    var self = this;
    var container = this.container = document.getElementById(pdfClassPrefix + 'viewerContainer');
    this.pageViewScroll = {};
    this.watchScroll(container, this.pageViewScroll, updateViewarea);

    var thumbnailContainer = this.thumbnailContainer =
                             document.getElementById(pdfClassPrefix + 'thumbnailView');
    if (thumbnailContainer) {
      this.thumbnailViewScroll = {};
      this.watchScroll(thumbnailContainer, this.thumbnailViewScroll,
                       this.renderHighestPriority.bind(this));
    }

    PDFFindBar.initialize();
    PDFFindController.initialize();

    this.initialized = true;
    container.addEventListener('scroll', function() {
      self.lastScroll = Date.now();
    }, false);
  },

  getPage: function pdfViewGetPage(n) {
    return this.pdfDocument.getPage(n);
  },

  // Helper function to keep track whether a div was scrolled up or down and
  // then call a callback.
  watchScroll: function pdfViewWatchScroll(viewAreaElement, state, callback) {
    state.down = true;
    state.lastY = viewAreaElement.scrollTop;
    viewAreaElement.addEventListener('scroll', function webViewerScroll(evt) {
      var currentY = viewAreaElement.scrollTop;
      var lastY = state.lastY;
      if (currentY > lastY)
        state.down = true;
      else if (currentY < lastY)
        state.down = false;
      // else do nothing and use previous value
      state.lastY = currentY;
      callback();
    }, true);
  },

  setScale: function pdfViewSetScale(val, resetAutoSettings, noScroll) {
    if (val == this.currentScale)
      return;

    var pages = this.pages;
    for (var i = 0; i < pages.length; i++)
      pages[i].update(val * CSS_UNITS);

    if (!noScroll && this.currentScale != val)
      this.pages[this.page - 1].scrollIntoView();
    this.currentScale = val;

    var event = document.createEvent('UIEvents');
    event.initUIEvent('scalechange', false, false, window, 0);
    event.scale = val;
    event.resetAutoSettings = resetAutoSettings;
    window.dispatchEvent(event);
  },

  parseScale: function pdfViewParseScale(value, resetAutoSettings, noScroll) {
    if ('custom' == value)
      return;
    console.log("parseScale");
    var scale = parseFloat(value);
    this.currentScaleValue = value;
    if (scale) {
      this.setScale(scale, true, noScroll);
      return;
    }

    var container = this.container;
    var currentPage = this.pages[this.page - 1];

    if (!currentPage) {
      return;
    }

    var pageWidthScale = (container.clientWidth - SCROLLBAR_PADDING) /
                          currentPage.width * currentPage.scale / CSS_UNITS;
    var pageHeightScale = (container.clientHeight - VERTICAL_PADDING) /
                           currentPage.height * currentPage.scale / CSS_UNITS;
    switch (value) {
      case 'page-actual':
        scale = 1;
        break;
      case 'page-width':
        scale = pageWidthScale;
        break;
      case 'page-height':
        scale = pageHeightScale;
        break;
      case 'page-fit':
        scale = Math.min(pageWidthScale, pageHeightScale);
        break;
      case 'auto':
        scale = Math.min(1.0, pageWidthScale);
        break;
    }
    this.setScale(scale, resetAutoSettings, noScroll);

    selectScaleOption(value);
  },

  zoomIn: function pdfViewZoomIn() {
    var newScale = (this.currentScale * DEFAULT_SCALE_DELTA).toFixed(2);
    newScale = Math.ceil(newScale * 10) / 10;
    newScale = Math.min(MAX_SCALE, newScale);
    this.parseScale(newScale, true);
  },

  zoomOut: function pdfViewZoomOut() {
    var newScale = (this.currentScale / DEFAULT_SCALE_DELTA).toFixed(2);
    newScale = Math.floor(newScale * 10) / 10;
    newScale = Math.max(MIN_SCALE, newScale);
    this.parseScale(newScale, true);
  },

  set page(val) {
    var pages = this.pages;
    var input = document.getElementById(pdfClassPrefix + 'pageNumber');
    var event = document.createEvent('UIEvents');
    event.initUIEvent('pagechange', false, false, window, 0);

    if (!(0 < val && val <= pages.length)) {
      this.previousPageNumber = val;
      event.pageNumber = this.page;
      window.dispatchEvent(event);
      return;
    }

    pages[val - 1].updateStats();
    this.previousPageNumber = currentPageNumber;
    currentPageNumber = val;
    event.pageNumber = val;
    window.dispatchEvent(event);

    // checking if the this.page was called from the updateViewarea function:
    // avoiding the creation of two "set page" method (internal and public)
    if (updateViewarea.inProgress)
      return;

    // Avoid scrolling the first page during loading
    if (this.loading && val == 1)
      return;

    pages[val - 1].scrollIntoView();
  },

  get page() {
    return currentPageNumber;
  },

  get supportsPrinting() {
    var canvas = document.createElement('canvas');
    var value = 'mozPrintCallback' in canvas;
    // shadow
    Object.defineProperty(this, 'supportsPrinting', { value: value,
                                                      enumerable: true,
                                                      configurable: true,
                                                      writable: false });
    return value;
  },

  get supportsFullscreen() {
    var doc = document.documentElement;
    var support = doc.requestFullscreen || doc.mozRequestFullScreen ||
                  doc.webkitRequestFullScreen;

    // Disable presentation mode button if we're in an iframe
    if (window.parent !== window) {
      support = false;
    }

    Object.defineProperty(this, 'supportsFullscreen', { value: support,
                                                        enumerable: true,
                                                        configurable: true,
                                                        writable: false });
    return support;
  },

  get supportsIntegratedFind() {
    var support = false;
  //#if !(FIREFOX || MOZCENTRAL)
  //#else
  //  support = FirefoxCom.requestSync('supportsIntegratedFind');
  //#endif
    Object.defineProperty(this, 'supportsIntegratedFind', { value: support,
                                                            enumerable: true,
                                                            configurable: true,
                                                            writable: false });
    return support;
  },

  get supportsDocumentFonts() {
    var support = true;
  //#if !(FIREFOX || MOZCENTRAL)
  //#else
  //  support = FirefoxCom.requestSync('supportsDocumentFonts');
  //#endif
    Object.defineProperty(this, 'supportsDocumentFonts', { value: support,
                                                           enumerable: true,
                                                           configurable: true,
                                                           writable: false });
    return support;
  },

  get supportsDocumentColors() {
    var support = true;
  //#if !(FIREFOX || MOZCENTRAL)
  //#else
  //  support = FirefoxCom.requestSync('supportsDocumentColors');
  //#endif
    Object.defineProperty(this, 'supportsDocumentColors', { value: support,
                                                            enumerable: true,
                                                            configurable: true,
                                                            writable: false });
    return support;
  },

  get isHorizontalScrollbarEnabled() {
    var div = document.getElementById(pdfClassPrefix + 'viewerContainer');
    return div.scrollWidth > div.clientWidth;
  },

  initPassiveLoading: function pdfViewInitPassiveLoading() {
    if (!PDFView.loadingBar) {
      PDFView.loadingBar = new ProgressBar('#' + pdfClassPrefix + 'loadingBar', pdfClassPrefix, {});
    }

    var pdfDataRangeTransport = {
      rangeListeners: [],
      progressListeners: [],

      addRangeListener: function PdfDataRangeTransport_addRangeListener(
                                   listener) {
        this.rangeListeners.push(listener);
      },

      addProgressListener: function PdfDataRangeTransport_addProgressListener(
                                      listener) {
        this.progressListeners.push(listener);
      },

      onDataRange: function PdfDataRangeTransport_onDataRange(begin, chunk) {
        var listeners = this.rangeListeners;
        for (var i = 0, n = listeners.length; i < n; ++i) {
          listeners[i](begin, chunk);
        }
      },

      onDataProgress: function PdfDataRangeTransport_onDataProgress(loaded) {
        var listeners = this.progressListeners;
        for (var i = 0, n = listeners.length; i < n; ++i) {
          listeners[i](loaded);
        }
      },

      requestDataRange: function PdfDataRangeTransport_requestDataRange(
                                  begin, end) {
        FirefoxCom.request('requestDataRange', { begin: begin, end: end });
      }
    };

    window.addEventListener('message', function windowMessage(e) {
      var args = e.data;

      if (typeof args !== 'object' || !('pdfjsLoadAction' in args))
        return;
      switch (args.pdfjsLoadAction) {
        case 'supportsRangedLoading':
          PDFView.open(args.pdfUrl, 0, undefined, pdfDataRangeTransport, {
            length: args.length
          });
          break;
        case 'range':
          pdfDataRangeTransport.onDataRange(args.begin, args.chunk);
          break;
        case 'rangeProgress':
          pdfDataRangeTransport.onDataProgress(args.loaded);
          break;
        case 'progress':
          PDFView.progress(args.loaded / args.total);
          break;
        case 'complete':
          if (!args.data) {
            PDFView.error(mozL10n.get('loading_error', null,
                          'An error occurred while loading the PDF.'), e);
            break;
          }
          PDFView.open(args.data, 0);
          break;
      }
    });
    FirefoxCom.requestSync('initPassiveLoading', null);
  },

  setTitleUsingUrl: function pdfViewSetTitleUsingUrl(url) {
    this.url = url;
    try {
      this.setTitle(decodeURIComponent(getFileName(url)) || url);
    } catch (e) {
      // decodeURIComponent may throw URIError,
      // fall back to using the unprocessed url in that case
      this.setTitle(url);
    }
  },

  setTitle: function pdfViewSetTitle(title) {
    document.title = title;
  //#if B2G
  //  document.getElementById(pdfClassPrefix + 'activityTitle').textContent = title;
  //#endif
  },

  // TODO(mack): This function signature should really be pdfViewOpen(url, args)
  open: function pdfViewOpen(url, scale, password, pdfDataRangeTransport, args) {
    var parameters = {password: password};
    if (typeof url === 'string') { // URL
      this.setTitleUsingUrl(url);
      parameters.url = url;
    } else if (url && 'byteLength' in url) { // ArrayBuffer
      parameters.data = url;
    }
    if (args) {
      for (var prop in args) {
        parameters[prop] = args[prop];
      }
    }

    if (!PDFView.loadingBar) {
      PDFView.loadingBar = new ProgressBar('#' + pdfClassPrefix + 'loadingBar', pdfClassPrefix, {});
    }

    this.pdfDocument = null;
    var self = this;
    self.loading = true;
    var passwordNeeded = function passwordNeeded(updatePassword, reason) {
      var promptString = mozL10n.get('request_password', null,
                                'PDF is protected by a password:');

      if (reason === PDFJS.PasswordResponses.INCORRECT_PASSWORD) {
        promptString += '\n' + mozL10n.get('invalid_password', null,
                                'Invalid Password.');
      }

      password = prompt(promptString);
      if (password && password.length > 0) {
        return updatePassword(password);
      }
    };

    PDFJS.getDocument(parameters, pdfDataRangeTransport, passwordNeeded).then(
      function getDocumentCallback(pdfDocument) {
        self.load(pdfDocument, scale);
        self.loading = false;
      },
      function getDocumentError(message, exception) {
        var loadingErrorMessage = mozL10n.get('loading_error', null,
          'An error occurred while loading the PDF.');

        if (exception && exception.name === 'InvalidPDFException') {
          // change error message also for other builds
          var loadingErrorMessage = mozL10n.get('invalid_file_error', null,
                                        'Invalid or corrupted PDF file.');
        //#if B2G
        //        window.alert(loadingErrorMessage);
        //        return window.close();
        //#endif
        }

        if (exception && exception.name === 'MissingPDFException') {
          // special message for missing PDF's
          var loadingErrorMessage = mozL10n.get('missing_file_error', null,
                                        'Missing PDF file.');

        //#if B2G
        //        window.alert(loadingErrorMessage);
        //        return window.close();
        //#endif
        }

        var moreInfo = {
          message: message
        };
        self.error(loadingErrorMessage, moreInfo);
        self.loading = false;
      },
      function getDocumentProgress(progressData) {
        self.progress(progressData.loaded / progressData.total);
      }
    );
  },

  download: function pdfViewDownload() {
    function noData() {
      FirefoxCom.request('download', { originalUrl: url });
    }
    var url = this.url.split('#')[0];
    //#if !(FIREFOX || MOZCENTRAL)

    var a = document.createElement('a');

    // If _parent == self, then opening an identical URL with different
    // location hash will only cause a navigation, not a download.
    if (window.top === window && !('download' in a) &&
        url === window.location.href.split('#')[0]) {
      url += url.indexOf('?') === -1 ? '?' : '&';
    }

    url += '#pdfjs.action=download';
    if (a.click) {
      // Use a.click() if available. Otherwise, Chrome might show
      // "Unsafe JavaScript attempt to initiate a navigation change
      //  for frame with URL" and not open the PDF at all.
      // Supported by (not mentioned = untested):
      // - Firefox 6 - 19 (4- does not support a.click, 5 ignores a.click)
      // - Chrome 19 - 26 (18- does not support a.click)
      // - Opera 9 - 12.15
      // - Internet Explorer 6 - 10
      // - Safari 6 (5.1- does not support a.click)
      a.href = url;
      a.target = '_parent';
      // Use a.download if available. This increases the likelihood that
      // the file is downloaded instead of opened by another PDF plugin.
      if ('download' in a) {
        var filename = url.match(/([^\/?#=]+\.pdf)/i);
        a.download = filename ? filename[1] : 'file.pdf';
      }
      // <a> must be in the document for IE and recent Firefox versions.
      // (otherwise .click() is ignored)
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
    } else {
      window.open(url, '_parent');
    }
  //#else
  //  // Document isn't ready just try to download with the url.
  //  if (!this.pdfDocument) {
  //    noData();
  //    return;
  //  }
  //  this.pdfDocument.getData().then(
  //    function getDataSuccess(data) {
  //      var blob = PDFJS.createBlob(data.buffer, 'application/pdf');
  //      var blobUrl = window.URL.createObjectURL(blob);
  //
  //      FirefoxCom.request('download', { blobUrl: blobUrl, originalUrl: url },
  //        function response(err) {
  //          if (err) {
  //            // This error won't really be helpful because it's likely the
  //            // fallback won't work either (or is already open).
  //            PDFView.error('PDF failed to download.');
  //          }
  //          window.URL.revokeObjectURL(blobUrl);
  //        }
  //      );
  //    },
  //    noData // Error occurred try downloading with just the url.
  //  );
  //#endif
  },

  fallback: function pdfViewFallback() {
  //#if !(FIREFOX || MOZCENTRAL)
  //  return;
  //#else
  //  // Only trigger the fallback once so we don't spam the user with messages
  //  // for one PDF.
  //  if (this.fellback)
  //    return;
  //  this.fellback = true;
  //  var url = this.url.split('#')[0];
  //  FirefoxCom.request('fallback', url, function response(download) {
  //    if (!download)
  //      return;
  //    PDFView.download();
  //  });
  //#endif
  },

  navigateTo: function pdfViewNavigateTo(dest) {
    var self = this;
    PDFJS.Promise.all([this.pagesPromise,
                       this.destinationsPromise]).then(function() {
      var destString = '';
      if (typeof dest === 'string') {
        destString = dest;
        dest = self.destinations[dest];
      }
      if (!(dest instanceof Array)) {
        return; // invalid destination
      }
      // dest array looks like that: <page-ref> </XYZ|FitXXX> <args..>
      var destRef = dest[0];
      var pageNumber = destRef instanceof Object ?
        self.pagesRefMap[destRef.num + ' ' + destRef.gen + ' R'] :
        (destRef + 1);
      if (pageNumber) {
        if (pageNumber > self.pages.length) {
          pageNumber = self.pages.length;
        }
        var currentPage = self.pages[pageNumber - 1];
        currentPage.scrollIntoView(dest);

        // Update the browsing history.
        PDFHistory.push({ dest: dest, hash: destString, page: pageNumber });
      }
    });
  },

  getDestinationHash: function pdfViewGetDestinationHash(dest) {
    if (typeof dest === 'string')
      return PDFView.getAnchorUrl('#' + escape(dest));
    if (dest instanceof Array) {
      var destRef = dest[0]; // see navigateTo method for dest format
      var pageNumber = destRef instanceof Object ?
        this.pagesRefMap[destRef.num + ' ' + destRef.gen + ' R'] :
        (destRef + 1);
      if (pageNumber) {
        var pdfOpenParams = PDFView.getAnchorUrl('#page=' + pageNumber);
        var destKind = dest[1];
        if (typeof destKind === 'object' && 'name' in destKind &&
            destKind.name == 'XYZ') {
          var scale = (dest[4] || this.currentScaleValue);
          var scaleNumber = parseFloat(scale);
          if (scaleNumber) {
            scale = scaleNumber * 100;
          }
          pdfOpenParams += '&zoom=' + scale;
          if (dest[2] || dest[3]) {
            pdfOpenParams += ',' + (dest[2] || 0) + ',' + (dest[3] || 0);
          }
        }
        return pdfOpenParams;
      }
    }
    return '';
  },

  /**
   * For the firefox extension we prefix the full url on anchor links so they
   * don't come up as resource:// urls and so open in new tab/window works.
   * @param {String} anchor The anchor hash include the #.
   */
  getAnchorUrl: function getAnchorUrl(anchor) {
  //#if !(FIREFOX || MOZCENTRAL)
    return anchor;
  //#else
  //  return this.url.split('#')[0] + anchor;
  //#endif
  },

  /**
   * Returns scale factor for the canvas. It makes sense for the HiDPI displays.
   * @return {Object} The object with horizontal (sx) and vertical (sy)
                      scales. The scaled property is set to false if scaling is
                      not required, true otherwise.
   */
  getOutputScale: function pdfViewGetOutputDPI() {
    var pixelRatio = 'devicePixelRatio' in window ? window.devicePixelRatio : 1;
    return {
      sx: pixelRatio,
      sy: pixelRatio,
      scaled: pixelRatio != 1
    };
  },

  /**
   * Show the error box.
   * @param {String} message A message that is human readable.
   * @param {Object} moreInfo (optional) Further information about the error
   *                            that is more technical.  Should have a 'message'
   *                            and optionally a 'stack' property.
   */
  error: function pdfViewError(message, moreInfo) {
    var moreInfoText = mozL10n.get('error_version_info',
      {version: PDFJS.version || '?', build: PDFJS.build || '?'},
      'PDF.js v{{version}} (build: {{build}})') + '\n';
    if (moreInfo) {
      moreInfoText +=
        mozL10n.get('error_message', {message: moreInfo.message},
        'Message: {{message}}');
      if (moreInfo.stack) {
        moreInfoText += '\n' +
          mozL10n.get('error_stack', {stack: moreInfo.stack},
          'Stack: {{stack}}');
      } else {
        if (moreInfo.filename) {
          moreInfoText += '\n' +
            mozL10n.get('error_file', {file: moreInfo.filename},
            'File: {{file}}');
        }
        if (moreInfo.lineNumber) {
          moreInfoText += '\n' +
            mozL10n.get('error_line', {line: moreInfo.lineNumber},
            'Line: {{line}}');
        }
      }
    }

  //#if !(FIREFOX || MOZCENTRAL)
    var errorWrapper = document.getElementById(pdfClassPrefix + 'errorWrapper');
    errorWrapper.removeAttribute('hidden');

    var errorMessage = document.getElementById(pdfClassPrefix + 'errorMessage');
    errorMessage.textContent = message;

    var closeButton = document.getElementById(pdfClassPrefix + 'errorClose');
    closeButton.onclick = function() {
      errorWrapper.setAttribute('hidden', 'true');
    };

    var errorMoreInfo = document.getElementById(pdfClassPrefix + 'errorMoreInfo');
    var moreInfoButton = document.getElementById(pdfClassPrefix + 'errorShowMore');
    var lessInfoButton = document.getElementById(pdfClassPrefix + 'errorShowLess');
    moreInfoButton.onclick = function() {
      errorMoreInfo.removeAttribute('hidden');
      moreInfoButton.setAttribute('hidden', 'true');
      lessInfoButton.removeAttribute('hidden');
    };
    lessInfoButton.onclick = function() {
      errorMoreInfo.setAttribute('hidden', 'true');
      moreInfoButton.removeAttribute('hidden');
      lessInfoButton.setAttribute('hidden', 'true');
    };
    moreInfoButton.removeAttribute('hidden');
    lessInfoButton.setAttribute('hidden', 'true');
    errorMoreInfo.value = moreInfoText;

    errorMoreInfo.rows = moreInfoText.split('\n').length - 1;
  //#else
  //  console.error(message + '\n' + moreInfoText);
  //  this.fallback();
  //#endif
  },

  progress: function pdfViewProgress(level) {
    var percent = Math.round(level * 100);
    // When we transition from full request to range requests, it's possible
    // that we discard some of the loaded data. This can cause the loading
    // bar to move backwards. So prevent this by only updating the bar if it
    // increases.
    if (percent > PDFView.loadingBar.percent) {
      PDFView.loadingBar.percent = percent;
    }
  },

  load: function pdfViewLoad(pdfDocument, scale) {
    function bindOnAfterDraw(pageView, thumbnailView) {
      // when page is painted, using the image as thumbnail base
      pageView.onAfterDraw = function pdfViewLoadOnAfterDraw() {
        thumbnailView.setImage(pageView.canvas);
      };
    }

    this.pdfDocument = pdfDocument;

    var errorWrapper = document.getElementById(pdfClassPrefix + 'errorWrapper');
    errorWrapper.setAttribute('hidden', 'true');

    pdfDocument.dataLoaded().then(function() {
      var loadingBar = document.getElementById(pdfClassPrefix + 'loadingBar');
      loadingBar.classList.add(pdfClassPrefix + 'hidden');
      var outerContainer = document.getElementById(pdfClassPrefix + 'outerContainer');
      outerContainer.classList.remove(pdfClassPrefix + 'loadingInProgress');
    });

    var thumbsView = document.getElementById(pdfClassPrefix + 'thumbnailView');
    if (thumbsView) {
      thumbsView.parentNode.scrollTop = 0;

      while (thumbsView.hasChildNodes())
        thumbsView.removeChild(thumbsView.lastChild);

      if ('_loadingInterval' in thumbsView)
        clearInterval(thumbsView._loadingInterval);
    }

    var container = document.getElementById(pdfClassPrefix + 'viewer');
    while (container.hasChildNodes())
      container.removeChild(container.lastChild);

    var pagesCount = pdfDocument.numPages;
    var id = pdfDocument.fingerprint;
    var numPages = document.getElementById(pdfClassPrefix + 'numPages');
    if (numPages) {
      numPages.textContent =
        mozL10n.get('page_of', {pageCount: pagesCount}, 'of {{pageCount}}');
      document.getElementById(pdfClassPrefix + 'pageNumber').max = pagesCount;
    }

    PDFView.documentFingerprint = id;
    var store = PDFView.store = new Settings(id);

    this.pageRotation = 0;

    var pages = this.pages = [];
    this.pageText = [];
    this.startedTextExtraction = false;
    var pagesRefMap = this.pagesRefMap = {};
    var thumbnails = this.thumbnails = [];

    var pagesPromise = this.pagesPromise = new PDFJS.Promise();
    var self = this;

    var firstPagePromise = pdfDocument.getPage(1);

    // Fetch a single page so we can get a viewport that will be the default
    // viewport for all pages
    firstPagePromise.then(function(pdfPage) {
      var viewport = pdfPage.getViewport(scale || 1.0);
      var pagePromises = [];
      for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
        var viewportClone = viewport.clone();
        var pageView = new PageView(container, pageNum, scale,
                                    self.navigateTo.bind(self),
                                    viewportClone);
        if (thumbsView) {
          var thumbnailView = new ThumbnailView(thumbsView, pageNum,
                                                viewportClone);
          bindOnAfterDraw(pageView, thumbnailView);
          thumbnails.push(thumbnailView);
        }
        pages.push(pageView);
      }

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('documentload', true, true, {});
      window.dispatchEvent(event);

      for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
        var pagePromise = pdfDocument.getPage(pageNum);
        pagePromise.then(function(pdfPage) {
          var pageNum = pdfPage.pageNumber;
          var pageView = pages[pageNum - 1];
          if (!pageView.pdfPage) {
            // The pdfPage might already be set if we've already entered
            // pageView.draw()
            pageView.setPdfPage(pdfPage);
          }
          if (thumbsView) {
            var thumbnailView = thumbnails[pageNum - 1];
            if (!thumbnailView.pdfPage) {
              thumbnailView.setPdfPage(pdfPage);
            }
          }

          var pageRef = pdfPage.ref;
          var refStr = pageRef.num + ' ' + pageRef.gen + ' R';
          pagesRefMap[refStr] = pdfPage.pageNumber;
        });
        pagePromises.push(pagePromise);
      }

      PDFJS.Promise.all(pagePromises).then(function(pages) {
        pagesPromise.resolve(pages);
      });
    });

    var storePromise = store.initializedPromise;
    PDFJS.Promise.all([firstPagePromise, storePromise]).then(function() {
      var storedHash = null, pageNum;
      if (store.get('exists', false)) {
        pageNum = store.get('page', '1');
        var zoom = store.get('zoom', PDFView.currentScale);
        var left = store.get('scrollLeft', '0');
        var top = store.get('scrollTop', '0');

        storedHash = 'page=' + pageNum + '&zoom=' + zoom + ',' +
                     left + ',' + top;
      }
      // Initialize the browsing history.
      PDFHistory.initialize({ hash: storedHash, page: (pageNum || 1) },
                            PDFView.documentFingerprint);
      self.setInitialView(storedHash, scale);

      // Make all navigation keys work on document load,
      // unless the viewer is embedded in another page.
      if (window.parent === window) {
        PDFView.container.focus();
        PDFView.container.blur();
      }
    });

    pagesPromise.then(function() {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('pagesRendered', true, true, {});
      window.dispatchEvent(event);

      if (PDFView.supportsPrinting) {
        pdfDocument.getJavaScript().then(function(javaScript) {
          if (javaScript.length) {
            console.warn('Warning: JavaScript is not supported');
            PDFView.fallback();
          }
          // Hack to support auto printing.
          var regex = /\bprint\s*\(/g;
          for (var i = 0, ii = javaScript.length; i < ii; i++) {
            var js = javaScript[i];
            if (js && regex.test(js)) {
              setTimeout(function() {
                window.print();
              });
              return;
            }
          }
        });
      }
    });

    var destinationsPromise =
      this.destinationsPromise = pdfDocument.getDestinations();
    destinationsPromise.then(function(destinations) {
      self.destinations = destinations;
    });

    if (document.getElementById(pdfClassPrefix + 'viewOutline')) {
      // outline depends on destinations and pagesRefMap
      var promises = [pagesPromise, destinationsPromise,
                      PDFView.animationStartedPromise];
      PDFJS.Promise.all(promises).then(function() {
        pdfDocument.getOutline().then(function(outline) {
          self.outline = new DocumentOutlineView(outline);
          document.getElementById(pdfClassPrefix + 'viewOutline').disabled = !outline;
        });
      });
    }

    pdfDocument.getMetadata().then(function(data) {
      var info = data.info, metadata = data.metadata;
      self.documentInfo = info;
      self.metadata = metadata;

      // Provides some basic debug information
      console.log('PDF ' + pdfDocument.fingerprint + ' [' +
                  info.PDFFormatVersion + ' ' + (info.Producer || '-') +
                  ' / ' + (info.Creator || '-') + ']' +
                  (PDFJS.version ? ' (PDF.js: ' + PDFJS.version + ')' : ''));

      var pdfTitle;
      if (metadata) {
        if (metadata.has('dc:title'))
          pdfTitle = metadata.get('dc:title');
      }

      if (!pdfTitle && info && info['Title'])
        pdfTitle = info['Title'];

      if (pdfTitle)
        self.setTitle(pdfTitle + ' - ' + document.title);

      if (info.IsAcroFormPresent) {
        console.warn('Warning: AcroForm/XFA is not supported');
        PDFView.fallback();
      }
    });
  },

  setInitialView: function pdfViewSetInitialView(storedHash, scale) {
    // Reset the current scale, as otherwise the page's scale might not get
    // updated if the zoom level stayed the same.
    this.currentScale = 0;
    this.currentScaleValue = null;
    if (PDFHistory.initialDestination) {
      this.navigateTo(PDFHistory.initialDestination);
      PDFHistory.initialDestination = null;
    } else if (this.initialBookmark) {
      this.setHash(this.initialBookmark);
      this.initialBookmark = null;
    } else if (storedHash) {
      this.setHash(storedHash);
    } else if (scale) {
      this.parseScale(scale, true);
      this.page = 1;
    }

    if (PDFView.currentScale === UNKNOWN_SCALE) {
      // Scale was not initialized: invalid bookmark or scale was not specified.
      // Setting the default one.
      this.parseScale(DEFAULT_SCALE, true);
    }
  },

  renderHighestPriority: function pdfViewRenderHighestPriority() {
    // Pages have a higher priority than thumbnails, so check them first.
    var visiblePages = this.getVisiblePages();
    var pageView = this.getHighestPriority(visiblePages, this.pages,
                                           this.pageViewScroll.down);
    if (pageView) {
      this.renderView(pageView, 'page');
      return;
    }
    // No pages needed rendering so check thumbnails.
    if (this.sidebarOpen) {
      var visibleThumbs = this.getVisibleThumbs();
      var thumbView = this.getHighestPriority(visibleThumbs,
                                              this.thumbnails,
                                              this.thumbnailViewScroll.down);
      if (thumbView)
        this.renderView(thumbView, 'thumbnail');
    }
  },

  getHighestPriority: function pdfViewGetHighestPriority(visible, views,
                                                         scrolledDown) {
    // The state has changed figure out which page has the highest priority to
    // render next (if any).
    // Priority:
    // 1 visible pages
    // 2 if last scrolled down page after the visible pages
    // 2 if last scrolled up page before the visible pages
    var visibleViews = visible.views;

    var numVisible = visibleViews.length;
    if (numVisible === 0) {
      return false;
    }
    for (var i = 0; i < numVisible; ++i) {
      var view = visibleViews[i].view;
      if (!this.isViewFinished(view))
        return view;
    }

    // All the visible views have rendered, try to render next/previous pages.
    if (scrolledDown) {
      var nextPageIndex = visible.last.id;
      // ID's start at 1 so no need to add 1.
      if (views[nextPageIndex] && !this.isViewFinished(views[nextPageIndex]))
        return views[nextPageIndex];
    } else {
      var previousPageIndex = visible.first.id - 2;
      if (views[previousPageIndex] &&
          !this.isViewFinished(views[previousPageIndex]))
        return views[previousPageIndex];
    }
    // Everything that needs to be rendered has been.
    return false;
  },

  isViewFinished: function pdfViewNeedsRendering(view) {
    return view.renderingState === RenderingStates.FINISHED;
  },

  // Render a page or thumbnail view. This calls the appropriate function based
  // on the views state. If the view is already rendered it will return false.
  renderView: function pdfViewRender(view, type) {
    var state = view.renderingState;
    switch (state) {
      case RenderingStates.FINISHED:
        return false;
      case RenderingStates.PAUSED:
        PDFView.highestPriorityPage = type + view.id;
        view.resume();
        break;
      case RenderingStates.RUNNING:
        PDFView.highestPriorityPage = type + view.id;
        break;
      case RenderingStates.INITIAL:
        PDFView.highestPriorityPage = type + view.id;
        view.draw(this.renderHighestPriority.bind(this));
        break;
    }
    return true;
  },

  setHash: function pdfViewSetHash(hash) {
    if (!hash)
      return;

    var pageNumber;
    if (hash.indexOf('=') >= 0) {
      var params = PDFView.parseQueryString(hash);
      // borrowing syntax from "Parameters for Opening PDF Files"
      if ('nameddest' in params) {
        PDFView.navigateTo(params.nameddest);
        return;
      }
      if ('page' in params) {
        pageNumber = (params.page | 0) || 1;
        if ('zoom' in params) {
          var zoomArgs = params.zoom.split(','); // scale,left,top
          // building destination array

          // If the zoom value, it has to get divided by 100. If it is a string,
          // it should stay as it is.
          var zoomArg = zoomArgs[0];
          var zoomArgNumber = parseFloat(zoomArg);
          if (zoomArgNumber)
            zoomArg = zoomArgNumber / 100;

          var dest = [null, {name: 'XYZ'},
                      zoomArgs.length > 1 ? (zoomArgs[1] | 0) : null,
                      zoomArgs.length > 2 ? (zoomArgs[2] | 0) : null,
                      zoomArg];
          var currentPage = this.pages[pageNumber - 1];
          currentPage.scrollIntoView(dest);
        } else {
          this.page = pageNumber; // simple page
        }
      }
      if ('pagemode' in params) {
        var toggle = document.getElementById(pdfClassPrefix + 'sidebarToggle');
        if (params.pagemode === 'thumbs' || params.pagemode === 'bookmarks') {
          if (!this.sidebarOpen) {
            toggle.click();
          }
          this.switchSidebarView(params.pagemode === 'thumbs' ?
                                 'thumbs' : 'outline');
        } else if (params.pagemode === 'none' && this.sidebarOpen) {
          toggle.click();
        }
      }
    } else if (/^\d+$/.test(hash)) { // page number
      this.page = pageNumber = hash;
    } else // named destination
      PDFView.navigateTo(unescape(hash));

    // Update the browsing history.
    PDFHistory.push({ hash: hash, page: pageNumber });
  },

  switchSidebarView: function pdfViewSwitchSidebarView(view) {
    var thumbsView = document.getElementById(pdfClassPrefix + 'thumbnailView');
    var outlineView = document.getElementById(pdfClassPrefix + 'outlineView');

    var thumbsButton = document.getElementById(pdfClassPrefix + 'viewThumbnail');
    var outlineButton = document.getElementById(pdfClassPrefix + 'viewOutline');

    switch (view) {
      case 'thumbs':
        var wasOutlineViewVisible = thumbsView.classList.contains(pdfClassPrefix + 'hidden');

        thumbsButton.classList.add(pdfClassPrefix + 'toggled');
        outlineButton.classList.remove(pdfClassPrefix + 'toggled');
        thumbsView.classList.remove(pdfClassPrefix + 'hidden');
        outlineView.classList.add(pdfClassPrefix + 'hidden');

        PDFView.renderHighestPriority();

        if (wasOutlineViewVisible) {
          // Ensure that the thumbnail of the current page is visible
          // when switching from the outline view.
          scrollIntoView(document.getElementById(pdfClassPrefix + 'thumbnailContainer' +
                                                 this.page));
        }
        break;

      case 'outline':
        thumbsButton.classList.remove(pdfClassPrefix + 'toggled');
        outlineButton.classList.add(pdfClassPrefix + 'toggled');
        thumbsView.classList.add(pdfClassPrefix + 'hidden');
        outlineView.classList.remove(pdfClassPrefix + 'hidden');

        if (outlineButton.getAttribute('disabled'))
          return;
        break;
    }
  },

  getVisiblePages: function pdfViewGetVisiblePages() {
    if (!this.isPresentationMode) {
      return this.getVisibleElements(this.container, this.pages, true);
    } else {
      // The algorithm in getVisibleElements is broken in presentation mode.
      var visible = [], page = this.page;
      var currentPage = this.pages[page - 1];
      visible.push({ id: currentPage.id, view: currentPage });

      return { first: currentPage, last: currentPage, views: visible};
    }
  },

  getVisibleThumbs: function pdfViewGetVisibleThumbs() {
    return this.getVisibleElements(this.thumbnailContainer, this.thumbnails);
  },

  // Generic helper to find out what elements are visible within a scroll pane.
  getVisibleElements: function pdfViewGetVisibleElements(
      scrollEl, views, sortByVisibility) {
    var top = scrollEl.scrollTop, bottom = top + scrollEl.clientHeight;
    var left = scrollEl.scrollLeft, right = left + scrollEl.clientWidth;

    var visible = [], view;
    var currentHeight, viewHeight, hiddenHeight, percentHeight;
    var currentWidth, viewWidth;
    for (var i = 0, ii = views.length; i < ii; ++i) {
      view = views[i];
      currentHeight = view.el.offsetTop + view.el.clientTop;
      viewHeight = view.el.clientHeight;
      if ((currentHeight + viewHeight) < top) {
        continue;
      }
      if (currentHeight > bottom) {
        break;
      }
      currentWidth = view.el.offsetLeft + view.el.clientLeft;
      viewWidth = view.el.clientWidth;
      if ((currentWidth + viewWidth) < left || currentWidth > right) {
        continue;
      }
      hiddenHeight = Math.max(0, top - currentHeight) +
                     Math.max(0, currentHeight + viewHeight - bottom);
      percentHeight = ((viewHeight - hiddenHeight) * 100 / viewHeight) | 0;

      visible.push({ id: view.id, y: currentHeight,
                     view: view, percent: percentHeight });
    }

    var first = visible[0];
    var last = visible[visible.length - 1];

    if (sortByVisibility) {
      visible.sort(function(a, b) {
        var pc = a.percent - b.percent;
        if (Math.abs(pc) > 0.001) {
          return -pc;
        }
        return a.id - b.id; // ensure stability
      });
    }
    return {first: first, last: last, views: visible};
  },

  // Helper function to parse query string (e.g. ?param1=value&parm2=...).
  parseQueryString: function pdfViewParseQueryString(query) {
    var parts = query.split('&');
    var params = {};
    for (var i = 0, ii = parts.length; i < parts.length; ++i) {
      var param = parts[i].split('=');
      var key = param[0];
      var value = param.length > 1 ? param[1] : null;
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
    return params;
  },

  beforePrint: function pdfViewSetupBeforePrint() {
    if (!this.supportsPrinting) {
      var printMessage = mozL10n.get('printing_not_supported', null,
          'Warning: Printing is not fully supported by this browser.');
      this.error(printMessage);
      return;
    }

    var alertNotReady = false;
    if (!this.pages.length) {
      alertNotReady = true;
    } else {
      for (var i = 0, ii = this.pages.length; i < ii; ++i) {
        if (!this.pages[i].pdfPage) {
          alertNotReady = true;
          break;
        }
      }
    }
    if (alertNotReady) {
      var notReadyMessage = mozL10n.get('printing_not_ready', null,
          'Warning: The PDF is not fully loaded for printing.');
      window.alert(notReadyMessage);
      return;
    }

    var body = document.querySelector('body');
    body.setAttribute('data-mozPrintCallback', true);
    for (var i = 0, ii = this.pages.length; i < ii; ++i) {
      this.pages[i].beforePrint();
    }
  },

  afterPrint: function pdfViewSetupAfterPrint() {
    var div = document.getElementById(pdfClassPrefix + 'printContainer');
    while (div.hasChildNodes())
      div.removeChild(div.lastChild);
  },

  presentationMode: function pdfViewPresentationMode() {
    var isPresentationMode = document.fullscreenElement ||
                             document.mozFullScreen ||
                             document.webkitIsFullScreen;

    if (isPresentationMode) {
      return false;
    }

    var wrapper = document.getElementById(pdfClassPrefix + 'viewerContainer');
    if (document.documentElement.requestFullscreen) {
      wrapper.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      wrapper.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullScreen) {
      wrapper.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    } else {
      return false;
    }

    document.getElementById(pdfClassPrefix + 'viewer').
      setAttribute('contextmenu', 'viewerContextMenu'); 

    this.isPresentationMode = true;
    var currentPage = this.pages[this.page - 1];
    this.previousScale = this.currentScaleValue;
    this.parseScale('page-fit', true);

    // Wait for presentation mode to take effect
    setTimeout(function() {
      currentPage.scrollIntoView();
    }, 0);

    this.showPresentationControls();
    return true;
  },

  exitPresentationMode: function pdfViewExitPresentationMode() {
    this.isPresentationMode = false;
    this.parseScale(this.previousScale);
    this.page = this.page;
    this.clearMouseScrollState();
    this.hidePresentationControls();

    // Ensure that the thumbnail of the current page is visible
    // when exiting presentation mode.
    scrollIntoView(document.getElementById(pdfClassPrefix + 'thumbnailContainer' + this.page));
  },

  showPresentationControls: function pdfViewShowPresentationControls() {
    var DELAY_BEFORE_HIDING_CONTROLS = 3000;
    var wrapper = document.getElementById(pdfClassPrefix + 'viewerContainer');
    if (this.presentationControlsTimeout) {
      clearTimeout(this.presentationControlsTimeout);
    } else {
      wrapper.classList.add(pdfClassPrefix + 'presentationControls');
    }
    this.presentationControlsTimeout = setTimeout(function hideControls() {
      wrapper.classList.remove(pdfClassPrefix + 'presentationControls');
      delete PDFView.presentationControlsTimeout;
    }, DELAY_BEFORE_HIDING_CONTROLS);
  },

  hidePresentationControls: function pdfViewShowPresentationControls() {
    if (!this.presentationControlsTimeout) {
      return;
    }
    clearTimeout(this.presentationControlsTimeout);
    delete this.presentationControlsTimeout;

    var wrapper = document.getElementById(pdfClassPrefix + 'viewerContainer');
    wrapper.classList.remove(pdfClassPrefix + 'presentationControls');
  },

  rotatePages: function pdfViewPageRotation(delta) {

    this.pageRotation = (this.pageRotation + 360 + delta) % 360;

    for (var i = 0, l = this.pages.length; i < l; i++) {
      var page = this.pages[i];
      page.update(page.scale, this.pageRotation);
    }

    for (var i = 0, l = this.thumbnails.length; i < l; i++) {
      var thumb = this.thumbnails[i];
      thumb.update(this.pageRotation);
    }

    this.parseScale(this.currentScaleValue, true);

    this.renderHighestPriority();

    var currentPage = this.pages[this.page - 1];
    if (!currentPage) {
      return;
    }

    // Wait for presentation mode to take effect
    setTimeout(function() {
      currentPage.scrollIntoView();
    }, 0);
  },

  /**
   * This function flips the page in presentation mode if the user scrolls up
   * or down with large enough motion and prevents page flipping too often.
   *
   * @this {PDFView}
   * @param {number} mouseScrollDelta The delta value from the mouse event.
   */
  mouseScroll: function pdfViewMouseScroll(mouseScrollDelta) {
    var MOUSE_SCROLL_COOLDOWN_TIME = 50;

    var currentTime = (new Date()).getTime();
    var storedTime = this.mouseScrollTimeStamp;

    // In case one page has already been flipped there is a cooldown time
    // which has to expire before next page can be scrolled on to.
    if (currentTime > storedTime &&
        currentTime - storedTime < MOUSE_SCROLL_COOLDOWN_TIME)
      return;

    // In case the user decides to scroll to the opposite direction than before
    // clear the accumulated delta.
    if ((this.mouseScrollDelta > 0 && mouseScrollDelta < 0) ||
        (this.mouseScrollDelta < 0 && mouseScrollDelta > 0))
      this.clearMouseScrollState();

    this.mouseScrollDelta += mouseScrollDelta;

    var PAGE_FLIP_THRESHOLD = 120;
    if (Math.abs(this.mouseScrollDelta) >= PAGE_FLIP_THRESHOLD) {

      var PageFlipDirection = {
        UP: -1,
        DOWN: 1
      };

      // In presentation mode scroll one page at a time.
      var pageFlipDirection = (this.mouseScrollDelta > 0) ?
                                PageFlipDirection.UP :
                                PageFlipDirection.DOWN;
      this.clearMouseScrollState();
      var currentPage = this.page;

      // In case we are already on the first or the last page there is no need
      // to do anything.
      if ((currentPage == 1 && pageFlipDirection == PageFlipDirection.UP) ||
          (currentPage == this.pages.length &&
           pageFlipDirection == PageFlipDirection.DOWN))
        return;

      this.page += pageFlipDirection;
      this.mouseScrollTimeStamp = currentTime;
    }
  },

  /**
   * This function clears the member attributes used with mouse scrolling in
   * presentation mode.
   *
   * @this {PDFView}
   */
  clearMouseScrollState: function pdfViewClearMouseScrollState() {
    this.mouseScrollTimeStamp = 0;
    this.mouseScrollDelta = 0;
  }
};

var PageView = function pageView(container, id, scale, navigateTo, defaultViewport) {
  this.id = id;

  this.rotation = 0;
  this.scale = scale || 1.0;
  this.viewport = defaultViewport;
  this.pdfPageRotate = defaultViewport.rotate;

  this.renderingState = RenderingStates.INITIAL;
  this.resume = null;

  this.textContent = null;
  this.textLayer = null;

  var anchor = document.createElement('a');
  anchor.name = '' + this.id;

  var div = this.el = document.createElement('div');
  div.id = pdfClassPrefix + 'pageContainer' + this.id;
  div.className = pdfClassPrefix + 'page';
  div.style.width = Math.floor(this.viewport.width) + 'px';
  div.style.height = Math.floor(this.viewport.height) + 'px';

  container.appendChild(anchor);
  container.appendChild(div);

  this.setPdfPage = function pageViewSetPdfPage(pdfPage) {
    this.pdfPage = pdfPage;
    this.pdfPageRotate = pdfPage.rotate;
    this.viewport = pdfPage.getViewport(this.scale);
    this.stats = pdfPage.stats;
    this.update();
  };

  this.destroy = function pageViewDestroy() {
    this.update();
    if (this.pdfPage) {
      this.pdfPage.destroy();
    }
  };

  this.update = function pageViewUpdate(scale, rotation) {
    this.renderingState = RenderingStates.INITIAL;
    this.resume = null;

    if (typeof rotation !== 'undefined') {
      this.rotation = rotation;
    }

    this.scale = scale || this.scale;

    var totalRotation = (this.rotation + this.pdfPageRotate) % 360;
    this.viewport = this.viewport.clone({
      scale: this.scale,
      rotation: totalRotation
    });

    div.style.width = Math.floor(this.viewport.width) + 'px';
    div.style.height = Math.floor(this.viewport.height) + 'px';

    while (div.hasChildNodes())
      div.removeChild(div.lastChild);
    div.removeAttribute('data-loaded');

    delete this.canvas;

    this.loadingIconDiv = document.createElement('div');
    this.loadingIconDiv.className = pdfClassPrefix + 'loadingIcon';
    div.appendChild(this.loadingIconDiv);
  };

  Object.defineProperty(this, 'width', {
    get: function PageView_getWidth() {
      return this.viewport.width;
    },
    enumerable: true
  });

  Object.defineProperty(this, 'height', {
    get: function PageView_getHeight() {
      return this.viewport.height;
    },
    enumerable: true
  });

  function setupAnnotations(annotationsDiv, pdfPage, viewport) {

    function bindLink(link, dest) {
      link.href = PDFView.getDestinationHash(dest);
      link.onclick = function pageViewSetupLinksOnclick() {
        if (dest)
          PDFView.navigateTo(dest);
        return false;
      };
      link.className = pdfClassPrefix + 'internalLink';
    }

    pdfPage.getAnnotations().then(function(annotationsData) {
      viewport = viewport.clone({ dontFlip: true });
      for (var i = 0; i < annotationsData.length; i++) {
        var data = annotationsData[i];
        var annotation = PDFJS.Annotation.fromData(data);
        if (!annotation || !annotation.hasHtml()) {
          continue;
        }

        var element = annotation.getHtmlElement(pdfPage.commonObjs);
        mozL10n.translate(element);

        data = annotation.getData();
        var rect = data.rect;
        var view = pdfPage.view;
        rect = PDFJS.Util.normalizeRect([
          rect[0],
          view[3] - rect[1] + view[1],
          rect[2],
          view[3] - rect[3] + view[1]
        ]);
        element.style.left = rect[0] + 'px';
        element.style.top = rect[1] + 'px';
        element.style.position = 'absolute';

        var transform = viewport.transform;
        var transformStr = 'matrix(' + transform.join(',') + ')';
        CustomStyle.setProp('transform', element, transformStr);
        var transformOriginStr = -rect[0] + 'px ' + -rect[1] + 'px';
        CustomStyle.setProp('transformOrigin', element, transformOriginStr);

        if (data.subtype === 'Link' && !data.url) {
          bindLink(element, ('dest' in data) ? data.dest : null);
        }

        annotationsDiv.appendChild(element);
      }
    });
  }

  this.getPagePoint = function pageViewGetPagePoint(x, y) {
    return this.viewport.convertToPdfPoint(x, y);
  };

  this.scrollIntoView = function pageViewScrollIntoView(dest) {
      if (!dest) {
        scrollIntoView(div);
        return;
      }
      if (PDFView.isPresentationMode) { // Avoid breaking presentation mode.
        PDFView.page = id;
        return;
      }

      var x = 0, y = 0;
      var width = 0, height = 0, widthScale, heightScale;
      var scale = 0;
      switch (dest[1].name) {
        case 'XYZ':
          x = dest[2];
          y = dest[3];
          scale = dest[4];
          // If x and/or y coordinates are not supplied, default to
          // _top_ left of the page (not the obvious bottom left,
          // since aligning the bottom of the intended page with the
          // top of the window is rarely helpful).
          x = x !== null ? x : 0;
          y = y !== null ? y : this.height / this.scale;
          break;
        case 'Fit':
        case 'FitB':
          scale = 'page-fit';
          break;
        case 'FitH':
        case 'FitBH':
          y = dest[2];
          scale = 'page-width';
          break;
        case 'FitV':
        case 'FitBV':
          x = dest[2];
          scale = 'page-height';
          break;
        case 'FitR':
          x = dest[2];
          y = dest[3];
          width = dest[4] - x;
          height = dest[5] - y;
          widthScale = (this.container.clientWidth - SCROLLBAR_PADDING) /
            width / CSS_UNITS;
          heightScale = (this.container.clientHeight - SCROLLBAR_PADDING) /
            height / CSS_UNITS;
          scale = Math.min(widthScale, heightScale);
          break;
        default:
          return;
      }

      if (scale && scale !== PDFView.currentScale) {
        PDFView.parseScale(scale, true, true);
      } else if (PDFView.currentScale === UNKNOWN_SCALE) {
        PDFView.parseScale(DEFAULT_SCALE, true, true);
      }

      if (scale === 'page-fit' && !dest[4]) {
        scrollIntoView(div);
        return;
      }

      var boundingRect = [
        this.viewport.convertToViewportPoint(x, y),
        this.viewport.convertToViewportPoint(x + width, y + height)
      ];
      setTimeout(function pageViewScrollIntoViewRelayout() {
        // letting page to re-layout before scrolling
        var scale = PDFView.currentScale;
        var x = Math.min(boundingRect[0][0], boundingRect[1][0]);
        var y = Math.min(boundingRect[0][1], boundingRect[1][1]);
        var width = Math.abs(boundingRect[0][0] - boundingRect[1][0]);
        var height = Math.abs(boundingRect[0][1] - boundingRect[1][1]);

        scrollIntoView(div, {left: x, top: y, width: width, height: height});
      }, 0);
  };

  this.getTextContent = function pageviewGetTextContent() {
    if (!this.textContent) {
      this.textContent = this.pdfPage.getTextContent();
    }
    return this.textContent;
  };

  this.draw = function pageviewDraw(callback) {
    var pdfPage = this.pdfPage;

    if (!pdfPage) {
      var promise = PDFView.getPage(this.id);
      promise.then(function(pdfPage) {
        this.setPdfPage(pdfPage);
        this.draw(callback);
      }.bind(this));
      return;
    }

    if (this.renderingState !== RenderingStates.INITIAL) {
      console.error('Must be in new state before drawing');
    }

    this.renderingState = RenderingStates.RUNNING;

    var canvas = document.createElement('canvas');
    canvas.id = 'page' + this.id;
    div.appendChild(canvas);
    this.canvas = canvas;

    var scale = this.scale, viewport = this.viewport;
    var outputScale = PDFView.getOutputScale();
    canvas.width = Math.floor(viewport.width) * outputScale.sx;
    canvas.height = Math.floor(viewport.height) * outputScale.sy;

    var textLayerDiv = null;
    if (!PDFJS.disableTextLayer) {
      textLayerDiv = document.createElement('div');
      textLayerDiv.className = pdfClassPrefix + 'textLayer';
      textLayerDiv.style.width = canvas.width + 'px';
      textLayerDiv.style.height = canvas.height + 'px';
      div.appendChild(textLayerDiv);
    }
    var textLayer = this.textLayer =
          textLayerDiv ? new TextLayerBuilder(textLayerDiv, this.id - 1) : null;

    if (outputScale.scaled) {
      var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' +
                                (1 / outputScale.sy) + ')';
      CustomStyle.setProp('transform' , canvas, cssScale);
      CustomStyle.setProp('transformOrigin' , canvas, '0% 0%');
      if (textLayerDiv) {
        CustomStyle.setProp('transform' , textLayerDiv, cssScale);
        CustomStyle.setProp('transformOrigin' , textLayerDiv, '0% 0%');
      }
    }

    var ctx = canvas.getContext('2d');
    // TODO(mack): use data attributes to store these
    ctx._scaleX = outputScale.sx;
    ctx._scaleY = outputScale.sy;
    if (outputScale.scaled) {
      ctx.scale(outputScale.sx, outputScale.sy);
    }
    //#if (FIREFOX || MOZCENTRAL)
    //  // Checking if document fonts are used only once
    //  var checkIfDocumentFontsUsed = !PDFView.pdfDocument.embeddedFontsUsed;
    //#endif

    // Rendering area

    var self = this;
    var renderingWasReset = false;
    function pageViewDrawCallback(error) {
      if (renderingWasReset) {
        return;
      }

      self.renderingState = RenderingStates.FINISHED;

      if (self.loadingIconDiv) {
        div.removeChild(self.loadingIconDiv);
        delete self.loadingIconDiv;
      }

      //#if (FIREFOX || MOZCENTRAL)
      //    if (checkIfDocumentFontsUsed && PDFView.pdfDocument.embeddedFontsUsed &&
      //        !PDFView.supportsDocumentFonts) {
      //      console.error(mozL10n.get('web_fonts_disabled', null,
      //        'Web fonts are disabled: unable to use embedded PDF fonts.'));
      //      PDFView.fallback();
      //    }
      //    if (self.textLayer && self.textLayer.textDivs &&
      //        self.textLayer.textDivs.length > 0 &&
      //        !PDFView.supportsDocumentColors) {
      //      console.error(mozL10n.get('document_colors_disabled', null,
      //        'PDF documents are not allowed to use their own colors: ' +
      //        '\'Allow pages to choose their own colors\' ' +
      //        'is deactivated in the browser.'));
      //      PDFView.fallback();
      //    }
      //#endif
      if (error) {
        PDFView.error(mozL10n.get('rendering_error', null,
          'An error occurred while rendering the page.'), error);
      }

      self.stats = pdfPage.stats;
      self.updateStats();
      if (self.onAfterDraw)
        self.onAfterDraw();

      cache.push(self);

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('pagerender', true, true, {
        pageNumber: pdfPage.pageNumber
      });
      div.dispatchEvent(event);

      callback();
    }

    var renderContext = {
      canvasContext: ctx,
      viewport: this.viewport,
      textLayer: textLayer,
      continueCallback: function pdfViewcContinueCallback(cont) {
        if (self.renderingState === RenderingStates.INITIAL) {
          // The page update() was called, we just need to abort any rendering.
          renderingWasReset = true;
          return;
        }

        if (PDFView.highestPriorityPage !== 'page' + self.id) {
          self.renderingState = RenderingStates.PAUSED;
          self.resume = function resumeCallback() {
            self.renderingState = RenderingStates.RUNNING;
            cont();
          };
          return;
        }
        cont();
      }
    };
    this.pdfPage.render(renderContext).then(
      function pdfPageRenderCallback() {
        pageViewDrawCallback(null);
      },
      function pdfPageRenderError(error) {
        pageViewDrawCallback(error);
      }
    );

    if (textLayer) {
      this.getTextContent().then(
        function textContentResolved(textContent) {
          textLayer.setTextContent(textContent);
        }
      );
    }

    setupAnnotations(div, pdfPage, this.viewport);
    div.setAttribute('data-loaded', true);
  };

  this.beforePrint = function pageViewBeforePrint() {
    var pdfPage = this.pdfPage;

    var viewport = pdfPage.getViewport(1);
    // Use the same hack we use for high dpi displays for printing to get better
    // output until bug 811002 is fixed in FF.
    var PRINT_OUTPUT_SCALE = 2;
    var canvas = this.canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width) * PRINT_OUTPUT_SCALE;
    canvas.height = Math.floor(viewport.height) * PRINT_OUTPUT_SCALE;
    canvas.style.width = (PRINT_OUTPUT_SCALE * viewport.width) + 'pt';
    canvas.style.height = (PRINT_OUTPUT_SCALE * viewport.height) + 'pt';
    var cssScale = 'scale(' + (1 / PRINT_OUTPUT_SCALE) + ', ' +
                              (1 / PRINT_OUTPUT_SCALE) + ')';
    CustomStyle.setProp('transform' , canvas, cssScale);
    CustomStyle.setProp('transformOrigin' , canvas, '0% 0%');

    var printContainer = document.getElementById(pdfClassPrefix + 'printContainer');
    printContainer.appendChild(canvas);

    var self = this;
    canvas.mozPrintCallback = function(obj) {
      var ctx = obj.context;

      ctx.save();
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.scale(PRINT_OUTPUT_SCALE, PRINT_OUTPUT_SCALE);

      var renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      pdfPage.render(renderContext).then(function() {
        // Tell the printEngine that rendering this canvas/page has finished.
        obj.done();
        self.pdfPage.destroy();
      }, function(error) {
        console.error(error);
        // Tell the printEngine that rendering this canvas/page has failed.
        // This will make the print proces stop.
        if ('abort' in obj)
          obj.abort();
        else
          obj.done();
        self.pdfPage.destroy();
      });
    };
  };

  this.updateStats = function pageViewUpdateStats() {
    if (!this.stats) {
      return;
    }

    if (PDFJS.pdfBug && Stats.enabled) {
      var stats = this.stats;
      Stats.add(this.id, stats);
    }
  };
};

var ThumbnailView = function thumbnailView(container, id, defaultViewport) {
  var anchor = document.createElement('a');
  anchor.href = PDFView.getAnchorUrl('#page=' + id);
  anchor.title = mozL10n.get('thumb_page_title', {page: id}, 'Page {{page}}');
  anchor.onclick = function stopNavigation() {
    PDFView.page = id;
    return false;
  };


  this.pdfPage = undefined;
  this.viewport = defaultViewport;
  this.pdfPageRotate = defaultViewport.rotate;

  this.rotation = 0;
  this.pageWidth = this.viewport.width;
  this.pageHeight = this.viewport.height;
  this.pageRatio = this.pageWidth / this.pageHeight;
  this.id = id;

  this.canvasWidth = 98;
  this.canvasHeight = this.canvasWidth / this.pageWidth * this.pageHeight;
  this.scale = (this.canvasWidth / this.pageWidth);

  var div = this.el = document.createElement('div');
  div.id = 'thumbnailContainer' + id;
  div.className = pdfClassPrefix + 'thumbnail';

  if (id === 1) {
    // Highlight the thumbnail of the first page when no page number is
    // specified (or exists in cache) when the document is loaded.
    div.classList.add(pdfClassPrefix + 'selected');
  }

  var ring = document.createElement('div');
  ring.className = pdfClassPrefix + 'thumbnailSelectionRing';
  ring.style.width = this.canvasWidth + 'px';
  ring.style.height = this.canvasHeight + 'px';

  div.appendChild(ring);
  anchor.appendChild(div);
  container.appendChild(anchor);

  this.hasImage = false;
  this.renderingState = RenderingStates.INITIAL;

  this.setPdfPage = function thumbnailViewSetPdfPage(pdfPage) {
    this.pdfPage = pdfPage;
    this.pdfPageRotate = pdfPage.rotate;
    this.viewport = pdfPage.getViewport(1);
    this.update();
  };

  this.update = function thumbnailViewUpdate(rot) {
    if (!this.pdfPage) {
      return;
    }

    if (rot !== undefined) {
      this.rotation = rot;
    }

    var totalRotation = (this.rotation + this.pdfPage.rotate) % 360;
    this.viewport = this.viewport.clone({
      scale: 1,
      rotation: totalRotation
    });
    this.pageWidth = this.viewport.width;
    this.pageHeight = this.viewport.height;
    this.pageRatio = this.pageWidth / this.pageHeight;

    this.canvasHeight = this.canvasWidth / this.pageWidth * this.pageHeight;
    this.scale = (this.canvasWidth / this.pageWidth);

    div.removeAttribute('data-loaded');
    ring.textContent = '';
    ring.style.width = this.canvasWidth + 'px';
    ring.style.height = this.canvasHeight + 'px';

    this.hasImage = false;
    this.renderingState = RenderingStates.INITIAL;
    this.resume = null;
  };

  this.getPageDrawContext = function thumbnailViewGetPageDrawContext() {
    var canvas = document.createElement('canvas');
    canvas.id = 'thumbnail' + id;

    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    canvas.className = pdfClassPrefix + 'thumbnailImage';
    canvas.setAttribute('aria-label', mozL10n.get('thumb_page_canvas',
      {page: id}, 'Thumbnail of Page {{page}}'));

    div.setAttribute('data-loaded', true);

    ring.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();
    return ctx;
  };

  this.drawingRequired = function thumbnailViewDrawingRequired() {
    return !this.hasImage;
  };

  this.draw = function thumbnailViewDraw(callback) {
    if (!this.pdfPage) {
      var promise = PDFView.getPage(this.id);
      promise.then(function(pdfPage) {
        this.setPdfPage(pdfPage);
        this.draw(callback);
      }.bind(this));
      return;
    }

    if (this.renderingState !== RenderingStates.INITIAL) {
      console.error('Must be in new state before drawing');
    }

    this.renderingState = RenderingStates.RUNNING;
    if (this.hasImage) {
      callback();
      return;
    }

    var self = this;
    var ctx = this.getPageDrawContext();
    var drawViewport = this.viewport.clone({ scale: this.scale });
    var renderContext = {
      canvasContext: ctx,
      viewport: drawViewport,
      continueCallback: function(cont) {
        if (PDFView.highestPriorityPage !== 'thumbnail' + self.id) {
          self.renderingState = RenderingStates.PAUSED;
          self.resume = function() {
            self.renderingState = RenderingStates.RUNNING;
            cont();
          };
          return;
        }
        cont();
      }
    };
    this.pdfPage.render(renderContext).then(
      function pdfPageRenderCallback() {
        self.renderingState = RenderingStates.FINISHED;
        callback();
      },
      function pdfPageRenderError(error) {
        self.renderingState = RenderingStates.FINISHED;
        callback();
      }
    );
    this.hasImage = true;
  };

  this.setImage = function thumbnailViewSetImage(img) {
    if (this.hasImage || !img)
      return;
    this.renderingState = RenderingStates.FINISHED;
    var ctx = this.getPageDrawContext();
    ctx.drawImage(img, 0, 0, img.width, img.height,
                  0, 0, ctx.canvas.width, ctx.canvas.height);

    this.hasImage = true;
  };
};

var DocumentOutlineView = function documentOutlineView(outline) {
  var outlineView = document.getElementById(pdfClassPrefix + 'outlineView');
  var outlineButton = document.getElementById(pdfClassPrefix + 'viewOutline');
  while (outlineView.firstChild)
    outlineView.removeChild(outlineView.firstChild);

  if (!outline) {
    if (!outlineView.classList.contains(pdfClassPrefix + 'hidden'))
      PDFView.switchSidebarView('thumbs');

    return;
  }

  function bindItemLink(domObj, item) {
    domObj.href = PDFView.getDestinationHash(item.dest);
    domObj.onclick = function documentOutlineViewOnclick(e) {
      PDFView.navigateTo(item.dest);
      return false;
    };
  }


  var queue = [{parent: outlineView, items: outline}];
  while (queue.length > 0) {
    var levelData = queue.shift();
    var i, n = levelData.items.length;
    for (i = 0; i < n; i++) {
      var item = levelData.items[i];
      var div = document.createElement('div');
      div.className = pdfClassPrefix + 'outlineItem';
      var a = document.createElement('a');
      bindItemLink(a, item);
      a.textContent = item.title;
      div.appendChild(a);

      if (item.items.length > 0) {
        var itemsDiv = document.createElement('div');
        itemsDiv.className = pdfClassPrefix + 'outlineItems';
        div.appendChild(itemsDiv);
        queue.push({parent: itemsDiv, items: item.items});
      }

      levelData.parent.appendChild(div);
    }
  }
};

var TextLayerBuilder = function textLayerBuilder(textLayerDiv, pageIdx) {
  var textLayerFrag = document.createDocumentFragment();

  this.textLayerDiv = textLayerDiv;
  this.layoutDone = false;
  this.divContentDone = false;
  this.pageIdx = pageIdx;
  this.matches = [];

  this.beginLayout = function textLayerBuilderBeginLayout() {
    this.textDivs = [];
    this.renderingDone = false;
  };

  this.endLayout = function textLayerBuilderEndLayout() {
    this.layoutDone = true;
    this.insertDivContent();
  };

  this.renderLayer = function textLayerBuilderRenderLayer() {
    var self = this;
    var textDivs = this.textDivs;
    var bidiTexts = this.textContent.bidiTexts;
    var textLayerDiv = this.textLayerDiv;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // No point in rendering so many divs as it'd make the browser unusable
    // even after the divs are rendered
    var MAX_TEXT_DIVS_TO_RENDER = 100000;
    if (textDivs.length > MAX_TEXT_DIVS_TO_RENDER)
      return;

    for (var i = 0, ii = textDivs.length; i < ii; i++) {
      var textDiv = textDivs[i];
      if ('isWhitespace' in textDiv.dataset) {
        continue;
      }
      textLayerFrag.appendChild(textDiv);

      ctx.font = textDiv.style.fontSize + ' ' + textDiv.style.fontFamily;
      var width = ctx.measureText(textDiv.textContent).width;

      if (width > 0) {
        var textScale = textDiv.dataset.canvasWidth / width;

        var transform = 'scale(' + textScale + ', 1)';
        if (bidiTexts[i].dir === 'ttb') {
          transform = 'rotate(90deg) ' + transform;
        }
        CustomStyle.setProp('transform' , textDiv, transform);
        CustomStyle.setProp('transformOrigin' , textDiv, '0% 0%');

        textLayerDiv.appendChild(textDiv);
      }
    }

    this.renderingDone = true;
    this.updateMatches();

    textLayerDiv.appendChild(textLayerFrag);
  };

  this.setupRenderLayoutTimer = function textLayerSetupRenderLayoutTimer() {
    // Schedule renderLayout() if user has been scrolling, otherwise
    // run it right away
    var RENDER_DELAY = 200; // in ms
    var self = this;
    if (Date.now() - PDFView.lastScroll > RENDER_DELAY) {
      // Render right away
      this.renderLayer();
    } else {
      // Schedule
      if (this.renderTimer)
        clearTimeout(this.renderTimer);
      this.renderTimer = setTimeout(function() {
        self.setupRenderLayoutTimer();
      }, RENDER_DELAY);
    }
  };

  this.appendText = function textLayerBuilderAppendText(geom) {
    var textDiv = document.createElement('div');

    // vScale and hScale already contain the scaling to pixel units
    var fontHeight = geom.fontSize * Math.abs(geom.vScale);
    textDiv.dataset.canvasWidth = geom.canvasWidth * geom.hScale;
    textDiv.dataset.fontName = geom.fontName;

    textDiv.style.fontSize = fontHeight + 'px';
    textDiv.style.fontFamily = geom.fontFamily;
    textDiv.style.left = geom.x + 'px';
    textDiv.style.top = (geom.y - fontHeight) + 'px';

    // The content of the div is set in the `setTextContent` function.

    this.textDivs.push(textDiv);
  };

  this.insertDivContent = function textLayerUpdateTextContent() {
    // Only set the content of the divs once layout has finished, the content
    // for the divs is available and content is not yet set on the divs.
    if (!this.layoutDone || this.divContentDone || !this.textContent)
      return;

    this.divContentDone = true;

    var textDivs = this.textDivs;
    var bidiTexts = this.textContent.bidiTexts;

    for (var i = 0; i < bidiTexts.length; i++) {
      var bidiText = bidiTexts[i];
      var textDiv = textDivs[i];
      if (!/\S/.test(bidiText.str)) {
        textDiv.dataset.isWhitespace = true;
        continue;
      }

      textDiv.textContent = bidiText.str;
      // bidiText.dir may be 'ttb' for vertical texts.
      textDiv.dir = bidiText.dir === 'rtl' ? 'rtl' : 'ltr';
    }

    this.setupRenderLayoutTimer();
  };

  this.setTextContent = function textLayerBuilderSetTextContent(textContent) {
    this.textContent = textContent;
    this.insertDivContent();
  };

  this.convertMatches = function textLayerBuilderConvertMatches(matches) {
    var i = 0;
    var iIndex = 0;
    var bidiTexts = this.textContent.bidiTexts;
    var end = bidiTexts.length - 1;
    var queryLen = PDFFindController.state.query.length;

    var lastDivIdx = -1;
    var pos;

    var ret = [];

    // Loop over all the matches.
    for (var m = 0; m < matches.length; m++) {
      var matchIdx = matches[m];
      // # Calculate the begin position.

      // Loop over the divIdxs.
      while (i !== end && matchIdx >= (iIndex + bidiTexts[i].str.length)) {
        iIndex += bidiTexts[i].str.length;
        i++;
      }

      // TODO: Do proper handling here if something goes wrong.
      if (i == bidiTexts.length) {
        console.error('Could not find matching mapping');
      }

      var match = {
        begin: {
          divIdx: i,
          offset: matchIdx - iIndex
        }
      };

      // # Calculate the end position.
      matchIdx += queryLen;

      // Somewhat same array as above, but use a > instead of >= to get the end
      // position right.
      while (i !== end && matchIdx > (iIndex + bidiTexts[i].str.length)) {
        iIndex += bidiTexts[i].str.length;
        i++;
      }

      match.end = {
        divIdx: i,
        offset: matchIdx - iIndex
      };
      ret.push(match);
    }

    return ret;
  };

  this.renderMatches = function textLayerBuilder_renderMatches(matches) {
    // Early exit if there is nothing to render.
    if (matches.length === 0) {
      return;
    }

    var bidiTexts = this.textContent.bidiTexts;
    var textDivs = this.textDivs;
    var prevEnd = null;
    var isSelectedPage = this.pageIdx === PDFFindController.selected.pageIdx;
    var selectedMatchIdx = PDFFindController.selected.matchIdx;
    var highlightAll = PDFFindController.state.highlightAll;

    var infty = {
      divIdx: -1,
      offset: undefined
    };

    function beginText(begin, className) {
      var divIdx = begin.divIdx;
      var div = textDivs[divIdx];
      div.textContent = '';

      var content = bidiTexts[divIdx].str.substring(0, begin.offset);
      var node = document.createTextNode(content);
      if (className) {
        var isSelected = isSelectedPage &&
                          divIdx === selectedMatchIdx;
        var span = document.createElement('span');
        span.className = className + (isSelected ? ' selected' : '');
        span.appendChild(node);
        div.appendChild(span);
        return;
      }
      div.appendChild(node);
    }

    function appendText(from, to, className) {
      var divIdx = from.divIdx;
      var div = textDivs[divIdx];

      var content = bidiTexts[divIdx].str.substring(from.offset, to.offset);
      var node = document.createTextNode(content);
      if (className) {
        var span = document.createElement('span');
        span.className = className;
        span.appendChild(node);
        div.appendChild(span);
        return;
      }
      div.appendChild(node);
    }

    function highlightDiv(divIdx, className) {
      textDivs[divIdx].className = className;
    }

    var i0 = selectedMatchIdx, i1 = i0 + 1, i;

    if (highlightAll) {
      i0 = 0;
      i1 = matches.length;
    } else if (!isSelectedPage) {
      // Not highlighting all and this isn't the selected page, so do nothing.
      return;
    }

    for (i = i0; i < i1; i++) {
      var match = matches[i];
      var begin = match.begin;
      var end = match.end;

      var isSelected = isSelectedPage && i === selectedMatchIdx;
      var highlightSuffix = (isSelected ? ' pdf-selected' : '');
      if (isSelected)
        scrollIntoView(textDivs[begin.divIdx], {top: -50});

      // Match inside new div.
      if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
        // If there was a previous div, then add the text at the end
        if (prevEnd !== null) {
          appendText(prevEnd, infty);
        }
        // clears the divs and set the content until the begin point.
        beginText(begin);
      } else {
        appendText(prevEnd, begin);
      }

      if (begin.divIdx === end.divIdx) {
        appendText(begin, end, 'pdf-highlight' + highlightSuffix);
      } else {
        appendText(begin, infty, 'pdf-highlight pdf-begin' + highlightSuffix);
        for (var n = begin.divIdx + 1; n < end.divIdx; n++) {
          highlightDiv(n, 'pdf-highlight pdf-middle' + highlightSuffix);
        }
        beginText(end, 'pdf-highlight pdf-end' + highlightSuffix);
      }
      prevEnd = end;
    }

    if (prevEnd) {
      appendText(prevEnd, infty);
    }
  };

  this.updateMatches = function textLayerUpdateMatches() {
    // Only show matches, once all rendering is done.
    if (!this.renderingDone)
      return;

    // Clear out all matches.
    var matches = this.matches;
    var textDivs = this.textDivs;
    var bidiTexts = this.textContent.bidiTexts;
    var clearedUntilDivIdx = -1;

    // Clear out all current matches.
    for (var i = 0; i < matches.length; i++) {
      var match = matches[i];
      var begin = Math.max(clearedUntilDivIdx, match.begin.divIdx);
      for (var n = begin; n <= match.end.divIdx; n++) {
        var div = textDivs[n];
        div.textContent = bidiTexts[n].str;
        div.className = '';
      }
      clearedUntilDivIdx = match.end.divIdx + 1;
    }

    if (!PDFFindController.active)
      return;

    // Convert the matches on the page controller into the match format used
    // for the textLayer.
    this.matches = matches =
      this.convertMatches(PDFFindController.pageMatches[this.pageIdx] || []);

    this.renderMatches(this.matches);
  };
};

document.addEventListener('DOMContentLoaded', function (evt) {
  ///// not used, we use an API
  //webViewerLoad(evt);
}, true);

var pdfClassPrefix = '';

function webViewerLoad(fileLocation, classPrefix) {
  pdfClassPrefix = classPrefix
  PDFView.initialize();
  var params = PDFView.parseQueryString(document.location.search.substring(1));

  //#if !(FIREFOX || MOZCENTRAL)
  var file = fileLocation || params.file || DEFAULT_URL;
  //#else
  //var file = window.location.toString()
  //#endif

  //#if !(FIREFOX || MOZCENTRAL)
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    if (document.getElementById('pdf-openFile')) {
      document.getElementById('pdf-openFile').setAttribute('hidden', 'true');
      document.getElementById('pdf-secondaryOpenFile').setAttribute('hidden', 'true');
    }
  } else {
    if (document.getElementById('pdf-fileInput'))
      document.getElementById('pdf-fileInput').value = null;
  }
  //#else
  //document.getElementById('pdf-openFile').setAttribute('hidden', 'true');
  //document.getElementById('pdf-secondaryOpenFile').setAttribute('hidden', 'true');
  //#endif

  // Special debugging flags in the hash section of the URL.
  var hash = document.location.hash.substring(1);
  var hashParams = PDFView.parseQueryString(hash);

  if ('disableWorker' in hashParams) {
    PDFJS.disableWorker = (hashParams['disableWorker'] === 'true');
  }

  if ('disableRange' in hashParams) {
    PDFJS.disableRange = (hashParams['disableRange'] === 'true');
  }

  if ('disableAutoFetch' in hashParams) {
    PDFJS.disableAutoFetch = (hashParams['disableAutoFetch'] === 'true');
  }

  //#if !(FIREFOX || MOZCENTRAL)
  var locale = navigator.language;
  if ('locale' in hashParams)
    locale = hashParams['locale'];
  mozL10n.setLanguage(locale);
  //#endif

  if ('textLayer' in hashParams) {
    switch (hashParams['textLayer']) {
      case 'off':
        PDFJS.disableTextLayer = true;
        break;
      case 'visible':
      case 'shadow':
      case 'hover':
        var viewer = document.getElementById(pdfClassPrefix + 'viewer');
        viewer.classList.add(pdfClassPrefix + 'textLayer-' + hashParams['textLayer']);
        break;
    }
  }

  //#if !(FIREFOX || MOZCENTRAL)
  if ('pdfBug' in hashParams) {
  //#else
  //if ('pdfBug' in hashParams && FirefoxCom.requestSync('pdfBugEnabled')) {
  //#endif
    PDFJS.pdfBug = true;
    var pdfBug = hashParams['pdfBug'];
    var enabled = pdfBug.split(',');
    PDFBug.enable(enabled);
    PDFBug.init();
  }

  if (!PDFView.supportsPrinting) {
    document.getElementById(pdfClassPrefix + 'print').classList.add(pdfClassPrefix + 'hidden');
    document.getElementById(pdfClassPrefix + 'secondaryPrint').classList.add(pdfClassPrefix + 'hidden');
  }

  if (!PDFView.supportsFullscreen) {
    document.getElementById(pdfClassPrefix + 'presentationMode').classList.add(pdfClassPrefix + 'hidden');
    document.getElementById(pdfClassPrefix + 'secondaryPresentationMode').
      classList.add(pdfClassPrefix + 'hidden');
  }

  if (PDFView.supportsIntegratedFind) {
    document.getElementById(pdfClassPrefix + 'viewFind').classList.add(pdfClassPrefix + 'hidden');
  }

  // Listen for warnings to trigger the fallback UI.  Errors should be caught
  // and call PDFView.error() so we don't need to listen for those.
  PDFJS.LogManager.addLogger({
    warn: function() {
      PDFView.fallback();
    }
  });

  var addListenerToId = function (string, event, cb) {
    var el = document.getElementById(string);
    if (el)
      return el.addEventListener(event, cb);
    else
      return {};
  }

  var mainContainer = document.getElementById(pdfClassPrefix + 'mainContainer');
  var outerContainer = document.getElementById(pdfClassPrefix + 'outerContainer');
  var secondaryToolbar = document.getElementById(pdfClassPrefix + 'secondaryToolbar'); 
  mainContainer.addEventListener('transitionend', function(e) {
    if (e.target == mainContainer) {
      var event = document.createEvent('UIEvents');
      event.initUIEvent('resize', false, false, window, 0);
      window.dispatchEvent(event);
      outerContainer.classList.remove(pdfClassPrefix + 'sidebarMoving');
    }
  }, true);
 
  addListenerToId(pdfClassPrefix + 'viewerContainer', 'click',
    function() {
      if (PDFView.secondaryToolbarOpen) {
        document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
      }
    });

   addListenerToId(pdfClassPrefix + 'secondaryToolbarToggle', 'click',
    function() {
      this.classList.toggle(pdfClassPrefix + 'toggled');
      outerContainer.classList.toggle(pdfClassPrefix + 'secondaryToolbarOpen');
      PDFView.secondaryToolbarOpen = 
        outerContainer.classList.contains(pdfClassPrefix + 'secondaryToolbarOpen');
    });

  addListenerToId(pdfClassPrefix + 'sidebarToggle', 'click',
    function() {
      this.classList.toggle(pdfClassPrefix + 'toggled');
      outerContainer.classList.add(pdfClassPrefix + 'sidebarMoving');
      outerContainer.classList.toggle(pdfClassPrefix + 'sidebarOpen');
      PDFView.sidebarOpen = outerContainer.classList.contains(pdfClassPrefix + 'sidebarOpen');
      PDFView.renderHighestPriority();
    });


  addListenerToId(pdfClassPrefix + 'viewThumbnail', 'click',
    function() {
      PDFView.switchSidebarView('thumbs');
    });

  addListenerToId(pdfClassPrefix + 'viewOutline', 'click',
    function() {
      PDFView.switchSidebarView('outline');
    });

  addListenerToId(pdfClassPrefix + 'previous', 'click',
    function() {
      PDFView.page--;
    });

  addListenerToId(pdfClassPrefix + 'next', 'click',
    function() {
      PDFView.page++;
    });

  addListenerToId(pdfClassPrefix + 'zoomIn', 'click',
    function() {
      PDFView.zoomIn();
    });

  addListenerToId(pdfClassPrefix + 'zoomOut', 'click',
    function() {
      PDFView.zoomOut();
    });

  var presentationModeClick = function() {
    PDFView.presentationMode();
  };
  addListenerToId(pdfClassPrefix + 'presentationMode', 'click',
    function() {
      presentationModeClick();
    });
  addListenerToId(pdfClassPrefix + 'secondaryPresentationMode', 'click',
    function() {
      document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
      presentationModeClick();
    });

  var openFileClick = function() {
    document.getElementById(pdfClassPrefix + 'fileInput').click();
  };
  addListenerToId(pdfClassPrefix + 'openFile', 'click',
    function() {
      openFileClick();
    });
  addListenerToId(pdfClassPrefix + 'secondaryOpenFile', 'click',
    function() {
      document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
      openFileClick();
    });

  var printClick = function() {
    window.print();
  };
  addListenerToId(pdfClassPrefix + 'print', 'click',
    function() {
      printClick();
    });
  addListenerToId(pdfClassPrefix + 'secondaryPrint', 'click',
    function() {
      document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
      printClick();
    });

  var downloadClick = function() {
    PDFView.download();
  };
  addListenerToId(pdfClassPrefix + 'download', 'click',
    function() {
      downloadClick();
    });
  addListenerToId(pdfClassPrefix + 'secondaryDownload', 'click',
    function() {
      document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
      downloadClick();
    });

  addListenerToId(pdfClassPrefix + 'pageNumber', 'click',
    function() {
      this.select();
    });

  addListenerToId(pdfClassPrefix + 'pageNumber', 'change',
    function() {
      // Handle the user inputting a floating point number.
      PDFView.page = (this.value | 0);

      if (this.value !== (this.value | 0).toString()) {
        this.value = PDFView.page;
      }
    });

  addListenerToId(pdfClassPrefix + 'scaleSelect', 'change',
    function() {
      PDFView.parseScale(this.value);
    });

  var firstPageClick = function() {
    PDFView.page = 1;
  };
  addListenerToId(pdfClassPrefix + 'firstPage', 'click',
    function() {
      firstPageClick();
    });
  addListenerToId(pdfClassPrefix + 'contextFirstPage', 'click',
    function() {
      firstPageClick();
    });

  var lastPageClick = function() {
   PDFView.page = PDFView.pdfDocument.numPages;
  };
  addListenerToId(pdfClassPrefix + 'lastPage', 'click',
    function() {
      lastPageClick();
    });
  addListenerToId(pdfClassPrefix + 'contextLastPage', 'click',
    function() {
      lastPageClick();
    });

  var pageRotateCcwClick = function() {
    PDFView.rotatePages(-90);
  };
  addListenerToId(pdfClassPrefix + 'pageRotateCcw', 'click',
    function() {
      pageRotateCcwClick();
    });
  addListenerToId(pdfClassPrefix + 'contextPageRotateCcw', 'click',
    function() {
      pageRotateCcwClick();
    });

  var pageRotateCwClick = function() {
    PDFView.rotatePages(90);
  };
  addListenerToId(pdfClassPrefix + 'pageRotateCw', 'click',
    function() {
      pageRotateCwClick();
    });
  addListenerToId(pdfClassPrefix + 'contextPageRotateCw', 'click',
    function() {
      pageRotateCwClick();
    });

  //#if (FIREFOX || MOZCENTRAL)
  //PDFView.setTitleUsingUrl(file);
  //PDFView.initPassiveLoading();
  //return;
  //#endif

  //#if !B2G
  PDFView.open(file, 0);
  //#endif
}

function updateViewarea() {

  if (!PDFView.initialized)
    return;
  var visible = PDFView.getVisiblePages();
  var visiblePages = visible.views;
  if (visiblePages.length === 0) {
    return;
  }

  PDFView.renderHighestPriority();

  var currentId = PDFView.page;
  var firstPage = visible.first;

  for (var i = 0, ii = visiblePages.length, stillFullyVisible = false;
       i < ii; ++i) {
    var page = visiblePages[i];

    if (page.percent < 100)
      break;

    if (page.id === PDFView.page) {
      stillFullyVisible = true;
      break;
    }
  }

  if (!stillFullyVisible) {
    currentId = visiblePages[0].id;
  }

  if (!PDFView.isPresentationMode) {
    updateViewarea.inProgress = true; // used in "set page"
    PDFView.page = currentId;
    updateViewarea.inProgress = false;
  }

  var currentScale = PDFView.currentScale;
  var currentScaleValue = PDFView.currentScaleValue;
  var normalizedScaleValue = currentScaleValue == currentScale ?
    currentScale * 100 : currentScaleValue;

  var pageNumber = firstPage.id;
  var pdfOpenParams = '#page=' + pageNumber;
  pdfOpenParams += '&zoom=' + normalizedScaleValue;
  var currentPage = PDFView.pages[pageNumber - 1];
  var topLeft = currentPage.getPagePoint(PDFView.container.scrollLeft,
    (PDFView.container.scrollTop - firstPage.y));
  pdfOpenParams += ',' + Math.round(topLeft[0]) + ',' + Math.round(topLeft[1]);

  var store = PDFView.store;
  store.initializedPromise.then(function() {
    store.set('exists', true);
    store.set('page', pageNumber);
    store.set('zoom', normalizedScaleValue);
    store.set('scrollLeft', Math.round(topLeft[0]));
    store.set('scrollTop', Math.round(topLeft[1]));
  });
  var href = PDFView.getAnchorUrl(pdfOpenParams);
  var viewBookmark = document.getElementById(pdfClassPrefix + 'viewBookmark');
  if (viewBookmark)
    viewBookmark.href = href;

  // Update the current page number in the browsing history.
  PDFHistory.updateCurrentPageNumber(pageNumber);
}

window.addEventListener('resize', function webViewerResize(evt) {
  if (PDFView.initialized && document.getElementById(pdfClassPrefix + 'scaleSelect') &&
      (document.getElementById(pdfClassPrefix + 'pageWidthOption').selected ||
      document.getElementById(pdfClassPrefix + 'pageFitOption').selected ||
      document.getElementById(pdfClassPrefix + 'pageAutoOption').selected))
      PDFView.parseScale(document.getElementById(pdfClassPrefix + 'scaleSelect').value);
  updateViewarea();
});

window.addEventListener('hashchange', function webViewerHashchange(evt) {
  if (PDFHistory.isHashChangeUnlocked) {
    PDFView.setHash(document.location.hash.substring(1));
  }
});

window.addEventListener('change', function webViewerChange(evt) {
  if (!PDFView.initialized) return;
  
  var files = evt.target.files;
  if (!files || files.length === 0)
    return;

  // Read the local file into a Uint8Array.
  var fileReader = new FileReader();
  fileReader.onload = function webViewerChangeFileReaderOnload(evt) {
    var buffer = evt.target.result;
    var uint8Array = new Uint8Array(buffer);
    PDFView.open(uint8Array, 0);
  };

  var file = files[0];
  fileReader.readAsArrayBuffer(file);
  PDFView.setTitleUsingUrl(file.name);

  // URL does not reflect proper document location - hiding some icons.
  if (document.getElementById(pdfClassPrefix + 'viewBookmark')) {
    document.getElementById(pdfClassPrefix + 'viewBookmark').setAttribute('hidden', 'true');
    document.getElementById(pdfClassPrefix + 'download').setAttribute('hidden', 'true');
    document.getElementById(pdfClassPrefix + 'secondaryDownload').setAttribute('hidden', 'true');
  }
}, true);

function selectScaleOption(value) {
  var scaleSelect = document.getElementById(pdfClassPrefix + 'scaleSelect');
  if (!scaleSelect) return false;

  var options = scaleSelect.options;
  var predefinedValueFound = false;
  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    if (option.value != value) {
      option.selected = false;
      continue;
    }
    option.selected = true;
    predefinedValueFound = true;
  }
  return predefinedValueFound;
}

window.addEventListener('localized', function localized(evt) {
  document.getElementsByTagName('html')[0].dir = mozL10n.getDirection();

  // Adjust the width of the zoom box to fit the content.
  PDFView.animationStartedPromise.then(
    function() {
      var container = document.getElementById(pdfClassPrefix + 'scaleSelectContainer');
      var select = document.getElementById(pdfClassPrefix + 'scaleSelect');
      if (select) {
        select.setAttribute('style', 'min-width: inherit;');
        var width = select.clientWidth + 8;
        select.setAttribute('style', 'min-width: ' + (width + 20) + 'px;');
        container.setAttribute('style', 'min-width: ' + width + 'px; ' +
                                        'max-width: ' + width + 'px;');
      }
  });
}, true);

window.addEventListener('scalechange', function scalechange(evt) {
  if (document.getElementById(pdfClassPrefix + 'zoomOut')) {
    document.getElementById(pdfClassPrefix + 'zoomOut').disabled = (evt.scale === MIN_SCALE);
    document.getElementById(pdfClassPrefix + 'zoomIn').disabled = (evt.scale === MAX_SCALE);
  }

  var customScaleOption = document.getElementById(pdfClassPrefix + 'customScaleOption');
  if (customScaleOption)
    customScaleOption.selected = false;

  if (!evt.resetAutoSettings && document.getElementById(pdfClassPrefix + 'scaleSelect') &&
       (document.getElementById(pdfClassPrefix + 'pageWidthOption').selected ||
        document.getElementById(pdfClassPrefix + 'pageFitOption').selected ||
        document.getElementById(pdfClassPrefix + 'pageAutoOption').selected)) {
      updateViewarea();
      return;
  }

  var predefinedValueFound = selectScaleOption('' + evt.scale);
  if (!predefinedValueFound && customScaleOption) {
    customScaleOption.textContent = Math.round(evt.scale * 10000) / 100 + '%';
    customScaleOption.selected = true;
  }
  updateViewarea();
}, true);

window.addEventListener('pagechange', function pagechange(evt) {
  var page = evt.pageNumber;
  if (PDFView.previousPageNumber !== page && document.getElementById(pdfClassPrefix + 'pageNumber')) {
    document.getElementById(pdfClassPrefix + 'pageNumber').value = page;
    var selected = document.querySelector('.thumbnail.selected');
    if (selected)
      selected.classList.remove(pdfClassPrefix + 'selected');
    var thumbnail = document.getElementById(pdfClassPrefix + 'thumbnailContainer' + page);
    thumbnail.classList.add(pdfClassPrefix + 'selected');
    var visibleThumbs = PDFView.getVisibleThumbs();
    var numVisibleThumbs = visibleThumbs.views.length;
    // If the thumbnail isn't currently visible scroll it into view.
    if (numVisibleThumbs > 0) {
      var first = visibleThumbs.first.id;
      // Account for only one thumbnail being visible.
      var last = numVisibleThumbs > 1 ?
                  visibleThumbs.last.id : first;
      if (page <= first || page >= last)
        scrollIntoView(thumbnail);
    }

  }
  if (document.getElementById(pdfClassPrefix + 'previous')) {
    document.getElementById(pdfClassPrefix + 'previous').disabled = (page <= 1);
    document.getElementById(pdfClassPrefix + 'next').disabled = (page >= PDFView.pages.length);
  }
}, true);

// Firefox specific event, so that we can prevent browser from zooming
window.addEventListener('DOMMouseScroll', function(evt) {
  if (evt.ctrlKey) {
    evt.preventDefault();

    var ticks = evt.detail;
    var direction = (ticks > 0) ? 'zoomOut' : 'zoomIn';
    for (var i = 0, length = Math.abs(ticks); i < length; i++)
      PDFView[direction]();
  } else if (PDFView.isPresentationMode) {
    var FIREFOX_DELTA_FACTOR = -40;
    PDFView.mouseScroll(evt.detail * FIREFOX_DELTA_FACTOR);
  }
}, false);

window.addEventListener('mousemove', function mousemove(evt) {
  if (PDFView.isPresentationMode) {
    PDFView.showPresentationControls();
  }
}, false);

window.addEventListener('mousedown', function mousedown(evt) {
  if (PDFView.isPresentationMode && evt.button === 0) {
    // Enable clicking of links in presentation mode.
    // Note: Only links that point to the currently loaded PDF document works.
    var targetHref = evt.target.href;
    var internalLink = targetHref && (targetHref.replace(/#.*$/, '') ===
                                      window.location.href.replace(/#.*$/, ''));
    if (!internalLink) {
      // Unless an internal link was clicked, advance a page in presentation
      // mode.
      evt.preventDefault();
      PDFView.page++;
    }
  }
}, false);

window.addEventListener('click', function click(evt) {
  if (PDFView.isPresentationMode && evt.button === 0) {
    // Necessary since preventDefault() in 'mousedown' won't stop
    // the event propagation in all circumstances.
    evt.preventDefault();
  }
}, false);

window.addEventListener('keydown', function keydown(evt) {
  if (evt.target.form) return;
  var handled = false;
  var cmd = (evt.ctrlKey ? 1 : 0) |
            (evt.altKey ? 2 : 0) |
            (evt.shiftKey ? 4 : 0) |
            (evt.metaKey ? 8 : 0);

  // First, handle the key bindings that are independent whether an input
  // control is selected or not.
  if (cmd === 1 || cmd === 8 || cmd === 5 || cmd === 12) {
    // either CTRL or META key with optional SHIFT.
    switch (evt.keyCode) {
      case 70:
        if (!PDFView.supportsIntegratedFind) {
          PDFFindBar.toggle();
          handled = true;
        }
        break;
      case 61: // FF/Mac '='
      case 107: // FF '+' and '='
      case 187: // Chrome '+'
      case 171: // FF with German keyboard
        PDFView.zoomIn();
        handled = true;
        break;
      case 173: // FF/Mac '-'
      case 109: // FF '-'
      case 189: // Chrome '-'
        PDFView.zoomOut();
        handled = true;
        break;
      case 48: // '0'
      case 96: // '0' on Numpad of Swedish keyboard
        PDFView.parseScale(DEFAULT_SCALE, true);
        handled = false; // keeping it unhandled (to restore page zoom to 100%)
        break;
    }
  }

  // CTRL or META with or without SHIFT.
  if (cmd == 1 || cmd == 8 || cmd == 5 || cmd == 12) {
    switch (evt.keyCode) {
      case 71: // g
        if (!PDFView.supportsIntegratedFind) {
          PDFFindBar.dispatchEvent('again', cmd == 5 || cmd == 12);
          handled = true;
        }
        break;
    }
  }

  if (handled) {
    evt.preventDefault();
    return;
  }

  // Some shortcuts should not get handled if a control/input element
  // is selected.
  var curElement = document.activeElement || document.querySelector(':focus');
  if (curElement && (curElement.tagName.toUpperCase() === 'INPUT' ||
                     curElement.tagName.toUpperCase() === 'SELECT')) {
    return;
  }
  var controlsElement = document.getElementById(pdfClassPrefix + 'toolbar');
  while (curElement) {
    if (curElement === controlsElement && !PDFView.isPresentationMode)
      return; // ignoring if the 'toolbar' element is focused
    curElement = curElement.parentNode;
  }

  if (cmd === 0) { // no control key pressed at all.
    switch (evt.keyCode) {
      case 38: // up arrow
      case 33: // pg up
      case 8: // backspace
        if (!PDFView.isPresentationMode &&
            PDFView.currentScaleValue !== 'page-fit') {
          break;
        }
        /* in presentation mode */
        /* falls through */
      case 37: // left arrow
        // horizontal scrolling using arrow keys
        if (PDFView.isHorizontalScrollbarEnabled) {
          break;
        }
        /* falls through */
      case 75: // 'k'
      case 80: // 'p'
        PDFView.page--;
        handled = true;
        break;
      case 27: // esc key
        if (PDFView.secondaryToolbarOpen) {
          document.getElementById(pdfClassPrefix + 'secondaryToolbarToggle').click();
          handled = true;
        }
        if (!PDFView.supportsIntegratedFind && PDFFindBar.opened) {
          PDFFindBar.close();
          handled = true;
        }
        break;
      case 40: // down arrow
      case 34: // pg down
      case 32: // spacebar
        if (!PDFView.isPresentationMode &&
            PDFView.currentScaleValue !== 'page-fit') {
          break;
        }
        /* falls through */
      case 39: // right arrow
        // horizontal scrolling using arrow keys
        if (PDFView.isHorizontalScrollbarEnabled) {
          break;
        }
        /* falls through */
      case 74: // 'j'
      case 78: // 'n'
        PDFView.page++;
        handled = true;
        break;

      case 36: // home
        if (PDFView.isPresentationMode) {
          PDFView.page = 1;
          handled = true;
        }
        break;
      case 35: // end
        if (PDFView.isPresentationMode) {
          PDFView.page = PDFView.pdfDocument.numPages;
          handled = true;
        }
        break;

      case 82: // 'r'
        PDFView.rotatePages(90);
        break;
    }
  }

  if (cmd === 4) { // shift-key
    switch (evt.keyCode) {
      case 82: // 'r'
        PDFView.rotatePages(-90);
        break;
    }
  }

  if (cmd === 2) { // alt-key
    switch (evt.keyCode) {
      case 37: // left arrow
        if (PDFView.isPresentationMode) {
          PDFHistory.back();
          handled = true;
        }
        break;
      case 39: // right arrow
        if (PDFView.isPresentationMode) {
          PDFHistory.forward();
          handled = true;
        }
        break;
    }
  }

  if (handled) {
    evt.preventDefault();
    PDFView.clearMouseScrollState();
  }
});

window.addEventListener('beforeprint', function beforePrint(evt) {
  PDFView.beforePrint();
});

window.addEventListener('afterprint', function afterPrint(evt) {
  PDFView.afterPrint();
});

(function presentationModeClosure() {
  function presentationModeChange(e) {
    var isPresentationMode = document.fullscreenElement ||
                             document.mozFullScreen ||
                             document.webkitIsFullScreen;

    if (!isPresentationMode) {
      document.getElementById(pdfClassPrefix + 'viewer').removeAttribute('contextmenu'); 
      PDFView.exitPresentationMode();
    }
  }

  window.addEventListener('fullscreenchange', presentationModeChange, false);
  window.addEventListener('mozfullscreenchange', presentationModeChange, false);
  window.addEventListener('webkitfullscreenchange', presentationModeChange,
                          false);
})();

(function animationStartedClosure() {
  // The offsetParent is not set until the pdf.js iframe or object is visible.
  // Waiting for first animation.
  var requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.oRequestAnimationFrame ||
                              window.msRequestAnimationFrame ||
                              function startAtOnce(callback) { callback(); };
  PDFView.animationStartedPromise = new PDFJS.Promise();
  requestAnimationFrame(function onAnimationFrame() {
    PDFView.animationStartedPromise.resolve();
  });
})();

//#if B2G
//window.navigator.mozSetMessageHandler('activity', function(activity) {
//  var url = activity.source.data.url;
//  PDFView.open(url);
//  var cancelButton = document.getElementById(pdfClassPrefix + 'activityClose');
//  cancelButton.addEventListener('click', function() {
//    activity.postResult('close');
//  });
//});
//#endif


return {loadFile: webViewerLoad, View: PDFView};

});

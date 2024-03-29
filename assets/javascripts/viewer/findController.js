define(['./pdfviewer'], function (PDFViewer){
  return {
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
      for (var i = 0, ii = PDFViewer.PDFView.pdfDocument.numPages; i < ii; i++) {
        this.extractTextPromises.push(new PDFJS.Promise());
      }

      var self = this;
      function extractPageText(pageIndex) {
        PDFViewer.PDFView.pages[pageIndex].getTextContent().then(
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
            if ((pageIndex + 1) < PDFViewer.PDFView.pages.length)
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
      console.log("update");
      var page = PDFViewer.PDFView.pages[idx];

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
      var pages = PDFViewer.PDFView.pages;
      var previous = this.state.findPrevious;
      var numPages = PDFViewer.PDFView.pages.length;

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
      if (PDFViewer.PDFView.supportsIntegratedFind) {
        FirefoxCom.request('updateFindControlState',
                           {result: state, findPrevious: previous});
        return;
      }
      PDFFindBar.updateUIState(state, previous);
    }
  };
});
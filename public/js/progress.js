/* =========================================================================
   progress.js — shared localStorage progress store + global controls.
   Loaded on every page. Exposes window.Progress.

   Storage model: a single JSON object under one key, mapping a composite
   "<categoryId>::<slug>" key -> true for each solved problem. Keying by
   category+slug keeps per-topic counts unambiguous and lets the global
   "X / total" count every catalog entry exactly once.
   ========================================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'dsa-roadmap:progress:v1';

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      // Corrupt data or storage disabled — fail soft with an empty store.
      return {};
    }
  }

  function write(map) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      /* storage full or disabled — progress just won't persist */
    }
  }

  var Progress = {
    /** Is this composite key marked done? */
    isDone: function (key) {
      return read()[key] === true;
    },

    /** Set/clear done for a key. Returns the new boolean state. */
    set: function (key, done) {
      var map = read();
      if (done) map[key] = true;
      else delete map[key];
      write(map);
      this._notify();
      return !!done;
    },

    /** Toggle and return the new state. */
    toggle: function (key) {
      return this.set(key, !this.isDone(key));
    },

    /** Count how many of the given keys are done. */
    countDone: function (keys) {
      var map = read();
      var n = 0;
      for (var i = 0; i < keys.length; i++) if (map[keys[i]] === true) n++;
      return n;
    },

    /** Total number of solved problems across the whole catalog. */
    totalDone: function () {
      return Object.keys(read()).length;
    },

    /**
     * Count done keys beginning with a prefix (e.g. "<categoryId>::"). Used by
     * the home page to tally per-topic progress without shipping every slug.
     */
    countByPrefix: function (prefix) {
      var keys = Object.keys(read());
      var n = 0;
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(prefix) === 0) n++;
      }
      return n;
    },

    /** Wipe all progress. */
    reset: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
      this._notify();
    },

    /** Subscribe to changes (same-tab). Returns an unsubscribe fn. */
    onChange: function (fn) {
      this._listeners.push(fn);
      return function () {};
    },

    _listeners: [],
    _notify: function () {
      for (var i = 0; i < this._listeners.length; i++) {
        try { this._listeners[i](); } catch (e) { /* ignore */ }
      }
    },
  };

  // Keep in sync across tabs/windows.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) Progress._notify();
  });

  window.Progress = Progress;

  // -----------------------------------------------------------------------
  // Global "Reset progress" button (lives in the header on every page).
  // -----------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('[data-reset-progress]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var total = Progress.totalDone();
      if (total === 0) {
        // Nothing to clear — give quiet feedback rather than a pointless dialog.
        btn.textContent = 'Nothing saved';
        setTimeout(function () { btn.textContent = 'Reset progress'; }, 1200);
        return;
      }
      var ok = window.confirm(
        'Reset all progress? This will clear ' + total + ' solved problem' +
        (total === 1 ? '' : 's') + ' from this browser. This cannot be undone.'
      );
      if (ok) Progress.reset();
    });
  });
})();

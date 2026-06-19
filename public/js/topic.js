/* =========================================================================
   topic.js — per-topic interactions: done checkboxes (localStorage),
   difficulty filter, premium show/hide, title search, and live counts.
   ========================================================================= */
(function () {
  'use strict';

  var main = document.querySelector('[data-topic]');
  if (!main) return;

  var problems = Array.prototype.slice.call(document.querySelectorAll('[data-problem]'));
  var searchInput = document.querySelector('[data-search]');
  var premiumToggle = document.querySelector('[data-show-premium]');
  var difficultyButtons = Array.prototype.slice.call(document.querySelectorAll('[data-difficulty]'));
  var emptyState = document.querySelector('[data-empty]');
  var countEl = document.querySelector('[data-topic-count]');

  var state = {
    search: '',
    difficulty: 'all',
    showPremium: false,
  };

  // ---- Done checkboxes ---------------------------------------------------
  problems.forEach(function (li) {
    var key = li.getAttribute('data-key');
    var checkbox = li.querySelector('[data-done]');
    if (!checkbox) return;

    // Initialise from saved progress.
    var done = window.Progress.isDone(key);
    checkbox.checked = done;
    li.classList.toggle('is-done', done);

    checkbox.addEventListener('change', function () {
      var nowDone = window.Progress.set(key, checkbox.checked);
      li.classList.toggle('is-done', nowDone);
      updateCount();
    });
  });

  function updateCount() {
    if (!countEl) return;
    var done = 0;
    problems.forEach(function (li) {
      var cb = li.querySelector('[data-done]');
      if (cb && cb.checked) done++;
    });
    countEl.textContent = done;
  }

  // ---- Filtering ---------------------------------------------------------
  function matches(li) {
    if (!state.showPremium && li.getAttribute('data-premium') === 'true') return false;
    if (state.difficulty !== 'all' && li.getAttribute('data-difficulty') !== state.difficulty) return false;
    if (state.search && li.getAttribute('data-title').indexOf(state.search) === -1) return false;
    return true;
  }

  function applyFilters() {
    var visible = 0;
    problems.forEach(function (li) {
      var show = matches(li);
      li.hidden = !show;
      if (show) visible++;
    });
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  // ---- Controls ----------------------------------------------------------
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.search = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  if (premiumToggle) {
    premiumToggle.addEventListener('change', function () {
      state.showPremium = premiumToggle.checked;
      applyFilters();
    });
  }

  difficultyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.difficulty = btn.getAttribute('data-difficulty');
      difficultyButtons.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyFilters();
    });
  });

  // Reflect external changes (e.g. global "Reset progress" button).
  if (window.Progress) {
    window.Progress.onChange(function () {
      problems.forEach(function (li) {
        var key = li.getAttribute('data-key');
        var cb = li.querySelector('[data-done]');
        var done = window.Progress.isDone(key);
        if (cb) cb.checked = done;
        li.classList.toggle('is-done', done);
      });
      updateCount();
    });
  }

  // ---- Init --------------------------------------------------------------
  updateCount();
  applyFilters();
})();

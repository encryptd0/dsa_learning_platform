/* =========================================================================
   home.js — draws the roadmap connectors and reflects saved progress on the
   graph nodes, the per-topic counts, and the global "X / total" pill.
   ========================================================================= */
(function () {
  'use strict';

  var dataEl = document.getElementById('graph-data');
  if (!dataEl) return;

  var graph;
  try {
    graph = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }

  var container = document.querySelector('[data-graph]');
  var svg = document.querySelector('[data-graph-lines]');
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- Connectors --------------------------------------------------------
  // After layout, draw a line from the bottom-centre of each node to the
  // top-centre of every topic it unlocks. Recomputed on resize so the graph
  // stays responsive.
  function drawLines() {
    if (!container || !svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var box = container.getBoundingClientRect();
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);

    function centreBottom(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.bottom - box.top };
    }
    function centreTop(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top };
    }

    graph.categories.forEach(function (cat) {
      var from = container.querySelector('[data-node="' + cat.id + '"]');
      if (!from) return;
      var a = centreBottom(from);
      (cat.unlocks || []).forEach(function (targetId) {
        var to = container.querySelector('[data-node="' + targetId + '"]');
        if (!to) return;
        var b = centreTop(to);

        // Smooth vertical cubic curve between the two nodes.
        var midY = (a.y + b.y) / 2;
        var d = 'M ' + a.x + ' ' + a.y +
                ' C ' + a.x + ' ' + midY + ' ' + b.x + ' ' + midY + ' ' + b.x + ' ' + b.y;

        var path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#111111');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('opacity', '0.45');
        svg.appendChild(path);
      });
    });
  }

  // ---- Progress reflection ----------------------------------------------
  function refreshProgress() {
    var globalDone = 0;

    graph.categories.forEach(function (cat) {
      var prefix = cat.id + '::';
      // Cap at the catalog count in case stale keys linger from an old catalog.
      var done = Math.min(window.Progress.countByPrefix(prefix), cat.count);
      globalDone += done;

      var label = done + '/' + cat.count;

      var nodeCount = document.querySelector('[data-node-count="' + cat.id + '"]');
      if (nodeCount) nodeCount.textContent = label;
      var rowCount = document.querySelector('[data-row-count="' + cat.id + '"]');
      if (rowCount) rowCount.textContent = label;

      var node = document.querySelector('[data-node="' + cat.id + '"]');
      if (node) {
        node.classList.toggle('is-complete', done === cat.count && cat.count > 0);
        node.classList.toggle('is-started', done > 0 && done < cat.count);
      }
      var row = document.querySelector('[data-topic-row="' + cat.id + '"]');
      if (row) {
        row.classList.toggle('is-complete', done === cat.count && cat.count > 0);
      }
    });

    var countEl = document.querySelector('[data-global-count]');
    if (countEl) countEl.textContent = globalDone;
  }

  // ---- Wire up -----------------------------------------------------------
  function init() {
    drawLines();
    refreshProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Redraw connectors on resize (debounced); keep counts in sync on changes.
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawLines, 120);
  });
  window.addEventListener('load', drawLines); // re-measure once fonts settle
  if (window.Progress) window.Progress.onChange(refreshProgress);
})();

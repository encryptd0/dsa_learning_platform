'use strict';

/**
 * DSA Roadmap — a free, non-commercial learning site.
 *
 * No database: the problem catalog is a static JSON file loaded into memory
 * once at startup and served read-only. All per-visitor progress lives in the
 * browser's localStorage, so the server stays stateless and trivially
 * deployable to a single Node host.
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Catalog: load once at startup. If this throws, we want a loud crash rather
// than a half-booted server serving an empty roadmap.
// ---------------------------------------------------------------------------
const DATA_PATH = path.join(__dirname, 'data', 'problems.json');
const catalog = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Sort categories by their recommended `order` and index them by id.
const categories = [...catalog.categories].sort((a, b) => a.order - b.order);
const categoryById = new Map(categories.map((c) => [c.id, c]));

// Total problems = sum of every category's problem entries (matches meta.total).
const totalProblems = categories.reduce((sum, c) => sum + c.problems.length, 0);

/**
 * Compute a "level" (longest path from a root) for every topic so the home
 * graph can be laid out in tidy dependency bands. Roots — topics nothing
 * unlocks — sit at level 0; each topic sits one below the deepest topic that
 * unlocks it.
 */
function computeLevels(cats) {
  const incoming = new Map(cats.map((c) => [c.id, 0]));
  for (const c of cats) {
    for (const target of c.unlocks || []) {
      incoming.set(target, (incoming.get(target) || 0) + 1);
    }
  }

  const level = new Map();
  // Kahn-style topological pass: a node is ready once all its parents are placed.
  const queue = cats.filter((c) => incoming.get(c.id) === 0).map((c) => c.id);
  for (const id of queue) level.set(id, 0);

  const remaining = new Map(incoming);
  while (queue.length) {
    const id = queue.shift();
    const node = categoryById.get(id);
    for (const target of node.unlocks || []) {
      level.set(target, Math.max(level.get(target) || 0, (level.get(id) || 0) + 1));
      remaining.set(target, remaining.get(target) - 1);
      if (remaining.get(target) === 0) queue.push(target);
    }
  }
  return level;
}

const levelById = computeLevels(categories);

// Group categories into ordered bands for the layered home-graph layout.
function buildGraphBands() {
  const bands = [];
  for (const c of categories) {
    const lvl = levelById.get(c.id) || 0;
    (bands[lvl] = bands[lvl] || []).push(c);
  }
  // Keep nodes within a band in recommended order for stable, readable rows.
  return bands.map((band) => band.sort((a, b) => a.order - b.order));
}

const graphBands = buildGraphBands();

// Lightweight graph payload handed to the client for drawing connectors and
// applying localStorage-derived progress styling. Keep it minimal.
const graphData = {
  total: totalProblems,
  categories: categories.map((c) => ({
    id: c.id,
    title: c.title,
    order: c.order,
    count: c.problems.length,
    unlocks: c.unlocks || [],
  })),
};

// ---------------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Shared locals so every view has the catalog meta and nav available.
app.use((req, res, next) => {
  res.locals.meta = catalog.meta;
  res.locals.totalProblems = totalProblems;
  res.locals.path = req.path;
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Home: the roadmap graph + ordered topic list.
app.get('/', (req, res) => {
  res.render('home', {
    title: 'DSA Roadmap',
    categories,
    graphBands,
    graphData,
  });
});

// About.
app.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});

// Dead-link helper: a friendly landing for problems that may have moved or been
// removed on LeetCode, with a search fallback. Linked to from problem rows.
app.get('/gone', (req, res) => {
  const title = typeof req.query.title === 'string' ? req.query.title.slice(0, 200) : '';
  const searchUrl =
    'https://leetcode.com/problemset/?search=' + encodeURIComponent(title || '');
  res.status(404).render('gone', { title: 'Problem moved?', problemTitle: title, searchUrl });
});

// Topic page. Unknown ids fall through to the 404 view.
app.get('/topic/:id', (req, res, next) => {
  const category = categoryById.get(req.params.id);
  if (!category) return next();

  const solvedCount = category.problems.length;
  const freeCount = category.problems.filter((p) => !p.isPremium).length;

  res.render('topic', {
    title: category.title,
    category,
    freeCount,
    totalInTopic: solvedCount,
  });
});

// 404 for everything else.
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`DSA Roadmap running at http://localhost:${PORT}`);
  console.log(`Loaded ${categories.length} topics, ${totalProblems} problems (no DB, no network).`);
});

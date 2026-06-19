# DSA Roadmap

A free, non-commercial website for learning data structures & algorithms. It
organizes ~150 well-known LeetCode practice problems into 18 topics arranged as a
dependency roadmap (inspired by the [NeetCode](https://neetcode.io) roadmap), so
you always know what to learn next. No ads, no accounts, no monetization.

- **Roadmap graph** — every topic unlocks the next; click a node to open it.
- **Per-problem progress** — tick problems off; saved in your browser only.
- **Filters & search** — by difficulty, show/hide LeetCode Premium, search by title.
- **Neo-brutalist** Swiss-editorial design.

Problems link out to [LeetCode](https://leetcode.com); this site hosts no problem
content.

## Run it

Requires **Node.js 18+**.

```bash
npm install
npm start
```

Then open <http://localhost:3000>. Set `PORT` to use a different port:

```bash
PORT=8080 npm start
```

For local development with auto-restart on file changes:

```bash
npm run dev
```

That's it — there is **zero** external API access at runtime.

## How the data works

The entire problem catalog is a single static file: [`data/problems.json`](data/problems.json).
It is loaded into memory once at startup and served read-only.

```jsonc
{
  "meta": { "source": "...", "note": "...", "total": 150 },
  "categories": [
    {
      "id": "arrays-hashing",          // URL slug: /topic/arrays-hashing
      "title": "Arrays & Hashing",
      "order": 1,                       // position in the recommended sequence
      "blurb": "The foundation...",     // shown on the topic page
      "unlocks": ["two-pointers", "stack"], // roadmap graph edges (children)
      "count": 9,
      "problems": [
        {
          "title": "Two Sum",
          "slug": "two-sum",
          "url": "https://leetcode.com/problems/two-sum/",
          "difficulty": "Easy",         // Easy | Medium | Hard
          "isPremium": false            // true = behind LeetCode Premium
        }
      ]
    }
  ]
}
```

- **`unlocks`** defines the roadmap graph. The home page computes each topic's
  depth from these edges and draws the connectors.
- **`isPremium: true`** problems are hidden by default and clearly badged; a
  per-topic toggle reveals them.

### Why no database?

The catalog is small, read-only, and changes rarely — a JSON file loaded at
startup is simpler, faster, and has nothing to provision, back up, or secure. A
database (or a runtime scraper) would be pure overhead here. The only mutable
state is *your* progress, which lives entirely in your browser's `localStorage`,
so the server stays completely stateless and deploys to a single Node host (e.g.
Render) with no extra services.

## Adding or editing a problem

1. Open [`data/problems.json`](data/problems.json) and find the category by its
   `id`.
2. Add or edit an entry in that category's `problems` array. The `slug` should
   match LeetCode's URL (`https://leetcode.com/problems/<slug>/`), and `url`
   should be the full link.
3. Update that category's `count` to match the number of problems, and
   `meta.total` if the overall total changed.
4. Restart the server (`npm start`). No build step.

Progress is keyed by `<category id>::<slug>`, so renaming a slug or moving a
problem to another category starts its "done" state fresh.

### Handling moved / removed problems

LeetCode occasionally renames or removes a problem. Rather than keeping the list
live, every problem row has a small **"broken?"** link that routes to
`/gone?title=<title>` — a friendly page that offers a LeetCode search for the
title. Nothing is fetched or validated at runtime.

## Project structure

```
server.js              Express app + routes (loads the catalog at startup)
data/problems.json     The static problem catalog (the only data source)
views/                 EJS templates
  partials/            head / header / footer
  home.ejs             roadmap graph + ordered topic list
  topic.ejs            one topic: problem list + filters/search
  about.ejs            what this is + credit
  404.ejs / gone.ejs   not-found and moved-problem pages
public/
  css/styles.css       the neo-brutalist design system
  js/progress.js       localStorage progress store + global reset (every page)
  js/home.js           graph connectors + progress reflection
  js/topic.js          done toggles, difficulty filter, premium toggle, search
```

## Routes

| Route             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `GET /`           | Home: roadmap graph, global progress, topic list     |
| `GET /topic/:id`  | A topic's problems (unknown `id` → 404)              |
| `GET /about`      | What this is, and credit                             |
| `GET /gone?title=`| "Problem may have moved" helper (LeetCode search)    |
| *anything else*   | 404                                                  |

## License & credit

Free and non-commercial — use it, share it. Roadmap structure inspired by
[NeetCode](https://neetcode.io). All problems belong to
[LeetCode](https://leetcode.com); this project only links to them.

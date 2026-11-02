# One base for every site

Approved 3 Nov 2026 (approach 1, "token overlay"; one accent per family; PAOK in black and white). Base changed to dark the same day, at the user's request, once the first pages were up: the homepage's night.

## Goal

Every site under antonisnikolitsopoulos.com looks like one place: the homepage's night blue, its two typefaces,
the same sitebar and the same site header (mark, kicker, title, tabs), with a single muted family colour doing
all the colouring. Layouts, tables and scripts stay as they are; only colour, type and the header change.
Elegant, not kitsch: one accent, no gradients, no crests, marks as thin line icons.

## The shared layer

`/assets/an.css` (one file, cached): base tokens, the sitebar, the site header, pills and the family accents.
`/assets/marks.svg`: one SVG sprite, a `<symbol>` per mark, 24-grid, 1.5-px stroke, `currentColor`.

Tokens (all sites):

    --an-paper #0d1220 (the page)   --an-soft #141a2b (panels)   --an-ink #f3f4f7   --an-muted #9aa1b2   --an-rule #262e42
    --an-on-accent #0d1220 (text on a filled accent)   --an-bad-soft, --an-bar, --an-backdrop for the few remaining tints
    --an-display "Instrument Serif", "Iowan Old Style", Georgia, serif
    --an-body    "Hanken Grotesk", "Segoe UI", system-ui, sans-serif
    --an-mono    ui-monospace, "Cascadia Mono", Consolas, monospace
    --an-accent  set by the family (below); --an-accent-soft = accent at 14 % on the page

Families, selected with `data-site` on `<html>`:

| data-site     | sites                                             | accent            | mark        |
|---------------|---------------------------------------------------|-------------------|-------------|
| football      | Super League, Greek Cup                           | #5fb48a           | football, cup |
| basketball    | Basketball, Basketball totals, EuroCup, FIBA      | #e58a4a           | basketball  |
| handball      | Handball (projections, backtesting, done-by-the-break) | #e0697a      | handball    |
| volleyball    | Volleyball, Challenge Cup Women                   | #7da1ff           | volleyball  |
| paok          | PAOK Hub, PAOK Basketball                         | #f3f4f7 (the ink; no second colour) | paok "P" |
| wine          | Wine                                              | #d08a9c           | wine        |
| books         | Books, homepage, About, Thought Bank              | #6d8dff           | book        |

The accent appears only on: the header kicker, the active tab's underline, links, the "on" pill, the one
highlighted number in a row, and the row of PAOK (or the user's team) in a table. Everything else is ink,
muted or rule grey. PAOK uses ink for all of these, so its pages are white, grey and night only.

## The header

    <nav class="an-sitebar"> … unchanged … </nav>
    <header class="an-head">
      <a class="an-brand" href="/<site>/">
        <svg class="an-mark"><use href="/assets/marks.svg#football"/></svg>
        <span><small class="an-kicker">Football · Projections</small><h1>Greek Super League</h1></span>
      </a>
      <nav class="an-tabs"> … the site's existing tabs, class "on" for the current one … </nav>
    </header>

Kicker = family · kind (Projections, Stats, Reference, Pairing, Takeaways). Title in the serif at 30 px.
Sites with no tabs omit `an-tabs`. The homepage's project cards show the site's mark (15 px) before the tag.
Result colours (won/lost, positive/negative) are data, not decoration: they stay, in their dark-readable shades.

## How each site adopts it

1. Link `/assets/an.css` after the page's own `<style>`, set `data-site` on `<html>`.
2. Remap the page's own variables to the tokens, at the end of its `:root` block, so every rule it already
   has picks up the new colours without being rewritten: e.g. dark sites
   `--bg: var(--an-paper); --panel: var(--an-soft); --line: var(--an-rule); --text: var(--an-ink);
   --muted: var(--an-muted); --gold: var(--an-accent);` and set `--win/--loss` to ink/muted.
   Light sites remap `--accent` to `var(--an-accent)` and `--bg` to paper. Fonts: `--mono`, `--display`,
   `--body` → the an- fonts.
3. Replace the page's own header block with the shared header; keep its tab links and their JS hooks.
4. Check the page in the browser: header, tabs, one table, pills, the highlighted row.

Where the page is generated, the change goes in the template (BettingSignal) and the page is rebuilt by its
workflow; static pages are edited in place. Generators: `superleague/make_page.py` (also builds Volleyball's
head), `basketball/projector/template.html`, `handball/projector/template.html`, `eurocup` and
`fibaeuropecup` site HTML, `greek-cup`, `basketball-overs`, `paok-hub/build_*.py` + 30 static pages,
`paok-basketball/styles.css` + `index.html`, `wine/index.html`, `books` (`scripts/build_edge.py`).

## Order of work

1. `assets/an.css`, `assets/marks.svg`, homepage cards with marks. (This commit also proves the header on
   one static page: Greek Cup.)
2. Football: Super League (template in BettingSignal).
3. Basketball family: Basketball, Totals, EuroCup, FIBA.
4. Handball, Volleyball, Challenge Cup.
5. PAOK Hub, PAOK Basketball (black and white).
6. Wine, Books, About, Thought Bank.

One family per commit; each verified live before the next. The gold, Oswald/Impact, the light greys and the
burgundy base go with their family.

## Out of scope

Club and competition crests; dark mode; changes to tables, charts or scripts' data; whatalgomissed.com.

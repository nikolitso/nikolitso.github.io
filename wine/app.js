const D = window.WINE_DATA;
const ALLR = D.recipes, R = ALLR.filter(r => r.category !== 'Cheeses'), C = ALLR.filter(r => r.category === 'Cheeses'), W = D.wines, byId = Object.fromEntries(W.map(w => [w.id, w]));

const UI = {
  en: {
    docTitle: 'Greek wine and food pairing: 950+ wines · Ελληνικό κρασί και φαγητό', kicker: 'Greek wine · Food pairing', title: 'The Pairing Finder',
    lede: 'Every dish with the wine that suits it best. Select a dish to see the grape, the reason and more wines.',
    placeholder: 'Try moussaka, octopus, lamb, feta, tomato…', cats: 'Dish type', tags: 'Food or occasion', grapes: 'Grape',
    showAll: 'Show all', showLess: 'Show fewer', viewFinder: 'Pairing Finder', viewList: 'Wine list', viewEstates: 'Estates', estatesTitle: 'The Estates',
    estatesLede: 'Every estate on the list, with all of its labels. Select a label to see its tasting notes and pairings.',
    label1: 'label', labelsN: 'labels', favTitle: 'Top 10 favourites', allEstates: 'All estates', mapTitle: 'Choose a region', mapHint: 'Select a region on the map to see its estates.', mapAll: 'Show all regions', mapAria: 'Map of Greece with wine regions', mapLegend: 'Filled markers are regions with estates on the list. Hollow markers are wine regions still to come.', estN: 'estates', est1: 'estate', topWhite: 'Top 20 White', topRose: 'Top 20 Rosé', topRed: 'Top 20 Red', allWines: 'All wines', winery: 'Region', colour: 'Colour', listTitle: 'The Wine List',
    listLede: 'Every wine on the list with the food it suits. Select a wine to see its full tasting notes.',
    exploreTitle: 'Browse by colour, grape and region', filter: 'Showing', clearFilter: 'Clear', tonight: 'Tonight', tomorrow: 'Tomorrow', music: 'Music for the table', closeMusic: 'Close the music', playMusic: 'Play the playlist', feast: 'Feast of the month',
    col: {White: 'White', 'Rosé': 'Rosé', Red: 'Red'}, wine: 'wine', winesN: 'wines',
    bestFor: 'Dishes where it is the first choice', more: 'More wines that fit', dishesFor: 'Dishes',
    begin: 'Where to begin', beginText: (r, w) => `Pick a chip above, or type a dish. ${r} dishes and ${w} wines are loaded.`,
    inSeason: 'In season', season: 'Season', allYear: 'All year', easy: 'Easy, everyday', slow: 'Needs time', fried: 'Fried', serve: 'Serve at', estateSite: 'Estate website', showAll: 'Show all wines', estatesN: 'estates', nextMonth: 'Next month', prevMonth: 'Previous month', top10Wines: 'Top 10 wines of the month', top10Pairs: 'Top 10 of the month: dish and wine', onTable: 'On the table', allDishes: 'All dishes', cheeses: 'Cheeses: what pairs with each', dishes: 'Dishes', wines: 'Wines', result: 'result', results: 'results',
    none: 'No match yet. Try a simpler word, such as the main ingredient.',
    bestGrape: 'Best grape', alt: 'alternative',
    pairs: 'Pairs with', pairsGen: 'General pairing for the grape', also: 'Also try',
    foot: (w, r, e) => `${w} wines · ${e} estates · ${r} dishes`,
  },
  el: {
    docTitle: 'Οδηγός Ταιριάσματος Ελληνικού Κρασιού και Φαγητού', kicker: 'Ελληνικό κρασί · Κρασί και φαγητό', title: 'Ο Οδηγός Ταιριάσματος',
    lede: 'Κάθε πιάτο με το κρασί που του ταιριάζει καλύτερα. Επιλέξτε ένα πιάτο για να δείτε την ποικιλία, το γιατί και περισσότερα κρασιά.',
    placeholder: 'Δοκιμάστε μουσακά, χταπόδι, αρνί, φέτα, ντομάτα…', cats: 'Είδος πιάτου', tags: 'Φαγητό / περίσταση', grapes: 'Ποικιλία',
    showAll: 'Εμφάνιση όλων', showLess: 'Λιγότερα', viewFinder: 'Οδηγός Ταιριάσματος', viewList: 'Λίστα κρασιών', viewEstates: 'Κτήματα', estatesTitle: 'Τα Κτήματα',
    estatesLede: 'Όλα τα κτήματα της λίστας, με όλες τις ετικέτες τους. Επιλέξτε μια ετικέτα για να δείτε τις γευστικές σημειώσεις και τα ταιριάσματά της.',
    label1: 'ετικέτα', labelsN: 'ετικέτες', favTitle: 'Τα 10 αγαπημένα', allEstates: 'Όλα τα κτήματα', mapTitle: 'Επιλέξτε περιοχή', mapHint: 'Επιλέξτε μια περιοχή στον χάρτη για να δείτε τα κτήματά της.', mapAll: 'Όλες οι περιοχές', mapAria: 'Χάρτης της Ελλάδας με τις οινικές περιοχές', mapLegend: 'Τα γεμάτα σημάδια είναι περιοχές με κτήματα στη λίστα. Τα κενά είναι οινικές περιοχές που θα προστεθούν.', estN: 'κτήματα', est1: 'κτήμα', topWhite: 'Τα 20 κορυφαία λευκά', topRose: 'Τα 20 κορυφαία ροζέ', topRed: 'Τα 20 κορυφαία ερυθρά', allWines: 'Όλα τα κρασιά', winery: 'Περιοχή', colour: 'Χρώμα', listTitle: 'Η Λίστα Κρασιών',
    listLede: 'Όλα τα κρασιά της λίστας με τα φαγητά που τους ταιριάζουν. Επιλέξτε ένα κρασί για να δείτε τις πλήρεις γευστικές σημειώσεις.',
    exploreTitle: 'Ανά χρώμα, ποικιλία και περιοχή', filter: 'Εμφανίζονται', clearFilter: 'Καθαρισμός', tonight: 'Απόψε', tomorrow: 'Αύριο', music: 'Μουσική για το τραπέζι', closeMusic: 'Κλείσιμο μουσικής', playMusic: 'Παίξε τη λίστα', feast: 'Γιορτή του μήνα',
    col: {White: 'Λευκό', 'Rosé': 'Ροζέ', Red: 'Ερυθρό'}, wine: 'κρασί', winesN: 'κρασιά',
    bestFor: 'Πιάτα όπου είναι η πρώτη επιλογή', more: 'Περισσότερα κρασιά που ταιριάζουν', dishesFor: 'Πιάτα',
    begin: 'Από πού να ξεκινήσετε', beginText: (r, w) => `Επιλέξτε ένα κουμπί παραπάνω ή γράψτε ένα πιάτο. Φορτώθηκαν ${r} πιάτα και ${w} κρασιά.`,
    inSeason: 'Της εποχής', season: 'Εποχή', allYear: 'Όλο τον χρόνο', easy: 'Εύκολο, καθημερινό', slow: 'Θέλει χρόνο', fried: 'Τηγανητό', serve: 'Σερβίρισμα', estateSite: 'Ιστοσελίδα κτήματος', showAll: 'Όλα τα κρασιά', estatesN: 'κτήματα', nextMonth: 'Επόμενος μήνας', prevMonth: 'Προηγούμενος μήνας', top10Wines: 'Τα 10 κορυφαία κρασιά του μήνα', top10Pairs: 'Top 10 του μήνα: πιάτο και κρασί', onTable: 'Στο τραπέζι', allDishes: 'Όλα τα πιάτα', cheeses: 'Τυριά: με τι ταιριάζει το καθένα', dishes: 'Πιάτα', wines: 'Κρασιά', result: 'αποτέλεσμα', results: 'αποτελέσματα',
    none: 'Δεν βρέθηκε αντιστοιχία. Δοκιμάστε μια απλούστερη λέξη, όπως το κύριο υλικό.',
    bestGrape: 'Καλύτερη ποικιλία', alt: 'εναλλακτικά',
    pairs: 'Ταιριάζει με', pairsGen: 'Ταιριάζει γενικά στην ποικιλία', also: 'Δοκιμάστε επίσης',
    foot: (w, r, e) => `${w} κρασιά · ${e} κτήματα · ${r} πιάτα`,
  },
};

let lang = 'en';
try {
  const q = new URLSearchParams(location.search).get('lang'), s = localStorage.getItem('wine-lang');
  lang = q === 'el' || q === 'en' ? q : s === 'el' || s === 'en' ? s : (navigator.language || '').toLowerCase().startsWith('el') ? 'el' : 'en';
} catch (e) {}
const t = k => UI[lang][k];
const L = (o, k) => lang === 'el' && o.el && o.el[k] !== undefined ? o.el[k] : o[k];

// accent-, case- and final-sigma-insensitive, so Greek and English both match
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const cats = [...new Set(ALLR.map(r => r.category))];
const catEl = Object.fromEntries(ALLR.map(r => [r.category, r.el.category]));
const tagCount = {}, tagEl = {};
W.forEach(w => w.tags.forEach((x, i) => { tagCount[x] = (tagCount[x] || 0) + 1; tagEl[x] = w.el.tags[i]; }));
const tags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a] || a.localeCompare(b));
const HASH = {home: '/wine/', list: '#list', wineries: '#estates', finder: '#finder'};
let view = location.hash === '#finder' ? 'finder' : location.hash === '#estates' ? 'wineries' : location.hash === '#list' ? 'list' : 'home';
let state = {q: '', cat: '', tag: '', grape: '', region: '', colour: '', variety: ''};
let topColour = 'White';
const G = D.grapes, gByKey = Object.fromEntries(G.map(g => [g.key, g]));

const colourKey = w => w.colour.startsWith('Red') ? 'Red' : w.colour.startsWith('Ros') ? 'Rosé' : 'White';
const wineText = w => norm([w.wine, w.winery, w.el.name, w.el.winery, w.region, w.el.region, w.grapes, w.colour, w.pairs, w.also, w.tags.join(' '),
  w.el.grapes, w.el.colour, w.el.pairs, w.el.also, w.el.tags.join(' ')].join(' '));
const recipeText = r => norm([r.name, r.category, r.ingredients, r.grape, r.alt,
  r.el.name, r.el.category, r.el.ingredients, r.el.grape, r.el.alt].join(' '));

const expandedRows = new Set();
function collapsible(el, count) {
  let b = el.nextElementSibling;
  if (!b || !b.classList.contains('chips-toggle')) { b = document.createElement('button'); b.type = 'button'; b.className = 'chips-toggle'; b.dataset.for = el.id; el.after(b); }
  const open = expandedRows.has(el.id);
  el.classList.toggle('collapsed', !open && count > 12);
  b.hidden = count <= 12 || el.hidden;
  b.textContent = open ? t('showLess') : t('showAll') + ' (' + count + ')';
}
function chips(el, items, key, label, sorted, fold) {
  if (sorted) items = items.slice().sort((a, b) => label(a).localeCompare(label(b), lang));
  if (fold) collapsible(el, items.length);
  el.innerHTML = items.map(i => `<button class="chip${state[key] === i ? ' on' : ''}" data-k="${key}" data-v="${esc(i)}">${esc(label(i))}</button>`).join('');
}
function labelHtml(l) {
  const w = byId[l.name];
  if (!l.listed || !w) return `<li><span class="dot"></span><span>${esc(lang === 'el' ? l.el : l.name)}</span></li>`;
  return `<li><span class="dot ${colourKey(w)}"></span><a class="wl" data-wine="${esc(w.id)}">${esc(tidy(lang === 'el' ? w.el.name + ' (' + w.el.winery + ')' : l.name))}</a></li>`;
}
function wineLink(w) {
  return `<li><span class="dot ${colourKey(w)}"></span><a class="wl" data-wine="${esc(w.id)}">${esc(tidy(lang === 'el' ? w.el.name + ' (' + w.el.winery + ')' : w.wine + ' (' + w.winery + ')'))}</a></li>`;
}

const tidy = x => x.replace(/\(([^()]*)\(([^()]*)\)\)/g, '($1, $2)');
const BOTTLE = {White: '#f3e27a', Rosé: '#f48fa8', Red: '#b4163a', Skin: '#e39b4a'};
const bottle = w => `<svg class="bt" viewBox="0 0 20 46" aria-hidden="true"><path d="M8 1.5h4V11c0 3.4 4 5.2 4 11v21a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 43V22c0-5.800 4-7.600 4-11z" fill="${w.colour.indexOf('skin') > -1 ? BOTTLE.Skin : BOTTLE[colourKey(w)]}" fill-opacity="1" stroke="#f6ecdb" stroke-opacity=".55" stroke-width="1.1"/><rect x="5.5" y="27" width="9" height="11" rx="1" fill="#f6ecdb" fill-opacity=".85"/><path d="M8 1.5h4" stroke="#d6b066" stroke-width="2"/></svg>`;
const ICONS = {
  'Fish & seafood': '<path d="M2.5 12c3-5 8.500-6.500 12.500-3l5.500-3.500v13L15 15c-4 3.500-9.500 2-12.500-3z"/><circle cx="8" cy="11" r=".9"/>',
  'Meat & poultry': '<circle cx="15" cy="9" r="5.500"/><path d="M11.200 12.800 4 20M2.800 16.500l4.700 4.700"/>',
  'Pies': '<path d="M3.500 18 12 5.500l8.500 12.500z"/><path d="M3.500 18v2.500h17V18M8 14l2 2M13 11l2 3"/>',
  'Breads': '<path d="M4 15c0-4.500 3-8 8-8s8 3.500 8 8v4H4z"/><path d="M9 10.500l1.500 3M13 10.500l1.500 3"/>',
  'Cheeses': '<path d="M3 17.500 20.500 11v6.500z"/><path d="M3 17.500 12 8l8.500 3"/><circle cx="9" cy="15" r=".8"/><circle cx="14" cy="14" r=".8"/>',
  'Salads & vegetables': '<path d="M5 19.500C5 10.500 11 5 20 5c0 9-5.500 15-14.500 15"/><path d="M5 19.500 14 10.500"/>',
  'Soups & stews': '<path d="M3.500 12.500h17a8.500 8.500 0 0 1-17 0z"/><path d="M9 4.500c-1.500 2 1.500 3 0 5.500M14.500 4.500c-1.500 2 1.500 3 0 5.500"/>',
  'Dips & small dishes': '<path d="M3.500 12.500h17l-2 7h-13z"/><path d="M8 9.500c1-2 3-2 4-.5 1-2 3-1.500 4 .5"/>',
  'Pasta': '<path d="M3.500 13.500h17a8.500 8.500 0 0 1-17 0z"/><path d="M8 13c0-3 1.500-6 4-8M12 13c0-3 1-6 3.500-8.500M16 13c0-2.500.500-5 2.500-7"/>',
  'Other savoury': '<path d="M7 3v7.500M4.500 3v5a2.500 2.500 0 0 0 5 0V3M7 11v10M16.500 3c-2.500 2-2.500 7 0 9v9"/>',
};
const icon = c => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[c] || ICONS['Other savoury']}</svg>`;
const GRAPE_IC = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="10" r="2.700"/><circle cx="14" cy="10" r="2.700"/><circle cx="11" cy="15" r="2.700"/><circle cx="17" cy="15" r="2.700"/><circle cx="14" cy="20" r="2.200"/><path d="M12 7V3c2 0 4 .5 5 2"/></svg>';
function heroSvg(v) {
  const T = {
    list:     {sky: ['#2a0f19', '#5a1a2c', '#a8503f'], sun: '#f0c46a', far: '#4a1a2a', mid: '#2e1a1c', grape: ['#5b1d44', '#7a2a5a'], sea: false},
    wineries: {sky: ['#0e2438', '#1c5470', '#7fb4c0'], sun: '#f6e2a6', far: '#1d4a62', mid: '#1b3a35', grape: ['#4a2a6a', '#6a3d8a'], sea: true},
    finder:   {sky: ['#2c2410', '#6b5420', '#d6a84a'], sun: '#fff0b8', far: '#5a4a1e', mid: '#2c3318', grape: ['#a8b84a', '#c9d466'], sea: false},
  }[v];
  const VX = 500, VY = 112, BY = 236, f = n => n.toFixed(1);
  // a vine row: leafy band narrowing toward the vanishing point, with posts, wire, leaves and grape bunches
  const row = cx => {
    const P = t => [cx + (VX - cx) * t, BY + (VY - BY) * t], W = t => 46 * (1 - t) + 1.2;
    const [x0, y0] = P(0), [x1, y1] = P(0.97), w0 = W(0), w1 = W(0.97);
    let o = `<path d="M${f(x0 - w0)} ${y0} L${f(x1 - w1)} ${f(y1)} L${f(x1 + w1)} ${f(y1)} L${f(x0 + w0)} ${y0}Z" fill="url(#vg)"/>`;
    o += `<path d="M${f(x0 - w0 * 1.5)} ${y0} L${f(x1)} ${f(y1)} L${f(x0 + w0 * 1.5)} ${y0}Z" fill="#120a08" fill-opacity=".35"/>`;
    for (let k = 0; k < 26; k++) {
      const t = 0.03 + k * 0.036, [x, y] = P(t), w = W(t), s = 1 - t;
      const side = k % 2 ? 1 : -1;
      o += `<ellipse cx="${f(x + side * w * 0.55)}" cy="${f(y - 13 * s)}" rx="${f(11 * s + 1)}" ry="${f(7 * s + .8)}" fill="${k % 3 ? '#3f7a34' : '#5c9a42'}" fill-opacity=".9" transform="rotate(${side * 28} ${f(x)} ${f(y)})"/>`;
    }
    for (const t of [0.1, 0.3, 0.47, 0.62, 0.74, 0.84]) {
      const [x, y] = P(t), s = 1 - t, h = 50 * s;
      o += `<path d="M${f(x)} ${f(y)}V${f(y - h)}" stroke="#d6b066" stroke-opacity=".55" stroke-width="${f(2.2 * s + .4)}"/>`;
    }
    for (const t of [0.06, 0.16, 0.27, 0.38, 0.5, 0.62, 0.72, 0.82]) {
      const [x, y] = P(t), s = 1 - t, w = W(t), r = 4.6 * s + .7;
      for (const side of [-1, 1]) {
        const bx = x + side * w * 0.8, by = y - 3 * s;
        o += `<g fill="${T.grape[0]}"><circle cx="${f(bx)}" cy="${f(by)}" r="${f(r)}"/><circle cx="${f(bx + r * 1.5)}" cy="${f(by)}" r="${f(r)}"/><circle cx="${f(bx + r * .75)}" cy="${f(by + r * 1.4)}" r="${f(r)}" fill="${T.grape[1]}"/><circle cx="${f(bx - r * .6)}" cy="${f(by + r * 1.4)}" r="${f(r)}"/><circle cx="${f(bx + r * 2.2)}" cy="${f(by + r * 1.4)}" r="${f(r)}"/><circle cx="${f(bx + r * .75)}" cy="${f(by + r * 2.8)}" r="${f(r)}"/></g>`;
      }
    }
    return o;
  };
  const rows = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(i => 500 + i * 150).sort((a, b) => Math.abs(b - 500) - Math.abs(a - 500)).map(row).join('');
  const sea = T.sea ? `<rect x="0" y="108" width="1000" height="22" fill="#2f7f95" fill-opacity=".55"/><g stroke="#f6e2a6" stroke-opacity=".35" fill="none" stroke-width="1.2">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${i * 170 - 20} ${116 + (i % 3) * 5}q16-6 32 0t32 0t32 0"/>`).join('')}</g><path d="M650 112 C690 84 740 78 800 96 C840 108 870 112 900 112Z" fill="#16324a"/>` : '';
  const cyp = [[96, 118], [124, 124], [878, 116], [906, 122]].map(([x, y]) => `<path d="M${x} ${y + 40} C${x - 9} ${y + 14} ${x - 4} ${y - 10} ${x} ${y - 26} C${x + 4} ${y - 10} ${x + 9} ${y + 14} ${x} ${y + 40}Z" fill="#0a0d08" fill-opacity=".85"/>`).join('');
  return `<svg viewBox="0 0 1000 236" preserveAspectRatio="xMidYMid slice" role="presentation"><defs>
    <linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.sky[0]}"/><stop offset=".55" stop-color="${T.sky[1]}"/><stop offset="1" stop-color="${T.sky[2]}"/></linearGradient>
    <radialGradient id="hg"><stop offset="0" stop-color="${T.sun}" stop-opacity=".95"/><stop offset=".3" stop-color="${T.sun}" stop-opacity=".3"/><stop offset="1" stop-color="${T.sun}" stop-opacity="0"/></radialGradient>
    <linearGradient id="vg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1f4a22"/><stop offset="1" stop-color="#4f8a3a"/></linearGradient></defs>
    <rect width="1000" height="236" fill="url(#hs)"/><circle cx="745" cy="78" r="140" fill="url(#hg)"/><circle cx="745" cy="78" r="24" fill="${T.sun}"/>
    <path d="M0 112 C110 78 220 86 340 100 C460 114 560 80 690 84 C800 88 900 104 1000 92 V150 H0Z" fill="${T.far}"/>${sea}
    <path d="M0 126 C140 104 300 112 440 122 C580 132 700 108 840 114 C920 118 960 124 1000 122 V236 H0Z" fill="${T.mid}"/>
    ${cyp}${rows}</svg>`;
}
const dishesOf = {};
ALLR.forEach(r => [...r.labels.filter(l => l.listed).map(l => l.name), ...r.more].forEach(id => { (dishesOf[id] = dishesOf[id] || []).includes(r) || dishesOf[id].push(r); }));
const sortD = a => a.slice().sort((x, y) => L(x, 'name').localeCompare(L(y, 'name'), lang));
function seasonText(r) {
  const w = SEASONAL[r.name];
  if (!w) return t('allYear');
  const nm = m => MONTHS[m - 1][lang];
  return w.length === 1 ? nm(w[0]) : nm(w[0]) + '–' + nm(w[w.length - 1]);
}
function recipeCard(r) {
  const alt = L(r, 'alt');
  const facts = r.category === 'Cheeses' ? '' : `<p class="facts"><span>${esc(t('season'))}: <b>${esc(seasonText(r))}</b></span><span>${esc(HARD.has(r.name) ? t('slow') : t('easy'))}</span>${FRIED.has(r.name) ? `<span>${esc(t('fried'))}</span>` : ''}</p>`;
  return `<article class="card"><div class="chead">${icon(r.category)}<div><h3>${esc(L(r, 'name'))}</h3>
    <div class="meta">${esc(L(r, 'category'))} · ${esc(L(r, 'ingredients'))}</div></div></div>${facts}
    <p class="grape">${esc(t('bestGrape'))}: <b>${esc(L(r, 'grape'))}</b>${alt ? ` <span class="also">· ${esc(t('alt'))}: ${esc(alt)}</span>` : ''}</p>
    <p class="why">${esc(L(r, 'why'))}.</p><ul class="labels">${r.labels.map(labelHtml).join('')}</ul>
    ${r.more.length ? `<div class="more"><b>${esc(t('more'))}</b><ul class="labels">${r.more.map(id => wineLink(byId[id])).join('')}</ul></div>` : ''}</article>`;
}
function serveTemp(w) {
  const txt = (w.palate + ' ' + w.wine).toLowerCase();
  if (/sparkling|brut|pet-nat/.test(txt) && !/semi-sparkling/.test(txt)) return '6–8°C';
  if (w.colour.indexOf('skin') > -1) return '12–14°C';
  return {White: '8–11°C', 'Rosé': '10–12°C', Red: '15–17°C'}[colourKey(w)];
}
const pairsLabel = w => w.gen ? `${t('pairsGen')} (${w.gen[lang]})` : t('pairs');
function wineCard(w) {
  const also = L(w, 'also'), pairs = L(w, 'pairs');
  const site = D.sites[w.winery] ? D.sites[w.winery].replace(/^(https?:\/\/)?/, 'https://') : '';
  const facts = `<p class="facts"><span>${esc(t('serve'))}: <b>${serveTemp(w)}</b></span>${site ? `<span><a href="${esc(site)}" target="_blank" rel="noopener">${esc(t('estateSite'))} ↗</a></span>` : ''}</p>`;
  return `<article class="card wine">
    <h3>${bottle(w)}${esc(L(w, 'name'))}</h3>
    <div class="meta"><span class="dot ${colourKey(w)}" style="display:inline-block"></span> ${esc(L(w, 'winery'))} · ${esc(L(w, 'region'))} · ${esc(L(w, 'colour'))}${L(w, 'grapes') ? ' · ' + esc(L(w, 'grapes')) : ''}</div>${facts}
    ${(L(w, 'nose') + L(w, 'palate')).trim() ? `<p class="notes">${esc(L(w, 'nose'))} ${esc(L(w, 'palate'))}</p>` : ''}
    <dl>${pairs ? `<dt>${esc(pairsLabel(w))}</dt><dd${w.gen ? ' class="gen"' : ''}>${esc(pairs)}</dd>` : ''}${also ? `<dt>${esc(t('also'))}</dt><dd class="also">${esc(also)}</dd>` : ''}${(dishesOf[w.id] || []).length ? `<dt>${esc(t('dishesFor'))}</dt><dd>${dishesOf[w.id].slice(0, 6).map(r => `<a class="wl rl" data-dish="${esc(r.name)}">${esc(L(r, 'name'))}</a>`).join(', ')}</dd>` : ''}</dl></article>`;
}
function profileCard(g) {
  const p = g[lang];
  return `<article class="card profile"><div class="chead">${GRAPE_IC}<h3>${esc(lang === 'el' ? g.el_name : g.key)}</h3></div><p class="tagline">${esc(p.tag)}</p>
    <ul>${p.items.map(i => `<li><b>${esc(i[0])}</b><span>${esc(i[1])}</span></li>`).join('')}</ul></article>`;
}
const wineries = [...new Set(W.map(w => w.winery))], wineryEl = Object.fromEntries(W.map(w => [w.winery, w.el.winery]));
const varCount = {};
W.forEach(w => w.vars.forEach(v => varCount[v] = (varCount[v] || 0) + 1));
const varieties = Object.keys(varCount).sort((a, b) => varCount[b] - varCount[a] || a.localeCompare(b));
const regions = [...new Set(W.map(w => w.region))], regionEl = Object.fromEntries(W.map(w => [w.region, w.el.region]));
function listRow(w, rank) {
  const pairs = L(w, 'pairs'), also = L(w, 'also');
  return `<div class="lrow"><div><h3>${rank ? `<span class="rank">${rank}</span>` : ''}${bottle(w)}<a class="wl" data-wine="${esc(w.id)}">${esc(L(w, 'name'))}</a></h3>
    <div class="meta"><span class="dot ${colourKey(w)}" style="display:inline-block"></span> ${rank ? esc(L(w, 'winery')) + ' · ' : ''}${esc(L(w, 'region'))} · ${esc(L(w, 'colour'))}${L(w, 'grapes') ? ' · ' + esc(L(w, 'grapes')) : ''}</div></div>
    <div class="lcol${w.gen ? ' gen' : ''}">${pairs ? `<b>${esc(pairsLabel(w))}</b>${esc(pairs)}` : ''}</div>
    <div class="lcol also">${also ? `<b>${esc(t('also'))}</b>${esc(also)}` : ''}</div></div>`;
}
function placeLabels(items, vb) {
  // greedy label placement: try eight positions around each marker and keep the one that overlaps least
  const FS = 10.5, H = FS + 3, placed = [], out = {};
  const hit = (a, b) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const circ = items.map(o => ({x1: o.x - o.rad - 1, y1: o.y - o.rad - 1, x2: o.x + o.rad + 1, y2: o.y + o.rad + 1}));
  const order = items.map((o, k) => [k, items.filter(q => q !== o && Math.hypot(q.x - o.x, q.y - o.y) < 70).length]).sort((a, b) => b[1] - a[1]);
  order.forEach(([k]) => {
    const o = items[k], w = o.text.length * 5.9 + 4, g = o.rad + 3;
    const cands = [
      {a: 'start', x: o.x + g, y: o.y + 4, box: [o.x + g, o.y - H / 2 + 1]},
      {a: 'end', x: o.x - g, y: o.y + 4, box: [o.x - g - w, o.y - H / 2 + 1]},
      {a: 'middle', x: o.x, y: o.y - g - 2, box: [o.x - w / 2, o.y - g - H + 1]},
      {a: 'middle', x: o.x, y: o.y + g + 9, box: [o.x - w / 2, o.y + g]},
      {a: 'start', x: o.x + g * .8, y: o.y - g * .8, box: [o.x + g * .8, o.y - g * .8 - H + 2]},
      {a: 'end', x: o.x - g * .8, y: o.y - g * .8, box: [o.x - g * .8 - w, o.y - g * .8 - H + 2]},
      {a: 'start', x: o.x + g * .8, y: o.y + g * .8 + 8, box: [o.x + g * .8, o.y + g * .8]},
      {a: 'end', x: o.x - g * .8, y: o.y + g * .8 + 8, box: [o.x - g * .8 - w, o.y + g * .8]},
    ].map((c, idx) => {
      const b = {x1: c.box[0], y1: c.box[1], x2: c.box[0] + w, y2: c.box[1] + H};
      let cost = idx * 2;
      circ.forEach((q, qi) => { if (qi !== k) cost += hit(b, q) * 6; else cost += hit(b, q) * 40; });
      placed.forEach(q => { cost += hit(b, q) * 8; });
      if (b.x1 < 2 || b.x2 > vb[0] - 2 || b.y1 < 2 || b.y2 > vb[1] - 2) cost += 4000;
      return {c, b, cost};
    }).sort((p, q) => p.cost - q.cost)[0];
    placed.push(cands.b);
    out[o.r] = cands.c;
  });
  return out;
}
function mapHtml() {
  const M = D.map, n = {};
  W.forEach(w => { (n[w.region] = n[w.region] || new Set()).add(w.winery); });
  const nameOf = r => lang === 'el' ? (regionEl[r] || M.el[r] || r) : r;
  const vb = M.viewBox.split(' ').slice(2).map(Number);
  const act = Object.keys(n).map(r => ({r, x: M.pts[r][0], y: M.pts[r][1], rad: Math.round(6.5 + Math.sqrt(n[r].size) * 2.1), text: nameOf(r)}));
  const pos = placeLabels(act, vb);
  const hollow = Object.keys(M.pts).filter(r => !n[r]).map(r => `<g class="pt empty" data-empty="1"><title>${esc(nameOf(r))}</title><circle cx="${M.pts[r][0]}" cy="${M.pts[r][1]}" r="4.5"/></g>`).join('');
  const dots = hollow + act.map(o => {
    const r = o.r, c = n[r].size, name = o.text, l = pos[r];
    return `<g class="pt${state.region === r ? ' on' : ''}" data-region="${esc(r)}" tabindex="0" role="button" aria-label="${esc(name)}, ${c} ${c === 1 ? t('est1') : t('estN')}">
      <title>${esc(name)} · ${c} ${c === 1 ? t('est1') : t('estN')}</title><circle cx="${o.x}" cy="${o.y}" r="${o.rad}"/><text x="${o.x}" y="${o.y + 3.6}">${c}</text></g><text class="lbl" x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="${l.a}">${esc(name)}</text>`;
  }).join('');
  const sel = state.region ? nameOf(state.region) : '';
  const cnt = state.region ? n[state.region].size : 0;
  return `<div class="mapwrap"><svg class="gmap" viewBox="${M.viewBox}" role="group" aria-label="${esc(t('mapAria'))}">${M.paths.map(p => `<path class="land" d="${p}"/>`).join('')}${dots}</svg>
    ${sel ? `<div class="mapinfo"><h3>${esc(sel)}</h3><p>${cnt} ${cnt === 1 ? t('est1') : t('estN')}</p><button type="button" data-mapclear>${esc(t('mapAll'))}</button></div>` : ''}</div>`;
}
// A short story and a practical tip per estate (estate_notes.py)
function noteHtml(name) {
  const n = D.notes[name];
  if (!n) return '';
  return `<div class="estnote"><p>${esc(n.story[lang])}</p>${n.tip ? `<p class="tip"><b>Tip</b> ${esc(n.tip[lang])}</p>` : ''}</div>`;
}
function renderWineries() {
  const terms = norm(state.q.trim()).split(/\s+/).filter(Boolean);
  const ok = w => (!state.region || w.region === state.region) && terms.every(x => wineText(w).includes(x));
  const groups = wineries.map(name => ({name, ws: W.filter(w => w.winery === name && ok(w))})).filter(g => g.ws.length);
  if (!groups.length) return `<p class="empty">${esc(t('none'))}</p>`;
  const nm = g => lang === 'el' ? wineryEl[g.name] : g.name;
  groups.sort((a, b) => nm(a).localeCompare(nm(b), lang));
  const meta = w => `${esc(L(w, 'colour'))}${L(w, 'grapes') ? ' · ' + esc(L(w, 'grapes')) : ''}`;
  const pillOf = (g, rank) => {
    const n = W.filter(w => w.winery === g.name).length, reg = [...new Set(g.ws.map(w => lang === 'el' ? w.el.region : w.region))].join(', ');
    const top = g.ws.find(w => w.id === D.tops[g.name]) || g.ws[0];
    const url = D.sites[g.name] ? D.sites[g.name].replace(/^(https?:\/\/)?/, 'https://') : '';
    const site = url ? `<a class="wl site" href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https:\/\/(www\.)?/, '').split('?')[0].replace(/\/$/, ''))}</a>` : '';
    const rows = g.ws.map(w => `<li><span class="dot ${colourKey(w)}"></span><a class="wl" data-wine="${esc(w.id)}">${esc(L(w, 'name'))}</a><small>${meta(w)}</small>${L(w, 'pairs') ? `<p${w.gen ? ' class="gen"' : ''}>${w.gen ? `<i>${esc(pairsLabel(w))}:</i> ` : ''}${esc(L(w, 'pairs'))}</p>` : ''}</li>`).join('');
    return `<details class="pill" data-w="${esc(g.name)}"${openEstates.has(g.name) ? ' open' : ''}><summary>
      <span class="pill-head"><span class="pill-name">${rank ? `<span class="rank">${rank}</span>` : ''}${esc(nm(g))}</span><span class="meta">${esc(reg)} · ${n} ${n === 1 ? t('label1') : t('labelsN')}</span></span>
      <span class="pill-top"><span class="dot ${colourKey(top)}"></span><span><b>${esc(L(top, 'name'))}</b><small>${meta(top)}</small></span></span>
      <span class="pill-plus" aria-hidden="true"></span></summary>
      <div class="pill-body">${noteHtml(g.name)}${site ? `<div class="meta">${site}</div>` : ''}<ul>${rows}</ul></div></details>`;
  };
  const mapBlock = mapHtml();
  const favs = D.favs.map(f => groups.find(g => g.name === f)).filter(Boolean);
  const rest = groups.filter(g => !D.favs.includes(g.name));
  const filtering = state.q.trim() || state.region;
  const favHtml = favs.map(g => pillOf(g, D.favs.indexOf(g.name) + 1)).join('');
  const restHtml = rest.map(g => pillOf(g, 0)).join('');
  if (filtering || !favs.length) return mapBlock + `<div class="count">${groups.length} ${lang === 'el' ? 'κτήματα' : 'estates'}</div><div class="pills">${favHtml}${restHtml}</div>`;
  return mapBlock + `<h2 class="fav-title">${esc(t('favTitle'))}</h2><div class="pills favs">${favHtml}</div>
    <h2>${esc(t('allEstates'))}</h2><div class="count">${rest.length} ${lang === 'el' ? 'κτήματα' : 'estates'}</div><div class="pills">${restHtml}</div>`;
}
const openEstates = new Set();

// The title and text of each month describe its own Top 10 (see yearPlan): rewrite them whenever the list changes.
const MONTHS = [
  {en: 'January', el: 'Ιανουάριος', icon: 'snow',
    title: {en: 'January: cabbage, leeks and slow-cooked meat', el: 'Ιανουάριος: λάχανο, πράσα και μαγειρευτά'},
    lede: {en: 'Cabbage, cauliflower, fennel and beetroot salads, beef with leeks or celery, pork with leeks and cabbage rolls: whites and rosé for most of the table, a Xinomavro for the trahana with sausage.', el: 'Λαχανοσαλάτα, κουνουπίδι, φινόκιο και παντζάρι, μοσχάρι με πράσα ή με σέλινο, χοιρινό με πράσα και λαχανοσαρμάδες: λευκά και ροζέ για το μεγαλύτερο μέρος του τραπεζιού, ένα Ξινόμαυρο για τον τραχανά με λουκάνικο.'}},
  {en: 'February', el: 'Φεβρουάριος', icon: 'snow',
    title: {en: 'February: lemon, fish soup and greens', el: 'Φεβρουάριος: λεμόνι, ψαρόσουπα και χόρτα'},
    lede: {en: 'Fish soup and steamed fish with lemon oil, egg-lemon chicken soup, pork with celery, broccoli, chicory and a spinach omelette: fuller whites, a Xinomavro for the sausages with leeks.', el: 'Ψαρόσουπα και αχνιστό ψάρι με λαδολέμονο, κοτόσουπα αυγολέμονο, χοιρινό με σέλινο, μπρόκολο, ραδίκια και σπανακομελέτα: λευκά με σώμα, ένα Ξινόμαυρο για τα λουκάνικα με πράσα.'}},
  {en: 'March', el: 'Μάρτιος', icon: 'flower',
    title: {en: 'March: artichokes, lemon and Lent', el: 'Μάρτιος: αγκινάρες, λεμόνι και Σαρακοστή'},
    lede: {en: 'Artichokes and lemon, lemon chicken and pork, spinach rice, leek rice and chickpea soup for Lent, beetroot with skordalia and giouvarlakia avgolemono: aromatic whites, a rosé for the beetroot and the calamari.', el: 'Αγκινάρες και λεμόνι, κοτόπουλο και χοιρινό λεμονάτο, σπανακόρυζο, πρασόρυζο και ρεβιθάδα για τη Σαρακοστή, παντζάρια με σκορδαλιά και γιουβαρλάκια αυγολέμονο: αρωματικά λευκά, ένα ροζέ για τα παντζάρια και το καλαμάρι.'}},
  {en: 'April', el: 'Απρίλιος', icon: 'flower',
    title: {en: 'April: peas, asparagus and Easter', el: 'Απρίλιος: αρακάς, σπαράγγια και Πάσχα'},
    lede: {en: 'Peas with artichokes, lamb or beef, asparagus with eggs or pasta, radish salad, steamed mussels and cod with skordalia, with the Easter kokoretsi: fresh whites, a rosé for the lamb, a Xinomavro for the kokoretsi.', el: 'Αρακάς με αγκινάρες, με αρνάκι ή με μοσχάρι, σπαράγγια με αυγά ή μακαρονάδα, σαλάτα με ραπανάκια, μύδια αχνιστά και μπακαλιάρος με σκορδαλιά, με το κοκορέτσι της Λαμπρής: δροσερά λευκά, ένα ροζέ για το αρνάκι, ένα Ξινόμαυρο για το κοκορέτσι.'}},
  {en: 'May', el: 'Μάιος', icon: 'flower',
    title: {en: 'May: mayiatiko and the first olive-oil dishes', el: 'Μάιος: μαγιάτικο και τα πρώτα λαδερά'},
    lede: {en: 'Mayiatiko and sea bream on the grill, peas and flat beans in olive oil, lettuce and spinach salads, an omelette and dolmadakia: crisp whites, and a rosé for the soutzoukakia.', el: 'Μαγιάτικο και τσιπούρα στη σχάρα, αρακάς και πλατιά φασολάκια λαδερά, μαρουλοσαλάτα και σαλάτα με σπανάκι, ομελέτα και ντολμαδάκια: δροσερά λευκά και ένα ροζέ για τα σουτζουκάκια.'}},
  {en: 'June', el: 'Ιούνιος', icon: 'sun',
    title: {en: 'June: sardines, mackerel and the grill', el: 'Ιούνιος: σαρδέλες, σκουμπρί και ψητά στη σχάρα'},
    lede: {en: 'Sardines and mackerel on the grill, chicken souvlaki, lamb and pork chops, green beans, a courgette frittata and an omelette with tomato: Assyrtiko for the fish, rosé for the grilled meats.', el: 'Σαρδέλες και σκουμπρί στη σχάρα, κοτόπουλο σουβλάκι, παϊδάκια και χοιρινές μπριζόλες, φασολάκια λαδερά, σφουγγάτο με κολοκυθάκια και ομελέτα με ντομάτα: Ασύρτικο για τα ψάρια, ροζέ για τα ψητά κρέατα.'}},
  {en: 'July', el: 'Ιούλιος', icon: 'sun',
    title: {en: 'July: watermelon with feta, octopus and fresh tomato', el: 'Ιούλιος: καρπούζι με φέτα, χταπόδι και φρέσκια ντομάτα'},
    lede: {en: 'Watermelon with feta, vlita, prawns and grilled octopus, beef with green beans, tomato pie and pasta with fresh tomato: light whites and rosé, and a light red for the kontosouvli.', el: 'Καρπούζι με φέτα, βλήτα, γαριδάκι και χταπόδι στη σχάρα, μοσχάρι με φασολάκια, πίτα με ντομάτα και μακαρονάδα με φρέσκια ντομάτα: ελαφριά λευκά και ροζέ, και ένα ελαφρύ κόκκινο για το κοντοσούβλι.'}},
  {en: 'August', el: 'Αύγουστος', icon: 'sun',
    title: {en: 'August: aubergines, peppers and courgettes', el: 'Αύγουστος: μελιτζάνες, πιπεριές και κολοκυθάκια'},
    lede: {en: 'Spetsofai, imam and beef with aubergines, Greek salad and briam, grilled squid and stuffed courgettes: dry rosé for the tomato and the aubergine, fresh whites for the sea and the courgettes.', el: 'Σπετσοφάι, ιμάμ και μοσχάρι με μελιτζάνες, χωριάτικη και μπριάμ, καλαμαράκια ψητά και κολοκυθάκια γεμιστά: ξηρό ροζέ για τη ντομάτα και τη μελιτζάνα, φρέσκα λευκά για τη θάλασσα και τα κολοκυθάκια.'}},
  {en: 'September', el: 'Σεπτέμβριος', icon: 'leaf',
    title: {en: 'September: sea bass, figs and the last of summer', el: 'Σεπτέμβριος: λαβράκι, σύκα και τα τελευταία του καλοκαιριού'},
    lede: {en: 'Sea bass and marinated anchovies, figs with cheese, dakos, ladenia, roasted peppers and aubergines, and a lobster pasta to close the summer: whites with acidity and rosé.', el: 'Λαβράκι και γαύρος μαρινάτος, σύκα με τυρί, ντάκος, λαδένια, ψητές πιπεριές και μελιτζάνες, και μια αστακομακαρονάδα για το τέλος του καλοκαιριού: λευκά με οξύτητα και ροζέ.'}},
  {en: 'October', el: 'Οκτώβριος', icon: 'leaf',
    title: {en: 'October: pumpkin, autumn fish and red stews', el: 'Οκτώβριος: κολοκύθα, ψάρια του φθινοπώρου και κοκκινιστά'},
    lede: {en: 'Pumpkin soup and lentils, sole and fresh cod, cauliflower and beef in tomato, a beef steak and kleftiko lamb: fuller whites for the fish and soups, rosé and a little red for the meat.', el: 'Κολοκυθόσουπα και φακές, γλώσσα και φρέσκος μπακαλιάρος, κουνουπίδι και μοσχάρι κοκκινιστό, μπριζόλα και αρνί κλέφτικο: λευκά με σώμα για τα ψάρια και τις σούπες, ροζέ και λίγο κόκκινο για το κρέας.'}},
  {en: 'November', el: 'Νοέμβριος', icon: 'leaf',
    title: {en: 'November: mushrooms, chestnuts and pomegranate', el: 'Νοέμβριος: μανιτάρια, κάστανα και ρόδι'},
    lede: {en: 'Grilled mushrooms and a mushroom omelette, pomegranate salad, red mullet, pork with chestnuts or cabbage, bean soup and cockerel stifado: rosé and whites with body.', el: 'Μανιτάρια ψητά και ομελέτα με μανιτάρια, σαλάτα με ρόδι, μπαρμπούνια, χοιρινό με κάστανα ή με λάχανο, φασολάδα και κόκορας στιφάδο: ροζέ και λευκά με σώμα.'}},
  {en: 'December', el: 'Δεκέμβριος', icon: 'snow',
    title: {en: 'December: mushrooms, grouper and the festive turkey', el: 'Δεκέμβριος: μανιτάρια, συναγρίδα και γιορτινή γαλοπούλα'},
    lede: {en: 'Mushroom soup and mushroom pasta, grouper in the oven, pear and walnut salad, baked beans and chickpeas, and turkey for the feast: fuller whites and rosé.', el: 'Μανιταρόσουπα και μακαρονάδα με μανιτάρια, συναγρίδα στο φούρνο, σαλάτα με αχλάδι και καρύδια, γίγαντες και ρεβίθια στο φούρνο, και γαλοπούλα για τη γιορτή: λευκά με σώμα και ροζέ.'}},
];
const SEASON_ICONS = {
  snow: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  flower: '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C12 6 10.5 4 12 3c1.5 1 0 3 0 6.5zM14.5 12c3.5 0 5.5-1.5 6.5 0-1 1.5-3 0-6.5 0zM12 14.5c0 3.5 1.5 5.5 0 6.5-1.5-1 0-3 0-6.5zM9.5 12C6 12 4 13.5 3 12c1-1.5 3 0 6.5 0z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  leaf: '<path d="M12 21c-5-3-8-8-6-15 4 0 8 1 10 5 2 4 0 8-4 10zM12 21c0-5 1-8 4-11"/>',
};
let monthOverride = null;
function monthIndex() {
  if (monthOverride !== null) return monthOverride;
  const q = parseInt(new URLSearchParams(location.search).get('month'), 10);
  return q >= 1 && q <= 12 ? q - 1 : new Date().getMonth();
}
const SEASONAL = {
  // checked against Antonis's list of Greek seasonal produce (2026-10-22); dishes not listed are available all year
  // dips and meze
  'Melitzanosalata': [6, 7, 8, 9], 'Tzatziki': [5, 6, 7, 8, 9], 'Tomato Fritters': [6, 7, 8, 9], 'Dakos': [6, 7, 8, 9],
  // cheeses
  'Katiki Domokou': [3, 4, 5, 6, 7, 8], 'Anthotyro': [3, 4, 5, 6, 7, 8], 'Mizithra': [3, 4, 5, 6, 7, 8],
  // salads and vegetables
  'Greek Salad': [6, 7, 8, 9], 'Warm Potato Salad': [10, 11, 12, 1, 2, 3], 'Briam': [6, 7, 8, 9], 'Smoked Peppers and Aubergines': [6, 7, 8, 9],
  'Gemista': [6, 7, 8, 9], 'Gigantes': [10, 11, 12, 1, 2, 3], 'Yiahni': [6, 7, 8, 9], 'Fried Courgettes': [4, 5, 6, 7, 8, 9],
  'Stuffed Courgette Flowers': [5, 6, 7],
  // pies and breads
  'Wild Greens Pie': [11, 12, 1, 2, 3, 4, 5], 'Courgette Pie': [4, 5, 6, 7, 8, 9], 'Kreatopita': [10, 11, 12, 1, 2, 3],
  'Ladenia': [6, 7, 8, 9], 'Flatbread with Tomato and Olives': [6, 7, 8, 9],
  // soups and stews (lemons are in season November to April)
  'Kotosoupa Avgolemono': [11, 12, 1, 2, 3, 4], 'Giouvarlakia Avgolemono': [11, 12, 1, 2, 3, 4], 'Fish Soup': [10, 11, 12, 1, 2, 3, 4, 5],
  'Lentil Soup': [10, 11, 12, 1, 2, 3], 'Mushroom Soup with Tahini': [10, 11, 12, 1, 2, 3], 'Trahana with Country Sausage': [11, 12, 1, 2, 3],
  // meat and poultry
  'Moussaka': [6, 7, 8, 9], 'Kokkinisto': [10, 11, 12, 1, 2, 3, 4], 'Roast Chicken with Lemon Potatoes': [11, 12, 1, 2, 3, 4], 'Pork with Wine and Lemon': [11, 12, 1, 2, 3, 4],
  'Lamb Kleftiko': [3, 4, 5, 10, 11], 'Roast Lamb with Potatoes': [3, 4, 5], 'Lamb Chops': [4, 5, 6, 7, 8, 9], 'Kontosouvli': [2, 6, 7, 8, 9],
  'Kokoretsi': [4], 'Roast Suckling Pig': [12, 1, 4], 'Spetsofai': [7, 8, 9], 'Rooster Stifado': [10, 11, 12, 1, 2],
  'Rabbit Stifado': [10, 11, 12, 1, 2, 3], 'Stuffed Leaves with Mince': [10, 11, 12, 1, 2, 3],
  // fish and seafood
  'Grilled Octopus': [5, 6, 7, 8, 9], 'Baked Fish with Tomatoes': [6, 7, 8, 9], 'Shrimp Saganaki': [6, 7, 8, 9], 'Marinated Anchovies': [4, 8, 9, 11],
  'Lobster Spaghetti': [6, 7, 8, 9], 'Symi Shrimp': [5, 6, 7, 8, 9], 'Fried Cod with Skordalia': [3, 4],
  // seasonal dishes added from the month's produce
  'Leek and Rice': [11, 12, 1, 2, 3], 'Spinach and Rice': [10, 11, 12, 1, 2, 3, 4], 'Pork with Cabbage': [11, 12, 1, 2], 'Pork with Celery': [12, 1, 2, 3],
  'Chickpea Soup': [11, 12, 1, 2, 3], 'Artichokes a la Polita': [2, 3, 4], 'Asparagus with Eggs': [3, 4, 5],
  'Peas with Artichokes': [3, 4, 5], 'Lamb Fricassee': [3, 4, 5], 'Magiritsa': [4], 'Peas Stewed in Olive Oil': [4, 5, 6], 'Lettuce and Dill Salad': [3, 4, 5, 6],
  'Green Beans in Tomato': [5, 6, 7, 8, 9], 'Boiled Vlita': [5, 6, 7, 8, 9], 'Stuffed Courgettes': [4, 5, 6, 7, 8, 9], 'Beetroot with Skordalia': [11, 12, 1, 2, 3, 4],
  'Okra in Tomato': [6, 7, 8, 9], 'Stuffed Squid': [5, 6, 7, 8, 9], 'Grilled Sardines': [3, 4, 5, 6, 7, 8, 9, 10], 'Courgette Fritters': [5, 6, 7, 8, 9],
  'Imam Baildi': [7, 8, 9], 'Papoutsakia': [7, 8, 9], 'Grilled Sea Bream': [12, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'Watermelon and Feta Salad': [6, 7, 8],
  'Roasted Peppers with Feta': [8, 9], 'Fig and Cheese Salad': [8, 9], 'Pomegranate and Lettuce Salad': [10, 11, 12], 'Grilled Mushrooms': [10, 11, 12],
  'Pumpkin Soup': [10], 'Cauliflower in Tomato': [10, 11, 12, 1, 2], 'Pork with Chestnuts': [11, 12], 'Beetroot Salad': [10, 11, 12, 1, 2, 3, 4],
  'Boiled Broccoli': [11, 12, 1, 2, 3, 4], 'Cabbage Salad': [11, 12, 1, 2, 3], 'Stuffed Turkey': [12], 'Fennel and Orange Salad': [11, 12, 1, 2, 3],
  // mountain dishes (Gastronomos article)
  'Metsovo Kasiata': [10, 11, 12, 1, 2, 3],
  'Samarina Meatballs with Onions': [10, 11, 12, 1, 2, 3],
  'Gigantes with Wild Greens': [10, 11, 12, 1, 2, 3],
  'Cabbage with Milk': [11, 12, 1, 2, 3],
  'Vlach Leek Pie': [11, 12, 1, 2, 3],
  'Mutton with Gigantes': [10, 11, 12, 1, 2, 3],
  'Nettle Pie': [1, 2, 3, 4],
  'Cabbage Rolls Avgolemono': [11, 12, 1, 2, 3],
  'Boubari': [11, 12, 1, 2],
  'Vine Leaves Stuffed with Goat': [10, 11, 12, 1, 2, 3],
  'Roe Deer with Walnuts': [10, 11, 12, 1, 2],
  'Fried Bread of Agrafa': [10, 11, 12, 1, 2, 3],
  'Pork with Leeks': [11, 12, 1, 2, 3],
  'Wild Boar with Leeks': [10, 11, 12, 1, 2],
  'Tzoumleka': [10, 11, 12, 1, 2, 3],
  'Pumpkin Pie with Pasta': [10, 11, 12, 1],
  'Pispilita': [10, 11, 12, 1, 2, 3, 4],
  'Sout Makalo': [10, 11, 12, 1, 2, 3],
  'Wild Boar in Wine Sauce': [10, 11, 12, 1, 2],
  'Metsovo Cabbage Pie': [10, 11, 12, 1, 2, 3],
  'Pork Tigania with Feta': [10, 11, 12, 1, 2, 3, 4],
  'Sausages with Leeks': [11, 12, 1, 2, 3],
  'Batzina': [10, 11, 12, 1],
  'Kaskoutigan': [10, 11, 12, 1, 2, 3, 4],
  'Pelion Goat Meatballs': [10, 11, 12, 1, 2, 3],
  'Gourgoulopita': [10, 11, 12, 1, 2, 3],
  'Pelion Fasolada with Sausage': [10, 11, 12, 1, 2, 3],
  'Petropita': [10, 11, 12, 1, 2, 3],
  'Trahana with Cheese and Paprika': [11, 12, 1, 2, 3],
  'Plum Stifado': [10, 11, 12, 1, 2],
  'Leek and Mince Pie': [10, 11, 12, 1, 2, 3],
  // fish by month (Antonis's seasonal fish text)
  'Fried Red Mullet': [9, 10, 11, 12, 1, 2, 3, 4],
  'Grilled Mackerel': [4, 5, 6, 7, 8, 9],
  'Fried Sole': [2, 3, 4, 5, 10, 11],
  'Baked Grouper (Synagrida)': [9, 10, 11, 12, 1, 2, 4],
  'Fried Whitebait': [1, 2, 3, 6, 7, 8, 9, 11],
  'Grilled Swordfish (Mayiatiko)': [4, 5, 6],
  'Grilled Sea Bass': [6, 7, 8, 9, 10, 11, 12],
  'Baked Fresh Cod': [10, 11, 12, 1],
  'Steamed Fish with Lemon Oil': [11, 12, 1, 2, 3, 4, 5],
  // more easy seasonal dishes
  'Boiled Chicory': [11, 12, 1, 2, 3],
  'Chicken with Artichokes': [2, 3, 4],
  'Lemon Grilled Chicken': [3, 4, 5],
  'Spinach and Strawberry Salad': [5, 6],
  'Broad Green Beans in Olive Oil': [5, 6],
  'Grilled Vegetables': [6, 7, 8, 9],
  'Fried Aubergines with Skordalia': [6, 7, 8, 9],
  'Pear and Walnut Salad': [11, 12, 1],
  'Mushroom Pasta': [10, 11, 12, 1, 2],
  'Baked Potatoes with Leeks': [11, 12, 1, 2],
  'Fried Cauliflower': [11, 12, 1, 2, 3],
  'Chicken with Okra': [6, 7, 8, 9],
  'Baked Chickpeas': [11, 12, 1, 2, 3],
  'Lamb with Peas': [3, 4, 5],
  'Radish, Dill and Feta Salad': [3, 4, 5], 'Courgettes with Egg-Lemon': [5, 6, 7, 8, 9], 'Pasta with Fresh Tomato and Basil': [6, 7, 8, 9],
  'Chicken Souvlaki': [4, 5, 6, 7, 8, 9], 'Grilled Sausages': [5, 6, 7, 8, 9], 'Grilled Pork Chops': [4, 5, 6, 7, 8, 9], 'Omelette with Feta and Spring Onion': [3, 4, 5, 6],
  'Omelette with Feta and Tomato': [6, 7, 8, 9], 'Grilled Squid': [5, 6, 7, 8, 9],
  'Pasta with Asparagus': [3, 4, 5],
  'Mushroom Omelette': [10, 11, 12, 1, 2], 'Courgette Frittata': [4, 5, 6, 7, 8, 9], 'Potato Omelette': [10, 11, 12, 1, 2, 3], 'Spinach Omelette': [11, 12, 1, 2, 3, 4],
  'Beef with Okra': [6, 7, 8, 9], 'Beef with Green Beans': [5, 6, 7, 8, 9], 'Beef with Peas': [3, 4, 5], 'Beef with Celery in Egg-Lemon': [11, 12, 1, 2, 3], 'Beef with Leeks': [11, 12, 1, 2, 3],
  'Beef with Aubergines': [7, 8, 9],
  // autumn dishes from Grape magazine (quinces Oct-Dec, chestnuts Nov-Dec)
  'Beef with Quinces': [10, 11, 12], 'Pork with Quinces': [10, 11, 12], 'Chestnut Stifado': [11, 12], 'Pork with Mastic': [10, 11, 12, 1, 2, 3],
  // other
  'Dolmadakia': [4, 5, 6], 'Orzo with Baked Tomatoes': [6, 7, 8, 9], 'Strapatsada': [6, 7, 8, 9],
};
// slow, fiddly or special-occasion dishes: the monthly Top 10 holds at most one of them (Antonis: everyday, quick and easy)
const HARD = new Set(['Beef with Quinces', 'Kokoretsi', 'Roast Suckling Pig', 'Stuffed Turkey', 'Magiritsa', 'Lamb Kleftiko', 'Roast Lamb with Potatoes',  'Kontosouvli', 'Pastitsio', 'Moussaka', 'Gemista', 'Stuffed Leaves with Mince', 'Stuffed Squid', 'Stuffed Courgettes', 'Stuffed Courgette Flowers', 'Dolmadakia', 'Papoutsakia', 'Boubari', 'Vine Leaves Stuffed with Goat', 'Roe Deer with Walnuts', 'Wild Boar with Leeks', 'Wild Boar in Wine Sauce', 'Tzoumleka', 'Sout Makalo', 'Mutton with Gigantes', 'Rooster Stifado', 'Rabbit Stifado', 'Rolled Meatloaf', 'Lobster Spaghetti', 'Lamb Fricassee', 'Cabbage Rolls Avgolemono', 'Kreatopita', 'Spanakopita', 'Cheese Pie', 'Wild Greens Pie', 'Courgette Pie', 'Skopelos Cheese Pie', 'Metsovo Kasiata', 'Vlach Leek Pie', 'Nettle Pie', 'Pispilita', 'Metsovo Cabbage Pie', 'Batzina', 'Pumpkin Pie with Pasta', 'Petropita', 'Leek and Mince Pie', 'Giouvarlakia Avgolemono', 'Pastitsada', 'Sofrito', 'Pappardelle with Ragout']);
// fried dishes: at most one in each month's Top 10 (Antonis: fried food is not good for you)
const FRIED = new Set(['Fried Calamari', 'Fried Courgettes', 'Fried Whitebait', 'Fried Sole', 'Fried Red Mullet', 'Fried Cod with Skordalia', 'Courgette Fritters', 'Tomato Fritters', 'Fried Aubergines with Skordalia', 'Fried Cauliflower', 'Keftedes', 'Pork Tigania with Feta', 'Tsigaristo', 'Fried Eggs with Halloumi', 'Stuffed Courgette Flowers']);
// regional dishes that stay in the Finder but never in the monthly Top 10 (Antonis: the everyday table)
const RARE = new Set(['Beef with Quinces', 'Pork with Quinces', 'Chestnut Stifado', 'Pork with Mastic',  // Grape autumn dishes: Finder only for now, so the approved months stay as they are
  'Bruschetta with Anchovies', 'Olive Bread', 'Skordalia', 'Taramasalata', 'Tzatziki', 'Melitzanosalata', 'Tirokafteri', 'Fava', 'Kaskoutigan', 'Boubari', 'Sout Makalo', 'Tzoumleka', 'Pispilita', 'Batzina', 'Gourgoulopita', 'Petropita', 'Vine Leaves Stuffed with Goat', 'Metsovo Kasiata', 'Metsovo Cabbage Pie', 'Cabbage with Milk', 'Roe Deer with Walnuts', 'Wild Boar with Leeks', 'Wild Boar in Wine Sauce', 'Mutton with Gigantes', 'Vlach Leek Pie', 'Nettle Pie', 'Pumpkin Pie with Pasta', 'Leek and Mince Pie', 'Samarina Meatballs with Onions', 'Pelion Goat Meatballs', 'Fried Bread of Agrafa', 'Plum Stifado', 'Trahana with Cheese and Paprika']);
const inSeason = (r, m) => !SEASONAL[r.name] || SEASONAL[r.name].includes(m);
// One plan for the whole year: every dish sits in exactly one month (the month that suits it best), never repeated.
let YEAR_PLAN = null;
function yearPlan() {
  if (YEAR_PLAN) return YEAR_PLAN;
  const hashOf = id => { let h = 7; for (const c of id) h = (h * 33 + c.charCodeAt(0)) % 9973; return h; };
  // how close a month is to the middle of the dish's season (0 = the heart of it); all-year dishes come after the seasonal ones
  const fit = (r, m) => {
    const w = SEASONAL[r.name];
    if (!w) return 1 + (hashOf(r.name + m) % 100) / 100;
    return Math.abs(w.indexOf(m) - (w.length - 1) / 2) / Math.max(1, w.length) + (hashOf(r.name + m) % 10) / 1000;
  };
  const pool = m => ALLR.filter(r => r.category !== 'Cheeses' && inSeason(r, m) && !RARE.has(r.name));
  const plan = {}, used = new Set();
  for (let m = 1; m <= 12; m++) plan[m] = [];
  // Antonis: about 80% of the wines are white or rosé, so at most two dishes per month may offer only red wines
  const options = r => [...r.labels.filter(l => l.listed && byId[l.name]).map(l => l.name), ...r.more].filter(x => byId[x]);
  const lightOpt = r => options(r).some(x => colourKey(byId[x]) !== 'Red');
  const redOnly = {}, fried = {}, groups = {};
  // variety: no month leans on one ingredient (two leek dishes at most, one bean dish, one chickpea dish, etc.)
  const GROUPS = {leek: [/leek/, 2], artichoke: [/artichoke/, 2], aubergine: [/aubergine|imam|papoutsakia|moussaka/, 2], courgette: [/courgette/, 2],
    mushroom: [/mushroom/, 2], pea: [/peas?/, 2], chickpea: [/chickpea/, 1], skordalia: [/skordalia|garlic dip/, 1],
    bean: [/beans|gigantes|fasolada/, 1], tomato: [/tomato|dakos|ladenia|strapatsada|gemista/, 4], cabbage: [/cabbage/, 2], pepper: [/pepper|spetsofai/, 2], lentil: [/lentil/, 1]};
  const groupsOf = r => Object.keys(GROUPS).filter(g => GROUPS[g][0].test((r.name + ' ' + r.ingredients).toLowerCase()));
  const fits = (r, m) => groupsOf(r).every(g => ((groups[m] || {})[g] || 0) < GROUPS[g][1]);
  const take = (m, hard) => {
    const c = pool(m).filter(r => !used.has(r.name) && HARD.has(r.name) === hard && options(r).length && (lightOpt(r) || (redOnly[m] || 0) < 2) && !(FRIED.has(r.name) && (fried[m] || 0) >= 1) && fits(r, m)).sort((a, b) => fit(a, m) - fit(b, m))[0];
    if (c) { used.add(c.name); plan[m].push(c); if (!lightOpt(c)) redOnly[m] = (redOnly[m] || 0) + 1; if (FRIED.has(c.name)) fried[m] = (fried[m] || 0) + 1; groups[m] = groups[m] || {}; groupsOf(c).forEach(g => { groups[m][g] = (groups[m][g] || 0) + 1; }); }
  };
  for (let round = 0; round < 9; round++) {
    // the month with the fewest dishes left picks first
    [...Array(12).keys()].map(i => i + 1).sort((a, b) => pool(a).filter(r => !used.has(r.name)).length - pool(b).filter(r => !used.has(r.name)).length).forEach(m => take(m, false));
  }
  for (let m = 1; m <= 12; m++) take(m, true);
  // wines: the best (first listed) label of each dish, never the same wine twice in a month
  const out = {};
  for (let m = 1; m <= 12; m++) {
    const usedW = new Set();
    let reds = 0;
    out[m] = plan[m].map(r => {
      const ids = options(r).sort((a, b) => (colourKey(byId[a]) === 'Red') - (colourKey(byId[b]) === 'Red'));
      const isRed = x => colourKey(byId[x]) === 'Red';
      // an unused white/rosé first; a red only while the month has fewer than two; otherwise repeat a white/rosé
      const id = ids.find(x => !usedW.has(x) && !isRed(x)) || (reds < 2 && ids.find(x => !usedW.has(x))) || ids.find(x => !isRed(x)) || ids[0];
      if (isRed(id)) reds++;
      usedW.add(id);
      return [r, byId[id]];
    });
  }
  YEAR_PLAN = out;
  return out;
}
const dishOptions = r => [...r.labels.filter(l => l.listed && byId[l.name]).map(l => l.name), ...r.more].filter(x => byId[x]);
const bestWine = r => { const o = dishOptions(r); return byId[o.find(x => colourKey(byId[x]) !== 'Red') || o[0]]; };
const dishRow = ([r, w], i) => `<li><span class="rank">${i + 1}</span><div class="pr"><a class="wl rl dish" data-dish="${esc(r.name)}">${esc(L(r, 'name'))}</a>
      <div class="pw c-${colourKey(w)}">${bottle(w)}<span><a class="wl" data-wine="${esc(w.id)}">${esc(L(w, 'name'))}</a><small><b class="cw">${esc(t('col')[colourKey(w)])}</b>${esc(L(w, 'winery'))} · ${esc(L(w, 'region'))}${L(w, 'grapes') ? ' · ' + esc(L(w, 'grapes')) : ''}</small></span></div></div></li>`;
const CAT_ORDER = ['Fish & seafood', 'Meat & poultry', 'Pasta', 'Salads & vegetables', 'Soups & stews', 'Pies', 'Other savoury', 'Dips & small dishes', 'Breads', 'Cheeses'];
function finderList() {
  const list = state.cat ? [state.cat] : CAT_ORDER.filter(c => cats.includes(c)).concat(cats.filter(c => !CAT_ORDER.includes(c)));
  return list.map(c => {
    const rs = sortD(ALLR.filter(r => r.category === c && dishOptions(r).length));
    if (!rs.length) return '';
    return `<section class="season flist"><h2>${esc(lang === 'el' ? catEl[c] : c)}</h2><div class="count">${rs.length} ${rs.length === 1 ? t('result') : t('results')}</div>
      <ol class="slist big">${rs.map(r => dishRow([r, bestWine(r)], rs.indexOf(r))).join('')}</ol></section>`;
  }).join('');
}
// Feasts of the Greek year, with Grape magazine's pairings (Oct 2026). wine = a label on the site; grape = a style when the article names no label.
// Movable feasts hang off Orthodox Easter: Tsiknopempti 59 days before, Clean Monday 48 days before, Holy Week the 6 days before.
function orthodoxEaster(y) {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return new Date(y, m - 1, day + 13);  // Julian to Gregorian (1900-2099)
}
const daysBeforeEaster = (y, n) => { const d = orthodoxEaster(y); d.setDate(d.getDate() - n); return d; };  // calendar days, safe across the clock change
const OCCASIONS = [
  {key: 'tsikno', at: y => daysBeforeEaster(y, 59), name: {en: 'Tsiknopempti', el: 'Τσικνοπέμπτη'},
    lede: {en: 'A day for grilled meat. It does not have to be red: a white, a rosé or an orange wine works just as well.', el: 'Μέρα για ψητά. Δεν χρειάζεται απαραίτητα κόκκινο: ένα λευκό, ένα ροζέ ή ένα πορτοκαλί πάνε εξίσου καλά.'},
    pairs: [{dish: {en: 'Lamb chops with oregano and lemon', el: 'Παϊδάκια με ρίγανη και λεμόνι'}, wine: 'Tear of the Pine (Kechris Winery)'},
      {dish: {en: 'Pork chops on the coals', el: 'Χοιρινές μπριζόλες στα κάρβουνα'}, wine: 'Kallisti Reserve (Boutari Winery (Santorini))'},
      {dish: {en: 'Burgers and kid on the grill', el: 'Μπιφτέκια και κατσικάκι στη σχάρα'}, wine: 'Rosé de Xinomavro (Thymiopoulos Vineyards)'},
      {dish: {en: 'Mutton and village sausages', el: 'Προβατίνα και χωριάτικα λουκάνικα'}, wine: 'RAWditis (Oenops)'}]},
  {key: 'kathara', at: y => daysBeforeEaster(y, 48), name: {en: 'Clean Monday', el: 'Καθαρά Δευτέρα'},
    lede: {en: 'Seafood, greens and lagana. Fresh whites go best.', el: 'Θαλασσινά, χόρτα και λαγάνα. Πάνε καλύτερα με δροσερά λευκά.'},
    pairs: [{dish: {en: 'Dolmadakia', el: 'Ντολμαδάκια'}, grape: {en: 'Sauvignon Blanc or young Assyrtiko', el: 'Sauvignon Blanc ή νέο Ασύρτικο'}},
      {dish: {en: 'Fried calamari', el: 'Τηγανητά καλαμαράκια'}, grape: {en: 'Mineral Assyrtiko or Kidonitsa', el: 'Ορυκτό Ασύρτικο ή Κυδωνίτσα'}},
      {dish: {en: 'Grilled prawns', el: 'Γαρίδες στη σχάρα'}, grape: {en: 'Vidiano, Moschofilero or Xinomavro rosé', el: 'Βιδιανό, Μοσχοφίλερο ή ροζέ Ξινόμαυρο'}},
      {dish: {en: 'Halva', el: 'Χαλβάς'}, grape: {en: 'Off-dry Muscat', el: 'Ημίξηρο Μοσχάτο'}}]},
  {key: 'march25', at: y => new Date(y, 2, 25), name: {en: '25 March', el: '25η Μαρτίου'},
    lede: {en: 'Salt cod with skordalia goes well with Roditis: plain, orange or as retsina.', el: 'Ο μπακαλιάρος σκορδαλιά πάει καλά με Ροδίτη: σκέτο, πορτοκαλί ή ρετσίνα.'},
    pairs: [{dish: {en: 'Salt cod with skordalia', el: 'Μπακαλιάρος σκορδαλιά'}, wine: 'Afros (Kechris Winery)'},
      {dish: {en: 'Salt cod with skordalia', el: 'Μπακαλιάρος σκορδαλιά'}, wine: 'RAWditis (Oenops)'}]},
  {key: 'holyweek', at: y => daysBeforeEaster(y, 6), name: {en: 'Holy Week', el: 'Μεγάλη Εβδομάδα'},
    lede: {en: 'Pulses, rice dishes and seafood. Light whites, and a slightly chilled red for the beans.', el: 'Όσπρια, ρυζάτα και θαλασσινά. Ελαφριά λευκά, και για τα φασόλια ένα κόκκινο λίγο δροσερό.'},
    pairs: [{dish: {en: 'Chickpea soup', el: 'Ρεβιθόσουπα'}, grape: {en: 'Athiri or Vilana', el: 'Αθήρι ή Βηλάνα'}},
      {dish: {en: 'Spinach rice', el: 'Σπανακόρυζο'}, grape: {en: 'Sauvignon Blanc', el: 'Sauvignon Blanc'}},
      {dish: {en: 'Fasolada and gigantes', el: 'Φασολάδα και γίγαντες'}, grape: {en: 'Chilled Limnio or Limniona', el: 'Δροσερό Λημνιό ή Λημνιώνα'}},
      {dish: {en: 'Octopus', el: 'Χταπόδι'}, grape: {en: 'Greek rosé', el: 'Ελληνικό ροζέ'}}]},
  {key: 'easter', at: y => orthodoxEaster(y), name: {en: 'Easter', el: 'Πάσχα'},
    lede: {en: 'Magiritsa on Saturday night, lamb on Sunday.', el: 'Μαγειρίτσα το Σάββατο το βράδυ, αρνί την Κυριακή.'},
    pairs: [{dish: {en: 'Magiritsa', el: 'Μαγειρίτσα'}, wine: 'Sauvignon Blanc (Alpha Estate)'},
      {dish: {en: 'The whole Easter table', el: 'Όλο το τραπέζι της Λαμπρής'}, wine: 'Apla Rosé (Oenops)'},
      {dish: {en: 'Roast lamb', el: 'Αρνί στον φούρνο'}, wine: 'Anafora Limniona (Wine Art Estate)'},
      {dish: {en: 'Lamb on the spit', el: 'Οβελίας'}, wine: 'Ramnista (Kir-Yianni)'}]},
  {key: 'christmas', at: y => new Date(y, 11, 25), name: {en: 'Christmas', el: 'Χριστούγεννα'},
    lede: {en: 'Stuffed turkey and pork. An orange Savatiano goes with both.', el: 'Γεμιστή γαλοπούλα και χοιρινό. Ένα πορτοκαλί Σαββατιανό πάει και με τα δύο.'},
    pairs: [{dish: {en: 'Stuffed turkey', el: 'Γεμιστή γαλοπούλα'}, grape: {en: 'Orange Savatiano', el: 'Πορτοκαλί Σαββατιανό'}},
      {dish: {en: 'Pork with prunes', el: 'Χοιρινό με δαμάσκηνα'}, grape: {en: 'Orange Savatiano', el: 'Πορτοκαλί Σαββατιανό'}}]},
];
// the feasts that fall in month mi (0-11), in the coming twelve months
function occasionsIn(mi) {
  const now = new Date(), y = mi >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
  return OCCASIONS.map(o => ({o, d: o.at(y)})).filter(x => x.d.getMonth() === mi);
}
function occasionHtml(mi) {
  return occasionsIn(mi).map(({o, d}) => {
    const date = d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
    const rows = o.pairs.map(p => {
      const w = p.wine && byId[p.wine];
      const right = w ? `<div class="pw c-${colourKey(w)}">${bottle(w)}<span><a class="wl" data-wine="${esc(w.id)}">${esc(L(w, 'name'))}</a><small><b class="cw">${esc(t('col')[colourKey(w)])}</b>${esc(L(w, 'winery'))}</small></span></div>`
        : `<div class="og">${esc(p.grape[lang])}</div>`;
      return `<li><div class="pr"><span class="dish">${esc(p.dish[lang])}</span>${right}</div></li>`;
    }).join('');
    return `<div class="occasion"><div class="okick">${esc(t('feast'))} · ${esc(date)}</div><h3>${esc(o.name[lang])}</h3><p>${esc(o.lede[lang])}</p><ul class="slist">${rows}</ul></div>`;
  }).join('');
}
// Tonight: one dish and its wine from this month's Top 10, a different one each day
// A dish for every day of the month (Antonis): never the same dish twice in a month, Saturday and Sunday always meat or fish,
// weekdays easy dishes; the month's Top 10 first, then other dishes in season. Fried dishes at most 3 a month, slow dishes only at weekends (2 at most).
const CAL = {};
function monthCalendar(y, m) {
  const key = y + '-' + m;
  if (CAL[key]) return CAL[key];
  const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100003; return h; };
  const isMF = r => r.category === 'Meat & poultry' || r.category === 'Fish & seafood';
  const top = yearPlan()[m], topWine = new Map(top.map(([r, w]) => [r.name, w]));
  const fit = r => { const w = SEASONAL[r.name]; return w ? Math.abs(w.indexOf(m) - (w.length - 1) / 2) / w.length : 0.6 + (hash(r.name + m) % 100) / 250; };
  const pool = ALLR.filter(r => topWine.has(r.name) || (!['Cheeses', 'Breads', 'Dips & small dishes'].includes(r.category) && !RARE.has(r.name) && inSeason(r, m) && dishOptions(r).length))
    .sort((a, b) => (topWine.has(b.name) - topWine.has(a.name)) || (fit(a) - fit(b)));
  const n = new Date(y, m, 0).getDate(), days = [...Array(n).keys()].map(i => new Date(y, m - 1, i + 1));
  const used = new Set(), out = [];
  let fried = 0, hard = 0;
  // the month's Top 10 (already approved) always make it in; the limits apply to the extra dishes
  const ok = (r, weekend) => {
    if (used.has(r.name)) return false;
    if (weekend) return isMF(r) && (topWine.has(r.name) || !(FRIED.has(r.name) && fried >= 3) && !(HARD.has(r.name) && hard >= 2));
    return topWine.has(r.name) || (!HARD.has(r.name) && !(FRIED.has(r.name) && fried >= 3));
  };
  // weekends first so they get the meat and fish; days in a shuffled order so the Top 10 spreads over the month
  const order = days.map((d, i) => i).sort((a, b) => {
    const wa = days[a].getDay() % 6 === 0, wb = days[b].getDay() % 6 === 0;
    return (wb - wa) || (hash(key + a) - hash(key + b));
  });
  for (const i of order) {
    const weekend = days[i].getDay() % 6 === 0;
    const r = pool.find(x => ok(x, weekend)) || pool.find(x => !used.has(x.name) && (!weekend || isMF(x))) || pool.find(x => !used.has(x.name)) || pool[i % pool.length];
    used.add(r.name); if (FRIED.has(r.name)) fried++; if (HARD.has(r.name)) hard++;
    out[i] = r;
  }
  // wines: the Top 10 keep their wine; others take a white or rosé not yet used this month when there is one
  const usedW = new Set(top.map(([, w]) => w.id));
  CAL[key] = out.map(r => {
    let w = topWine.get(r.name);
    if (!w) {
      const o = dishOptions(r).sort((a, b) => (colourKey(byId[a]) === 'Red') - (colourKey(byId[b]) === 'Red'));
      w = byId[o.find(x => !usedW.has(x) && colourKey(byId[x]) !== 'Red') || o.find(x => colourKey(byId[x]) !== 'Red') || o[0]];
      usedW.add(w.id);
    }
    return [r, w];
  });
  return CAL[key];
}
const pickFor = d => monthCalendar(d.getFullYear(), d.getMonth() + 1)[d.getDate() - 1];
function tonightHtml(pairs) {
  const now = new Date();
  if (monthIndex() !== now.getMonth() || !pairs.length) return '';
  const [r, w] = pickFor(now);
  // tomorrow: the next day's pick, from next month's Top 10 when the month turns
  const [r2, w2] = pickFor(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const tomorrow = `<div class="tmrw"><span class="okick">${esc(t('tomorrow'))}</span><a class="wl rl" data-dish="${esc(r2.name)}">${esc(L(r2, 'name'))}</a><span class="amp">&amp;</span><span class="dotw c-${colourKey(w2)}"></span><a class="wl" data-wine="${esc(w2.id)}">${esc(L(w2, 'name'))}</a><small>${esc(L(w2, 'winery'))}</small></div>`;
  return `<section class="tonight"><div class="okick">${esc(t('tonight'))} · ${esc(now.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {weekday: 'long', day: 'numeric', month: 'long'}))}</div>
    <div class="tn"><a class="wl rl dish" data-dish="${esc(r.name)}">${esc(L(r, 'name'))}</a><span class="amp">&amp;</span>
    <div class="pw c-${colourKey(w)}">${bottle(w)}<span><a class="wl" data-wine="${esc(w.id)}">${esc(L(w, 'name'))}</a><small><b class="cw">${esc(t('col')[colourKey(w)])}</b>${esc(L(w, 'winery'))} · ${esc(L(w, 'region'))}</small></span></div></div>
    ${L(r, 'why') ? `<p class="why">${esc(L(r, 'why'))}</p>` : ''}${tomorrow}</section>`;
}
// Music for the table (Antonis's YouTube playlist). The player loads only after a click, so YouTube sets nothing until then.
// The music bar plays Antonis's YouTube playlist plus EXTRA_SONGS, shuffled. The playlist's song IDs come from songs.json,
// which a daily GitHub Action (update-songs.yml in the site repo) refreshes; PLAYLIST_FALLBACK is used if songs.json cannot load.
const PLAYLIST_FALLBACK = [
  '7-hMXhcc-tA', 'rmegHVEsSVY', 'bJJdXEpgK0Y', 'iTIhE1U17fU', 'NjKroD0AhJA', 'Xx7rL7k8o9A', 'z0zA5aIub-g', '7T2jmKfExIk', 'c9OLFnfiq6A',
  'gl17x1L_8Kc', 'SeZXux7whZw', '8oew4BwM0aU', 'ZvdecuTtsx4', 'l1U4Z856sW0', 'QaUJXIFY-bo', 'PZ_fSt6eNuM', 'ne5HvKx6q_4', 'k1622L_g1L4',
  'SCMBEpgdHm8', 'qnqb0Vfqxus', 'FCtjWiMM4kc', 'ff19Ovx-eW8', 'n2urB-yawdo', 'apo4QG6-00Q', 'H7MGD4ITvik', 'RWfXKFAhFK4', 'wgmI-D1XosY',
  'yUGp8A2SKXk', 'zLmFEIksvh8', 'xvi4jKwHpC0', '-eqDiCuFRI8', 'GhDO26V01ic', 'ciawICBvQoE', '1BfEUevxKig', '7sUIUSO3W0o', 'ztXc0vZoMB0',
  'CpXbLkca944', 'FWhwwSX3fEA', 'Y_QssGZzMnQ', 'hQLu-fP1Svk', 'UbtCwph3jA4', 'qaDPw4geWY8', 'T66jow1WaZw', 'yhUa0841d8I', 'zgbi9hwi9OA',
  'Oztvh92T7Zg', 'CJPxOLDnOG8', 'tAisaEtQtG8', 'AzEO4DZtcvw', 'opJGMqySfi4', 'U0tbJK1LxNU', 'oOYVg7mwFOo', 'Mc6TuysknT8', 'ZejaoZpyoqw',
  'Tt3H3K4c9hA', 'h5zdL8n-Gd8', '9P0IqbsLhB0', 'tHdAuJUIvXA', 'lnYan4E3FTM', 'NA53CCWzRF8', 'XOjkG_xYQWQ', 'gtMHRM3eKkw', 'QzMO-EjaDhs',
  'XYEtn5wiurM', 'rVvyBD6lcps', 'bxckWbEFJHM', 'RY9mcnKOh14', 'BueVGiyx_E4', 'sdCshKjGqsY', 'MtfTU7TJZbY', 'f3pgMxZJ9IU', 'Pw_V1kH8Bvk',
  'UiInSNTnz-c', 'bQ1R--8MYx0', 'nXTtA5bKHrM', 'CdK-X2QFoY0', 'eF8nQXXrL90', '7ZvPahsmRB0', 'WTIM0w1mFWU', 'iBY-B49rgFA',
];
// songs Antonis added that are not in the YouTube playlist (2026-10-24); add more here, or add them to the playlist itself
const EXTRA_SONGS = [
  'cTNBmloshAc', 'kd50IlLtSAA', 'wmrQ32ENgEQ', 'F2vT9VyXOks', 'Q2XMM93B4nA', 'wS68AerqHJU', 'diATRZMGwvM', '4m3iPE1maDM', 'U7BKKGMmB0Q',
  '02jrXcpfVAs', 'xTUpkNXgYmA', 'b1_9buEzFCc', 'QaFJeMy_iLA', 's_m889GgvpI', 'RCTr51c8fD8', 'SiTrPVSwV6Y', 'QXi1DbnXIow', '1n2NAbz2oeI',
  'u4vV4KDy_48',
];
// compact bar: YouTube's player at its minimum size (200x200, as YouTube's terms require it visible), with the song title and controls beside it
const barHtml = () => `<div class="plbar"><div class="plvid"><div id="plplayer"></div></div><div class="plside"><div class="pltitle" id="pltitle">…</div>
  <div class="plbtns"><button type="button" data-pl="prev" aria-label="Previous">⏮</button><button type="button" data-pl="toggle" aria-label="Play or pause" id="pltoggle">⏸</button><button type="button" data-pl="next" aria-label="Next">⏭</button></div></div></div>`;
function seasonHtml() {
  const mi = monthIndex(), S = MONTHS[mi], pairs = yearPlan()[mi + 1];
  const row = ([r, w], i) => `<li><span class="rank">${i + 1}</span><div class="pr"><a class="wl rl dish" data-dish="${esc(r.name)}">${esc(L(r, 'name'))}</a>
      <div class="pw c-${colourKey(w)}">${bottle(w)}<span><a class="wl" data-wine="${esc(w.id)}">${esc(L(w, 'name'))}</a><small><b class="cw">${esc(t('col')[colourKey(w)])}</b>${esc(L(w, 'winery'))} · ${esc(L(w, 'region'))}${L(w, 'grapes') ? ' · ' + esc(L(w, 'grapes')) : ''}</small></span></div></div></li>`;
  const nm = MONTHS[(mi + 1) % 12][lang];
  return tonightHtml(pairs) + `<section class="season"><div class="snav"><button type="button" class="prev" data-month="-1" aria-label="${esc(t('prevMonth'))}">←</button><button type="button" data-month="1">${esc(t('nextMonth'))}: ${esc(nm)} →</button></div><div class="skick"><svg viewBox="0 0 24 24" aria-hidden="true">${SEASON_ICONS[S.icon]}</svg>${esc(t('inSeason'))}</div>
    <h2>${esc(S.title[lang])}</h2><p class="slede">${esc(S.lede[lang])}</p>${occasionHtml(mi)}
    <h3 class="stitle">${esc(t('top10Pairs'))}</h3>
    <ol class="slist big">${pairs.map(row).join('')}</ol></section>`;
}
// the Wine list search also finds a dish: a wine matches when one of its dishes does (Antonis, 2026-11-19)
const listCache = {};
const listText = w => listCache[w.id] || (listCache[w.id] = wineText(w) + ' ' + norm((dishesOf[w.id] || []).map(r => r.name + ' ' + r.el.name).join(' ')));
function renderList() {
  const terms = norm(state.q.trim()).split(/\s+/).filter(Boolean);
  const ws = W.filter(w => (!state.region || w.region === state.region) && (!state.colour || colourKey(w) === state.colour) && (!state.variety || w.vars.includes(state.variety))
    && terms.every(x => listText(w).includes(x)));
  if (!ws.length) return `<p class="empty">${esc(t('none'))}</p>`;
  const filtering = state.q.trim() || state.colour || state.variety || state.region;
  // Antonis: one colour at a time, White by default; the tabs switch to the Top 20 rosé or red
  const tabs = `<div class="chips-label">${esc(t('colour'))}</div><div class="chips toptabs">${['White', 'Rosé', 'Red'].map(c =>
    `<button type="button" class="chip${topColour === c ? ' on' : ''}" data-top="${c}">${esc(t('col')[c])}</button>`).join('')}</div>`;
  const top = filtering ? '' : tabs + `<h2 class="fav-title">${esc(t({White: 'topWhite', 'Rosé': 'topRose', Red: 'topRed'}[topColour]))}</h2><div class="top20">${D.top20[topColour].map((id, i) => listRow(byId[id], i + 1)).join('')}</div>`;
  if (!filtering && !state.showAll) return top + `<button type="button" class="showall" data-showall>${esc(t('showAll'))} (${W.length})</button>`;
  const on = [state.colour && t('col')[state.colour], state.variety && (lang === 'el' ? D.varietyEl[state.variety] : state.variety),
    state.region && (lang === 'el' ? regionEl[state.region] : state.region)].filter(Boolean);
  const bar = on.length ? `<div class="activef">${esc(t('filter'))}: <b>${esc(on.join(' · '))}</b> · ${ws.length} ${ws.length === 1 ? t('wine') : t('winesN')}<button type="button" data-clearf>${esc(t('clearFilter'))}</button></div>` : '';
  return top + bar + (filtering ? '' : `<h2>${esc(t('allWines'))}</h2>`) + wineries.map(name => {
    const g = ws.filter(w => w.winery === name);
    return g.length ? `<h2>${esc(lang === 'el' ? wineryEl[name] : name)}</h2><div class="count">${g.length} ${g.length === 1 ? t('wine') : t('winesN')}</div>${g.map(listRow).join('')}` : '';
  }).join('');
}
function section(title, items, render, two) {
  if (!items.length) return '';
  return `<h2>${esc(title)}</h2><div class="count">${items.length} ${items.length === 1 ? t('result') : t('results')}</div>
    <div class="grid${two ? ' two' : ''}">${items.map(render).join('')}</div>`;
}

function render() {
  document.documentElement.lang = lang;
  document.title = t('docTitle');
  document.getElementById('kicker').textContent = t('kicker');
  const home = view === 'home';
  // the active tab already says where we are: the Wine list and Estates have no title or intro (Antonis)
  ['title', 'lede'].forEach(id => { document.getElementById(id).hidden = home || view === 'list' || view === 'wineries'; });
  if (!home) {
    document.getElementById('title').textContent = t({list: 'listTitle', wineries: 'estatesTitle', finder: 'title'}[view]);
    document.getElementById('lede').textContent = t({list: 'listLede', wineries: 'estatesLede', finder: 'lede'}[view]);
  }
  document.querySelectorAll('.views button').forEach(b => { b.textContent = t({list: 'viewList', wineries: 'viewEstates', finder: 'viewFinder'}[b.dataset.view]); b.classList.toggle('on', b.dataset.view === view); });
  document.getElementById('hero').innerHTML = heroSvg(home ? 'list' : view);
  const sb = document.querySelector('.search');
  // home: the search sits right under the picture, above Tonight and the month (Antonis, 2026-11-21); other pages: under the title
  if (home) document.getElementById('season').before(sb); else document.getElementById('finderChips').before(sb);
  sb.hidden = false;  // search box back on every page (Antonis, 2026-11-19); typing on the home page opens the Pairing Finder
  ['tagsLabel', 'tags', 'grapesLabel', 'grapes'].forEach(id => { document.getElementById(id).hidden = view === 'finder'; });
  document.getElementById('season').innerHTML = home ? seasonHtml() : '';
  document.getElementById('musicKick').textContent = t('music');
  document.getElementById('musicLabel').textContent = document.getElementById('music').hidden ? t('music') : t('closeMusic');
  document.getElementById('finderChips').hidden = view !== 'finder';
  document.getElementById('listChips').hidden = view !== 'list';
  document.getElementById('exploreTitle').textContent = t('exploreTitle');
  ['varietyLabel', 'varieties', 'wineryLabel', 'wineries'].forEach(id => { document.getElementById(id).hidden = view === 'wineries'; });
  document.getElementById('wineryLabel').textContent = t('winery');
  document.getElementById('varietyLabel').textContent = t('grapes');
  document.getElementById('colourLabel').textContent = t('colour');
  document.getElementById('q').placeholder = view === 'wineries' ? (lang === 'el' ? 'Αναζήτηση κτήματος ή κρασιού' : 'Search an estate or a wine') : view === 'list' ? (lang === 'el' ? 'Αναζήτηση κρασιού, κτήματος, ποικιλίας ή πιάτου' : 'Search a wine, estate, grape or dish') : window.matchMedia('(max-width:560px)').matches ? (lang === 'el' ? 'Αναζήτηση πιάτου ή κρασιού' : 'Search a dish or wine') : t('placeholder');
  document.getElementById('catsLabel').textContent = t('cats');
  document.getElementById('tagsLabel').textContent = t('tags');
  document.getElementById('grapesLabel').textContent = t('grapes');
  document.getElementById('foot').textContent = t('foot')(W.length, R.length, wineries.length);
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));

  document.querySelector('footer').hidden = home;
  if (home) { document.getElementById('out').innerHTML = ''; return; }
  if (view !== 'finder') {
    document.getElementById('out').innerHTML = view === 'list' ? renderList() : renderWineries();
    chips(document.getElementById('varieties'), varieties, 'variety', v => lang === 'el' ? D.varietyEl[v] : v, true, true);
    chips(document.getElementById('wineries'), regions, 'region', x => lang === 'el' ? regionEl[x] : x, true, true);
    chips(document.getElementById('colours'), ['White', 'Rosé', 'Red'], 'colour', c => t('col')[c]);
    return;
  }
  const terms = norm(state.q.trim()).split(/\s+/).filter(Boolean);
  const all = tx => terms.every(x => tx.includes(x));
  let rs = R, cs = C, ws = W;
  if (state.cat) { if (state.cat === 'Cheeses') rs = []; else { rs = rs.filter(r => r.category === state.cat); cs = []; } }
  if (state.tag) ws = ws.filter(w => w.tags.includes(state.tag));
  if (terms.length) { rs = rs.filter(r => all(recipeText(r))); cs = cs.filter(r => all(recipeText(r))); ws = ws.filter(w => all(wineText(w))); }
  let html = '';
  if (state.grape) {
    const g = gByKey[state.grape], gw = W.filter(w => w.grapes.includes(g.key)), gr = ALLR.filter(r => r.grape.startsWith(g.key));
    html = profileCard(g) + section(t('wines'), gw, wineCard, true) + section(t('bestFor'), sortD(gr), recipeCard, true);
  } else if (!(state.q.trim() || state.tag)) {
    html = finderList();
  } else if (false) {
    html = `<h2>${esc(t('begin'))}</h2><p class="lede">${esc(t('beginText')(R.length, W.length))}</p>` + section(t('allDishes'), sortD(R), recipeCard, true) + section(t('cheeses'), sortD(C), recipeCard, true);
  } else {
    // a dish-type chip shows dishes only; a food chip shows wines only; free text shows both
    if (!state.tag) html += section(t('dishes'), sortD(rs), recipeCard, true) + section(t('cheeses'), sortD(cs), recipeCard, true);
    if (!state.cat) html += section(t('wines'), ws, wineCard, true);
    if (!html) html = `<p class="empty">${esc(t('none'))}</p>`;
  }
  document.getElementById('out').innerHTML = html;
  chips(document.getElementById('cats'), CAT_ORDER.filter(c => cats.includes(c)).concat(cats.filter(c => !CAT_ORDER.includes(c))), 'cat', c => lang === 'el' ? catEl[c] : c, false);
  chips(document.getElementById('tags'), tags, 'tag', x => lang === 'el' ? tagEl[x] : x, true, true);
  chips(document.getElementById('grapes'), G.map(g => g.key), 'grape', k => lang === 'el' ? gByKey[k].el_name : k, true, true);
}

document.addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details.pill'); if (d) { d.open ? openEstates.add(d.dataset.w) : openEstates.delete(d.dataset.w); } }, true);
document.getElementById('q').addEventListener('input', e => { state.q = e.target.value; state.grape = ''; if (view === 'home' && state.q.trim()) { view = 'finder'; try { history.replaceState(null, '', HASH[view]); } catch (x) {} } render(); if (document.activeElement !== e.target) e.target.focus(); });
function openModal(html) {
  const m = document.getElementById('modal');
  document.getElementById('modalBody').innerHTML = html;
  m.hidden = false; m.scrollTop = 0; document.body.style.overflow = 'hidden';
}
function closeModal() { document.getElementById('modal').hidden = true; document.body.style.overflow = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]') || e.target.id === 'modal') { closeModal(); return; }
  if (e.target.closest('[data-showall]')) { state.showAll = true; render(); return; }
  const mb = e.target.closest('[data-month]');
  if (mb) { monthOverride = (monthIndex() + parseInt(mb.dataset.month, 10) + 12) % 12; render(); return; }
  const pop = e.target.closest('a.wl[data-wine], a.wl[data-dish]');
  if (pop) {
    e.preventDefault();
    const dish = pop.dataset.dish ? ALLR.find(x => x.name === pop.dataset.dish) : null, wine = pop.dataset.wine ? byId[pop.dataset.wine] : null;
    if (dish) openModal(recipeCard(dish)); else if (wine) openModal(wineCard(wine));
    return;
  }
  const pb = e.target.closest('[data-pl]');
  if (pb && window.YT && YT.get && YT.get('plplayer')) {
    const pl = YT.get('plplayer'), k = pb.dataset.pl;
    if (k === 'next') pl.nextVideo(); else if (k === 'prev') pl.previousVideo();
    else pl.getPlayerState() === YT.PlayerState.PLAYING ? pl.pauseVideo() : pl.playVideo();
    return;
  }
  if (e.target.closest('[data-music]')) {
    // the ♪ button opens the music strip at the top and starts playing; pressed again it hides the strip and pauses
    const box = document.getElementById('music'), btn = e.target.closest('[data-music]'), pl = window.YT && YT.get && YT.get('plplayer');
    if (pl) {
      box.hidden = !box.hidden; btn.setAttribute('aria-expanded', !box.hidden); btn.classList.toggle('on', !box.hidden);
      document.getElementById('musicIcon').textContent = box.hidden ? '▶' : '✕'; document.getElementById('musicLabel').textContent = box.hidden ? t('music') : t('closeMusic');
      if (box.hidden) pl.pauseVideo(); else pl.playVideo();
      return;
    }
    box.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('on');
    document.getElementById('musicIcon').textContent = '✕'; document.getElementById('musicLabel').textContent = t('closeMusic');
    // all songs, shuffled on every visit (Antonis: not the same song every time); a song that cannot play is skipped
    document.getElementById('pl').innerHTML = barHtml();
    let order = [];
    const start = () => new YT.Player('plplayer', {host: 'https://www.youtube-nocookie.com', width: 200, height: 200, videoId: order[0],
      playerVars: {playlist: order.slice(1).join(','), autoplay: 1, rel: 0, playsinline: 1},
      events: {
        onStateChange: e => {
          document.getElementById('pltitle').textContent = (e.target.getVideoData() || {}).title || '…';
          document.getElementById('pltoggle').textContent = e.data === YT.PlayerState.PLAYING ? '⏸' : '▶';
        },
        onError: e => e.target.nextVideo(),
      }});
    const go = ids => {
      order = [...new Set([...ids, ...EXTRA_SONGS])];
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      if (window.YT && YT.Player) start();
      else { window.onYouTubeIframeAPIReady = start; const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); }
    };
    fetch('songs.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).then(j => go(j && j.ids && j.ids.length ? j.ids : PLAYLIST_FALLBACK)).catch(() => go(PLAYLIST_FALLBACK));
    return;
  }
  const lg = e.target.closest('.logo');
  if (lg) { e.preventDefault(); view = 'home'; monthOverride = null; state = {q: '', cat: '', tag: '', grape: '', region: '', colour: '', variety: ''}; document.getElementById('q').value = ''; try { history.replaceState(null, '', '/wine/'); } catch (x) {} render(); window.scrollTo({top: 0, behavior: 'smooth'}); return; }
  const vb = e.target.closest('.views button');
  if (vb) { view = vb.dataset.view; state = {q: '', cat: '', tag: '', grape: '', region: '', colour: ''}; document.getElementById('q').value = ''; try { history.replaceState(null, '', HASH[view]); } catch (x) {} render(); return; }
  const pt = e.target.closest('.gmap .pt:not(.empty)');
  if (pt) { state.region = state.region === pt.dataset.region ? '' : pt.dataset.region; render(); const tgt = document.querySelector('.pills'); if (state.region && tgt) tgt.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  if (e.target.closest('[data-mapclear]')) { state.region = ''; render(); return; }
  const ct = e.target.closest('.chips-toggle');
  if (ct) { const id = ct.dataset.for; expandedRows.has(id) ? expandedRows.delete(id) : expandedRows.add(id); render(); return; }
  const lb = e.target.closest('.lang button');
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('wine-lang', lang); } catch (x) {} render(); return; }
  const tt = e.target.closest('[data-top]');
  if (tt) { topColour = tt.dataset.top; render(); return; }
  const c = e.target.closest('.chip');
  if (c) {
    const {k, v} = c.dataset, on = state[k] === v;
    if (k === 'grape') { state = {q: '', cat: '', tag: '', grape: on ? '' : v, region: '', colour: ''}; document.getElementById('q').value = ''; }
    else { state[k] = on ? '' : v; state.grape = ''; }
    render();
    if (view === 'list') document.getElementById('out').scrollIntoView({behavior: 'smooth', block: 'start'});
    return;
  }
  if (e.target.closest('[data-clearf]')) { state.colour = state.variety = state.region = ''; render(); return; }
  const rl = e.target.closest('a.rl');
  if (rl) {
    const r = ALLR.find(x => x.name === rl.dataset.dish), nm = L(r, 'name');
    view = 'finder'; state = {q: nm, cat: '', tag: '', grape: '', region: '', colour: ''}; document.getElementById('q').value = nm; render();
    window.scrollTo({top: 0, behavior: 'smooth'}); return;
  }
  const a = e.target.closest('a.wl');
  if (a) {
    const w = byId[a.dataset.wine];
    view = 'finder'; try { history.replaceState(null, '', '#finder'); } catch (x) {}
    const nm = lang === 'el' ? w.el.name : w.wine;
    state = {q: nm, cat: '', tag: '', grape: '', region: '', colour: ''}; document.getElementById('q').value = nm; render();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
});
render();
document.addEventListener('keydown', e => { const g = e.target.closest && e.target.closest('.gmap .pt'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); g.dispatchEvent(new MouseEvent('click', {bubbles: true})); } });

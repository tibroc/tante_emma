// data.jsx — TanteEmma demo content (German grocery list)

let _id = 100;
const uid = () => `i${++_id}`;

// Active (unchecked) list — believable weekly shop across categories
const INITIAL_ITEMS = [
  { id: uid(), name: 'Bananen',            brand: 'Chiquita',   cat: 'Obst & Gemüse',    qty: '1 Bund' },
  { id: uid(), name: 'Avocado',            brand: '',           cat: 'Obst & Gemüse',    qty: '2 Stk.' },
  { id: uid(), name: 'Cherrytomaten',      brand: 'Bio',        cat: 'Obst & Gemüse',    qty: '250 g' },
  { id: uid(), name: 'Vollkornbrot',       brand: 'Harry',      cat: 'Brot & Backwaren', qty: '' },
  { id: uid(), name: 'Bio-Joghurt',        brand: 'Alpro',      cat: 'Kühlregal',        qty: '4×' },
  { id: uid(), name: 'Weidebutter',        brand: 'Kerrygold',  cat: 'Kühlregal',        qty: '' },
  { id: uid(), name: 'Käse gerieben',      brand: 'für Pizza',  cat: 'Käse',             qty: '200 g' },
  { id: uid(), name: 'Hähnchenbrust',      brand: '',           cat: 'Fleisch & Wurst',  qty: '500 g', store: 'REWE' },
  { id: uid(), name: 'Zartbitter­schokolade', brand: 'Lindt 70%', cat: 'Süßwaren',       qty: '' },
  { id: uid(), name: 'Wasser sprudel',     brand: '',           cat: 'Getränke',         qty: '1,5 L', store: 'Lidl' },
];

// Pre-checked items (shown in the "erledigt" footer)
const INITIAL_CHECKED = [
  { id: uid(), name: 'Vollmilch',   brand: '3,5%',      cat: 'Kühlregal',       qty: '2 L', checked: true },
  { id: uid(), name: 'Eier',        brand: 'Freiland',  cat: 'Kühlregal',       qty: '10er', checked: true },
  { id: uid(), name: 'Spülmittel',  brand: 'Frosch',    cat: 'Sonstiges',       qty: '',     checked: true },
];

// Suggestion database — what the add-bar searches
const PRODUCT_DB = [
  { name: 'Bananen', cat: 'Obst & Gemüse', brand: 'Chiquita', freq: true },
  { name: 'Äpfel', cat: 'Obst & Gemüse', brand: 'Elstar' },
  { name: 'Avocado', cat: 'Obst & Gemüse' },
  { name: 'Karotten', cat: 'Obst & Gemüse', brand: 'Bio' },
  { name: 'Zwiebeln', cat: 'Obst & Gemüse' },
  { name: 'Kartoffeln', cat: 'Obst & Gemüse', brand: 'festkochend' },
  { name: 'Salat', cat: 'Obst & Gemüse', brand: 'Kopfsalat' },
  { name: 'Paprika', cat: 'Obst & Gemüse', brand: 'rot' },
  { name: 'Vollkornbrot', cat: 'Brot & Backwaren', brand: 'Harry', freq: true },
  { name: 'Brötchen', cat: 'Brot & Backwaren', brand: '6 Stk.' },
  { name: 'Croissant', cat: 'Brot & Backwaren' },
  { name: 'Vollmilch', cat: 'Kühlregal', brand: '3,5%', freq: true },
  { name: 'Bio-Joghurt', cat: 'Kühlregal', brand: 'Alpro' },
  { name: 'Weidebutter', cat: 'Kühlregal', brand: 'Kerrygold' },
  { name: 'Frischkäse', cat: 'Kühlregal', brand: 'Philadelphia' },
  { name: 'Quark', cat: 'Kühlregal', brand: 'Magerquark' },
  { name: 'Eier', cat: 'Kühlregal', brand: 'Freiland' },
  { name: 'Gouda', cat: 'Käse', brand: 'jung' },
  { name: 'Käse gerieben', cat: 'Käse', brand: 'für Pizza' },
  { name: 'Mozzarella', cat: 'Käse', brand: 'Galbani' },
  { name: 'Parmesan', cat: 'Käse', brand: 'am Stück' },
  { name: 'Hähnchenbrust', cat: 'Fleisch & Wurst' },
  { name: 'Hackfleisch', cat: 'Fleisch & Wurst', brand: 'gemischt' },
  { name: 'Salami', cat: 'Fleisch & Wurst', brand: 'geschnitten' },
  { name: 'Schinken', cat: 'Fleisch & Wurst', brand: 'gekocht' },
  { name: 'Zartbitterschokolade', cat: 'Süßwaren', brand: 'Lindt 70%' },
  { name: 'Gummibärchen', cat: 'Süßwaren', brand: 'Haribo' },
  { name: 'Kekse', cat: 'Süßwaren', brand: 'Leibniz' },
  { name: 'Wasser sprudel', cat: 'Getränke', brand: '', freq: true },
  { name: 'Apfelsaft', cat: 'Getränke', brand: 'naturtrüb' },
  { name: 'Kaffee', cat: 'Getränke', brand: 'Dallmayr' },
  { name: 'Orangensaft', cat: 'Getränke', brand: 'Hohes C' },
  { name: 'Nudeln', cat: 'Sonstiges', brand: 'Barilla' },
  { name: 'Olivenöl', cat: 'Sonstiges', brand: 'nativ extra' },
  { name: 'Spülmittel', cat: 'Sonstiges', brand: 'Frosch' },
  { name: 'Küchenrolle', cat: 'Sonstiges' },
];

Object.assign(window, { INITIAL_ITEMS, INITIAL_CHECKED, PRODUCT_DB, uid });

// Stores — brand color, type, custom shelf order (category names → colored dots)
const SHELF = ['Obst & Gemüse', 'Brot & Backwaren', 'Kühlregal', 'Käse', 'Fleisch & Wurst', 'Süßwaren', 'Getränke'];
const STORES = [
  { id: 'rewe',  name: 'REWE',     type: 'Supermarkt', color: '#cc071e', city: 'Hauptstraße 12', isDefault: true,
    shelf: ['Obst & Gemüse', 'Brot & Backwaren', 'Kühlregal', 'Käse', 'Fleisch & Wurst', 'Getränke', 'Süßwaren'] },
  { id: 'lidl',  name: 'Lidl',     type: 'Discounter', color: '#1f70c8', city: 'Bahnhofplatz 3', isDefault: false,
    shelf: ['Getränke', 'Obst & Gemüse', 'Kühlregal', 'Brot & Backwaren', 'Süßwaren', 'Fleisch & Wurst', 'Käse'] },
  { id: 'aldi',  name: 'Aldi Süd', type: 'Discounter', color: '#00a9e0', city: 'Marktweg 8', isDefault: false,
    shelf: SHELF },
  { id: 'dm',    name: 'dm',       type: 'Drogerie',   color: '#1f3a8a', city: 'Königsallee 21', isDefault: false,
    shelf: ['Süßwaren', 'Getränke', 'Kühlregal'] },
];

Object.assign(window, { STORES, SHELF });

// Verlauf — past items grouped by day. Tapping re-adds to the list.
const HISTORY = [
  { label: 'Heute', items: [
    { name: 'Salatgurke',  brand: '',          cat: 'Obst & Gemüse' },
    { name: 'Eier',        brand: '10er',      cat: 'Kühlregal' },
  ]},
  { label: 'Gestern', items: [
    { name: 'Vollmilch',   brand: '3,5%',      cat: 'Kühlregal' },
    { name: 'Bananen',     brand: 'Chiquita',  cat: 'Obst & Gemüse' },
    { name: 'Mischbrot',   brand: 'vom Bäcker',cat: 'Brot & Backwaren' },
  ]},
  { label: 'Mittwoch, 10. Juni', items: [
    { name: 'Chips',       brand: 'Paprika',   cat: 'Süßwaren' },
    { name: 'Spülmittel',  brand: 'Frosch',    cat: 'Sonstiges' },
    { name: 'Rotwein',     brand: 'Primitivo', cat: 'Getränke' },
    { name: 'Cola',        brand: '1,5 L',     cat: 'Getränke' },
    { name: 'Kekse',       brand: 'Leibniz',   cat: 'Süßwaren' },
    { name: 'Äpfel',       brand: 'Elstar',    cat: 'Obst & Gemüse' },
    { name: 'Mehl',        brand: 'Type 405',  cat: 'Sonstiges' },
  ]},
];

Object.assign(window, { HISTORY });

// ── Lists (Einkaufslisten) ──────────────────────────────────
// Each list owns its own items + checked. List 1 reuses the big demo set.
const MEMBERS = {
  mk: { i: 'MK', c: '#d946ef' },
  jt: { i: 'JT', c: '#10b981' },
  to: { i: 'T',  c: '#3b82f6' },
  an: { i: 'A',  c: '#fb6f4c' },
};

const INITIAL_LISTS = [
  {
    id: 'l1', name: 'Wocheneinkauf', accent: '#d946ef', icon: 'cart',
    members: ['mk', 'jt'], edited: 'vor 2 Min.',
    items: INITIAL_ITEMS.map(x => ({ ...x, checked: false })),
    checked: INITIAL_CHECKED.slice(),
  },
  {
    id: 'l2', name: 'Drogerie · dm', accent: '#3b82f6', icon: 'box',
    members: ['mk'], edited: 'gestern',
    items: [
      { id: uid(), name: 'Shampoo', brand: 'Balea', cat: 'Sonstiges', qty: '' },
      { id: uid(), name: 'Zahnpasta', brand: 'Sensodyne', cat: 'Sonstiges', qty: '2×' },
      { id: uid(), name: 'Taschentücher', brand: '', cat: 'Sonstiges', qty: '' },
      { id: uid(), name: 'Duschgel', brand: 'Nivea', cat: 'Sonstiges', qty: '' },
    ],
    checked: [{ id: uid(), name: 'Wattepads', brand: '', cat: 'Sonstiges', checked: true }],
  },
  {
    id: 'l3', name: 'Geburtstagsparty', accent: '#fb6f4c', icon: 'sparkle',
    members: ['mk', 'jt', 'to', 'an'], edited: 'vor 3 Tagen',
    items: [
      { id: uid(), name: 'Luftballons', brand: 'bunt', cat: 'Sonstiges', qty: '20er' },
      { id: uid(), name: 'Geburtstagstorte', brand: 'Konditorei', cat: 'Süßwaren', qty: '' },
      { id: uid(), name: 'Kerzen', brand: '', cat: 'Sonstiges', qty: '' },
      { id: uid(), name: 'Sekt', brand: 'Rotkäppchen', cat: 'Getränke', qty: '3×' },
      { id: uid(), name: 'Servietten', brand: '', cat: 'Sonstiges', qty: '' },
    ],
    checked: [
      { id: uid(), name: 'Geschenk', brand: '', cat: 'Sonstiges', checked: true },
      { id: uid(), name: 'Einladungen', brand: '', cat: 'Sonstiges', checked: true },
    ],
  },
  {
    id: 'l4', name: 'Büroküche', accent: '#10b981', icon: 'store',
    members: ['to'], edited: 'vor 1 Woche',
    items: [
      { id: uid(), name: 'Kaffeebohnen', brand: 'Dallmayr', cat: 'Getränke', qty: '1 kg' },
      { id: uid(), name: 'Hafermilch', brand: 'Oatly', cat: 'Kühlregal', qty: '6×' },
      { id: uid(), name: 'Kekse', brand: 'Leibniz', cat: 'Süßwaren', qty: '' },
    ],
    checked: [],
  },
];

Object.assign(window, { INITIAL_LISTS, MEMBERS });

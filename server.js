const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const storesFile = path.join(DATA, 'stores.json');
const productsFile = path.join(DATA, 'products.json');
const stateFile = path.join(DATA, 'state.json');

app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}
function state() {
  if (!fs.existsSync(stateFile)) writeJson(stateFile, { favorites: [], inquiries: [] });
  return readJson(stateFile, { favorites: [], inquiries: [] });
}
function normalize(v='') { return String(v).toLowerCase().trim(); }
function scoreProduct(product, q) {
  if (!q) return 1;
  const hay = normalize([product.name, product.partNumber, product.category, product.spec].join(' '));
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    if (normalize(product.partNumber) === term) score += 10;
    else if (normalize(product.name).includes(term)) score += 5;
    else if (hay.includes(term)) score += 2;
  }
  return score;
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'parts-finder', time: new Date().toISOString() }));

app.get('/api/stats', (req, res) => {
  const stores = readJson(storesFile, []);
  const products = readJson(productsFile, []);
  const s = state();
  res.json({ stores: stores.length, products: products.length, favorites: s.favorites.length, inquiries: s.inquiries.length });
});

app.get('/api/stores', (req, res) => {
  const stores = readJson(storesFile, []);
  const city = normalize(req.query.city);
  res.json(city ? stores.filter(s => normalize(s.city).includes(city)) : stores);
});

app.get('/api/stores/:id', (req, res) => {
  const stores = readJson(storesFile, []);
  const products = readJson(productsFile, []);
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json({ ...store, products: products.filter(p => p.storeId === store.id) });
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '');
  const city = normalize(req.query.city);
  const stores = readJson(storesFile, []);
  const products = readJson(productsFile, []);
  const storeMap = Object.fromEntries(stores.map(s => [s.id, s]));
  const results = products
    .map(p => ({ ...p, store: storeMap[p.storeId], score: scoreProduct(p, q) }))
    .filter(r => r.store && (!city || normalize(r.store.city).includes(city)) && (!q || r.score > 0))
    .sort((a,b) => b.score - a.score || (a.price ?? 999999) - (b.price ?? 999999));
  res.json({ query: q, count: results.length, results });
});

app.get('/api/products', (req, res) => {
  const q = String(req.query.q || '');
  const products = readJson(productsFile, []);
  res.json(products.filter(p => !q || scoreProduct(p, q) > 0));
});

app.get('/api/favorites', (req, res) => {
  const s = state();
  const stores = readJson(storesFile, []);
  res.json(s.favorites.map(id => stores.find(x => x.id === id)).filter(Boolean));
});

app.post('/api/favorites/:storeId', (req, res) => {
  const s = state();
  const stores = readJson(storesFile, []);
  if (!stores.some(x => x.id === req.params.storeId)) return res.status(404).json({ error: 'Store not found' });
  if (!s.favorites.includes(req.params.storeId)) s.favorites.push(req.params.storeId);
  writeJson(stateFile, s);
  res.json({ ok: true, favorites: s.favorites });
});

app.delete('/api/favorites/:storeId', (req, res) => {
  const s = state();
  s.favorites = s.favorites.filter(id => id !== req.params.storeId);
  writeJson(stateFile, s);
  res.json({ ok: true, favorites: s.favorites });
});

app.get('/api/inquiries', (req, res) => res.json(state().inquiries));

app.post('/api/inquiries', (req, res) => {
  const { storeId, productId, quantity, note } = req.body || {};
  const stores = readJson(storesFile, []);
  const products = readJson(productsFile, []);
  const store = stores.find(s => s.id === storeId);
  const product = products.find(p => p.id === productId);
  if (!store || !product) return res.status(400).json({ error: 'Invalid store or product' });
  const s = state();
  const item = {
    id: 'inq_' + Date.now(), storeId, storeName: store.name, productId,
    productName: product.name, quantity: Number(quantity) || 1,
    note: String(note || ''), status: 'pending', createdAt: new Date().toISOString()
  };
  s.inquiries.unshift(item);
  writeJson(stateFile, s);
  res.status(201).json(item);
});

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Parts Finder running on port ${PORT}`));

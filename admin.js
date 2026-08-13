// ============================================================
// admin.js — Admin Panel Logic
// ------------------------------------------------------------
// Edits two files directly on disk via the File System Access
// API (window.showOpenFilePicker):
//   - main.js  → STORE_CONFIG (Store Settings, Shop Categories)
//   - app.js   → PRODUCTS, SPOTLIGHT_CONFIG (Featured Spotlight,
//                Featured Products)
// Each "Save" button writes straight back to the connected file,
// replacing its previous content. Nothing here uses localStorage
// or any other fallback store — the file on disk is the only
// source of truth.
// ============================================================

let STORE_CONFIG = {
  siteTitle: "",
  siteLogoImage: "",
  whatsappPhone: "",
  supportEmail: "",
  supportPhone: "",
  categories: ["Electronics", "Fashion", "Home"]
};
let PRODUCTS = [];
let SPOTLIGHT_CONFIG = { badge: '', title: '', price: 0, images: [] };

let settingsFileHandle = null;
let productsFileHandle = null;

let prodImageSource = 'url';
let prodGalleryImages = [];
let spotlightImageSource = 'url';
let spotlightGalleryImages = [];
let categoriesDraft = [...STORE_CONFIG.categories];

document.addEventListener('DOMContentLoaded', () => {
  if (!window.showOpenFilePicker) {
    document.getElementById('fsApiWarning').classList.remove('hidden');
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  renderCategoryList();
  renderProductCategoryOptions();
  renderAdminTable();
  setProdImageSource('url');
  setSpotlightImageSource('url');
});

// --- Robust const-value extractor -----------------------------------------
// Finds `const <varName> = <value>;` anywhere in the source and returns the
// parsed value, scanning brace/bracket depth (and skipping string contents)
// rather than searching for a literal ";" — so values containing
// semicolons (e.g. inside a product description) parse correctly.
function extractJSData(source, varName) {
  const marker = `const ${varName} =`;
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) return undefined;

  let i = markerIdx + marker.length;
  while (i < source.length && /\s/.test(source[i])) i++;
  const valueStart = i;

  let depth = 0;
  let inString = null;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    else if (ch === ';' && depth === 0) break;
  }

  const valueText = source.slice(valueStart, i);
  try {
    return JSON.parse(valueText);
  } catch (e) {
    try {
      return (new Function(`return (${valueText});`))();
    } catch (err) {
      console.error(`Error parsing ${varName}:`, err);
      return undefined;
    }
  }
}

// --- Settings File (main.js) -----------------------------------------------
async function connectSettingsFile() {
  try {
    if (!window.showOpenFilePicker) {
      alert("Your browser does not support direct file sync. Please use Google Chrome, Microsoft Edge, or Opera.");
      return;
    }

    [settingsFileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JavaScript Files', accept: { 'text/javascript': ['.js'] } }],
      multiple: false
    });

    const file = await settingsFileHandle.getFile();
    const content = await file.text();
    const parsed = extractJSData(content, 'STORE_CONFIG');

    if (parsed) {
      STORE_CONFIG = parsed;
      categoriesDraft = [...(STORE_CONFIG.categories || [])];
      loadStoreSettingsForm();
      renderCategoryList();
      renderProductCategoryOptions();

      document.getElementById('settings-status-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block';
      document.getElementById('settings-status-text').textContent = `Connected: ${file.name}`;
    } else {
      alert('Could not find "const STORE_CONFIG = {...}" in this file. Make sure you selected main.js.');
    }
  } catch (err) {
    if (err.name !== 'AbortError') alert('Error accessing file: ' + err.message);
  }
}

async function writeSettingsFile() {
  if (!settingsFileHandle) {
    alert("Please click 'Connect main.js' at the top before saving.");
    return false;
  }
  try {
    const content =
`// ============================================================
// main.js — Site Settings (Store Configuration)
// ------------------------------------------------------------
// This is the ONLY place site-wide settings live. There is no
// fallback/default configuration anywhere else in the codebase.
// Edited and saved by admin.html via the File System Access API.
// ============================================================

const STORE_CONFIG = ${JSON.stringify(STORE_CONFIG, null, 2)};
`;
    const writable = await settingsFileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    alert("Failed to save main.js: " + err.message);
    return false;
  }
}

function loadStoreSettingsForm() {
  document.getElementById('cfgSiteTitle').value = STORE_CONFIG.siteTitle || '';
  document.getElementById('cfgSiteLogoImage').value = STORE_CONFIG.siteLogoImage || '';
  document.getElementById('cfgWhatsappPhone').value = STORE_CONFIG.whatsappPhone || '';
  document.getElementById('cfgSupportEmail').value = STORE_CONFIG.supportEmail || '';
  document.getElementById('cfgSupportPhone').value = STORE_CONFIG.supportPhone || '';
}

async function saveStoreSettings(e) {
  e.preventDefault();
  STORE_CONFIG.siteTitle = document.getElementById('cfgSiteTitle').value;
  STORE_CONFIG.siteLogoImage = document.getElementById('cfgSiteLogoImage').value.trim();
  STORE_CONFIG.whatsappPhone = document.getElementById('cfgWhatsappPhone').value;
  STORE_CONFIG.supportEmail = document.getElementById('cfgSupportEmail').value;
  STORE_CONFIG.supportPhone = document.getElementById('cfgSupportPhone').value;

  const success = await writeSettingsFile();
  if (success) alert('Store Settings saved to main.js!');
}

function renderCategoryList() {
  const container = document.getElementById('categoryList');
  if (!container) return;
  container.innerHTML = categoriesDraft.length ? categoriesDraft.map(cat => `
    <span class="flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">
      ${cat}
      <button type="button" onclick="removeCategory('${cat.replace(/'/g, "\\'")}')" class="text-slate-400 hover:text-rose-600">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('') : `<p class="text-xs text-slate-400">No categories yet.</p>`;
}

function addCategory() {
  const input = document.getElementById('newCategoryInput');
  const val = input.value.trim();
  if (!val || categoriesDraft.includes(val)) return;
  categoriesDraft.push(val);
  input.value = '';
  renderCategoryList();
}

function removeCategory(cat) {
  categoriesDraft = categoriesDraft.filter(c => c !== cat);
  renderCategoryList();
}

async function saveCategories() {
  STORE_CONFIG.categories = [...categoriesDraft];
  const success = await writeSettingsFile();
  if (success) {
    renderProductCategoryOptions();
    alert('Shop Categories saved to main.js!');
  }
}

// --- Products File (app.js) -------------------------------------------------
async function connectProductsFile() {
  try {
    if (!window.showOpenFilePicker) {
      alert("Your browser does not support direct file sync. Please use Google Chrome, Microsoft Edge, or Opera.");
      return;
    }

    [productsFileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JavaScript Files', accept: { 'text/javascript': ['.js'] } }],
      multiple: false
    });

    const file = await productsFileHandle.getFile();
    const content = await file.text();
    const parsedProducts = extractJSData(content, 'PRODUCTS');
    const parsedSpotlight = extractJSData(content, 'SPOTLIGHT_CONFIG');

    if (parsedProducts !== undefined) {
      PRODUCTS = parsedProducts || [];
      if (parsedSpotlight !== undefined) SPOTLIGHT_CONFIG = parsedSpotlight;

      renderAdminTable();
      loadSpotlightForm();
      renderProductCategoryOptions();

      document.getElementById('products-status-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block';
      document.getElementById('products-status-text').textContent = `Connected: ${file.name}`;
    } else {
      alert('Could not find "const PRODUCTS = [...]" in this file. Make sure you selected app.js.');
    }
  } catch (err) {
    if (err.name !== 'AbortError') alert('Error accessing file: ' + err.message);
  }
}

async function writeProductsFile() {
  if (!productsFileHandle) {
    alert("Please click 'Connect app.js' at the top before saving.");
    return false;
  }
  try {
    const file = await productsFileHandle.getFile();
    const currentCode = await file.text();

    const headerEndIdx = currentCode.indexOf('const PRODUCTS');
    const landmarkIdx = currentCode.indexOf('// Global Slides Tracker');

    if (headerEndIdx === -1 || landmarkIdx === -1) {
      alert('This file doesn\'t match the expected app.js structure (missing "const PRODUCTS" or the "// Global Slides Tracker" marker). Reconnect the correct app.js file.');
      return false;
    }

    const header = currentCode.slice(0, headerEndIdx);
    const footer = currentCode.slice(landmarkIdx);
    const dataBlock =
`const PRODUCTS = ${JSON.stringify(PRODUCTS, null, 4)};

const SPOTLIGHT_CONFIG = ${JSON.stringify(SPOTLIGHT_CONFIG, null, 4)};

`;

    const writable = await productsFileHandle.createWritable();
    await writable.write(header + dataBlock + footer);
    await writable.close();
    return true;
  } catch (err) {
    alert("Failed to save app.js: " + err.message);
    return false;
  }
}

// --- Spotlight ---------------------------------------------------------------
function loadSpotlightForm() {
  document.getElementById('spotlightBadge').value = SPOTLIGHT_CONFIG.badge || '';
  document.getElementById('spotlightTitle').value = SPOTLIGHT_CONFIG.title || '';
  document.getElementById('spotlightPrice').value = SPOTLIGHT_CONFIG.price || '';

  const images = SPOTLIGHT_CONFIG.images || [];
  if (images.length > 0 && images[0].startsWith('data:')) {
    spotlightGalleryImages = images.slice(0, 3);
    setSpotlightImageSource('gallery');
    renderSpotlightPreview();
  } else {
    document.getElementById('spotlightImages').value = images.join(', ');
    setSpotlightImageSource('url');
  }
}

function setSpotlightImageSource(src) {
  spotlightImageSource = src;
  document.getElementById('spotlightImgUrlWrap').classList.toggle('hidden', src !== 'url');
  document.getElementById('spotlightImgGalleryWrap').classList.toggle('hidden', src !== 'gallery');

  const urlBtn = document.getElementById('spotlightSrcUrlBtn');
  const galleryBtn = document.getElementById('spotlightSrcGalleryBtn');
  if (urlBtn) urlBtn.className = `flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${src === 'url' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`;
  if (galleryBtn) galleryBtn.className = `flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${src === 'gallery' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`;
}

function handleSpotlightGalleryUpload(e) {
  const files = Array.from(e.target.files).slice(0, 3);
  spotlightGalleryImages = [];
  let loaded = 0;
  if (files.length === 0) { renderSpotlightPreview(); return; }

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      spotlightGalleryImages.push(ev.target.result);
      loaded++;
      if (loaded === files.length) renderSpotlightPreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderSpotlightPreview() {
  const preview = document.getElementById('spotlightImagesPreview');
  if (preview) preview.innerHTML = spotlightGalleryImages.map(src => `<img src="${src}" class="w-12 h-12 object-cover rounded-lg border border-slate-200">`).join('');
}

async function saveSpotlightSettings(e) {
  e.preventDefault();
  let imagesArr = spotlightImageSource === 'gallery'
    ? spotlightGalleryImages.slice(0, 3)
    : document.getElementById('spotlightImages').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);

  SPOTLIGHT_CONFIG = {
    badge: document.getElementById('spotlightBadge').value,
    title: document.getElementById('spotlightTitle').value,
    price: parseFloat(document.getElementById('spotlightPrice').value) || 0,
    images: imagesArr
  };

  const success = await writeProductsFile();
  if (success) alert('Featured Spotlight saved to app.js!');
}

// --- Products ------------------------------------------------------------
function renderAdminTable() {
  const table = document.getElementById('adminProductTable');
  if (!table) return;

  if (PRODUCTS.length === 0) {
    table.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">No products yet. Add one above.</td></tr>`;
    return;
  }

  table.innerHTML = PRODUCTS.map((prod, idx) => {
    const img = (prod.images && prod.images[0]) ? prod.images[0] : '';
    return `
      <tr>
        <td class="py-3 px-2">
          <img src="${img}" class="w-10 h-10 object-cover rounded-lg bg-slate-100" onerror="this.src='https://via.placeholder.com/50'">
        </td>
        <td class="py-3 px-2 font-semibold text-slate-900">${prod.name}</td>
        <td class="py-3 px-2 text-slate-500">${prod.category}</td>
        <td class="py-3 px-2 font-bold text-slate-900">₦${Number(prod.price).toLocaleString()}</td>
        <td class="py-3 px-2 text-right space-x-2 whitespace-nowrap">
          <button onclick="moveProduct(${prod.id}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-25" title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
          <button onclick="moveProduct(${prod.id}, 1)" ${idx === PRODUCTS.length - 1 ? 'disabled' : ''} class="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-25" title="Move down"><i class="fa-solid fa-arrow-down"></i></button>
          <button onclick="editProduct(${prod.id})" class="p-1.5 text-slate-600 hover:text-blue-600" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteProduct(${prod.id})" class="p-1.5 text-slate-400 hover:text-rose-600" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

async function moveProduct(id, direction) {
  const idx = PRODUCTS.findIndex(p => p.id === id);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= PRODUCTS.length) return;

  [PRODUCTS[idx], PRODUCTS[newIdx]] = [PRODUCTS[newIdx], PRODUCTS[idx]];
  const success = await writeProductsFile();
  if (success) renderAdminTable();
}

function setProdImageSource(src) {
  prodImageSource = src;
  document.getElementById('prodImgUrlWrap').classList.toggle('hidden', src !== 'url');
  document.getElementById('prodImgGalleryWrap').classList.toggle('hidden', src !== 'gallery');

  const urlBtn = document.getElementById('prodSrcUrlBtn');
  const galleryBtn = document.getElementById('prodSrcGalleryBtn');
  if (urlBtn) urlBtn.className = `flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${src === 'url' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`;
  if (galleryBtn) galleryBtn.className = `flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${src === 'gallery' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`;
}

function handleProdGalleryUpload(e) {
  const files = Array.from(e.target.files).slice(0, 3);
  prodGalleryImages = [];
  let loaded = 0;
  if (files.length === 0) { renderProdPreview(); return; }

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      prodGalleryImages.push(ev.target.result);
      loaded++;
      if (loaded === files.length) renderProdPreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderProdPreview() {
  const preview = document.getElementById('prodImagesPreview');
  if (preview) preview.innerHTML = prodGalleryImages.map(src => `<img src="${src}" class="w-12 h-12 object-cover rounded-lg border border-slate-200">`).join('');
}

function renderProductCategoryOptions(selectedCategory) {
  const select = document.getElementById('prodCategory');
  if (!select) return;
  const categories = STORE_CONFIG.categories || [];
  let current = selectedCategory !== undefined ? selectedCategory : select.value;

  let options = categories.slice();
  if (current && !options.includes(current)) options.push(current);
  if (!current && options.length > 0) current = options[0];

  if (options.length === 0) {
    select.innerHTML = `<option value="" disabled selected>Add a category first</option>`;
    return;
  }
  select.innerHTML = options.map(cat => `<option value="${cat}" ${cat === current ? 'selected' : ''}>${cat}</option>`).join('');
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('productId').value;

  let imagesArr = prodImageSource === 'gallery'
    ? prodGalleryImages.slice(0, 3)
    : document.getElementById('prodImages').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);

  if (imagesArr.length === 0) {
    alert('Please upload or provide at least one image.');
    return;
  }

  const existing = id ? PRODUCTS.find(p => p.id === parseInt(id)) : null;
  const newProd = {
    id: id ? parseInt(id) : Date.now(),
    name: document.getElementById('prodName').value,
    price: parseFloat(document.getElementById('prodPrice').value),
    category: document.getElementById('prodCategory').value,
    images: imagesArr,
    description: document.getElementById('prodDesc').value,
    rating: existing ? existing.rating : 5.0,
    reviews: existing ? existing.reviews : 0,
    isNew: existing ? existing.isNew : false
  };

  if (id) {
    PRODUCTS = PRODUCTS.map(p => p.id === parseInt(id) ? newProd : p);
  } else {
    PRODUCTS.push(newProd);
  }

  const success = await writeProductsFile();
  if (success) {
    resetForm();
    renderAdminTable();
  }
}

function editProduct(id) {
  const prod = PRODUCTS.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('productId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodDesc').value = prod.description;
  renderProductCategoryOptions(prod.category);

  const images = prod.images || [];
  if (images.length > 0 && images[0].startsWith('data:')) {
    prodGalleryImages = images.slice(0, 3);
    setProdImageSource('gallery');
    renderProdPreview();
  } else {
    document.getElementById('prodImages').value = images.join(', ');
    setProdImageSource('url');
  }

  document.getElementById('formTitle').innerText = 'Edit Product';
  document.getElementById('saveProdBtn').innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Update Product & Sync app.js';
  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  PRODUCTS = PRODUCTS.filter(p => p.id !== id);
  const success = await writeProductsFile();
  if (success) renderAdminTable();
}

function resetForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-box mr-2 text-brand-600"></i>Add New Product';
  document.getElementById('saveProdBtn').innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Product & Sync app.js';
  prodGalleryImages = [];
  renderProdPreview();
  setProdImageSource('url');
  renderProductCategoryOptions('');
}

async function clearAllData() {
  if (!confirm('Clear all products? This cannot be undone.')) return;
  PRODUCTS = [];
  const success = await writeProductsFile();
  if (success) renderAdminTable();
}

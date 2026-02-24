/**
 * Stockpile – Inventory Manager
 * Client-side app using localStorage for persistence.
 */

const STORAGE_KEY = 'stockpile_items';

// ── State ──────────────────────────────────────────────────────────────────
let items = load();

// ── DOM refs ───────────────────────────────────────────────────────────────
const itemList       = document.getElementById('item-list');
const emptyState     = document.getElementById('empty-state');
const searchInput    = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const addBtn         = document.getElementById('add-btn');
const modalOverlay   = document.getElementById('modal-overlay');
const itemForm       = document.getElementById('item-form');
const modalTitle     = document.getElementById('modal-title');
const cancelBtn      = document.getElementById('cancel-btn');

const fieldId           = document.getElementById('item-id');
const fieldName         = document.getElementById('item-name');
const fieldQty          = document.getElementById('item-qty');
const fieldUnit         = document.getElementById('item-unit');
const fieldCategory     = document.getElementById('item-category');
const fieldLowThreshold = document.getElementById('item-low-threshold');
const fieldNotes        = document.getElementById('item-notes');
const categoryDatalist  = document.getElementById('category-list');

const totalItemsEl = document.getElementById('total-items');
const totalUnitsEl = document.getElementById('total-units');
const lowStockEl   = document.getElementById('low-stock');

// ── Persistence ────────────────────────────────────────────────────────────
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── ID generation ──────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Derived helpers ────────────────────────────────────────────────────────
function stockStatus(item) {
  if (item.qty <= 0) return 'out';
  if (item.lowThreshold > 0 && item.qty <= item.lowThreshold) return 'low';
  return 'ok';
}

function uniqueCategories() {
  return [...new Set(items.map(i => i.category).filter(Boolean))].sort();
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const query    = searchInput.value.trim().toLowerCase();
  const catFilter = filterCategory.value;

  const visible = items.filter(item => {
    const matchSearch = !query ||
      item.name.toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.notes || '').toLowerCase().includes(query);
    const matchCat = !catFilter || item.category === catFilter;
    return matchSearch && matchCat;
  });

  // Update summary
  const totalUnits = items.reduce((s, i) => s + i.qty, 0);
  const lowCount   = items.filter(i => stockStatus(i) !== 'ok').length;
  totalItemsEl.textContent = items.length;
  totalUnitsEl.textContent = totalUnits;
  lowStockEl.textContent   = lowCount;

  // Rebuild category filter options (preserve selection)
  const cats = uniqueCategories();
  const prevCat = filterCategory.value;
  while (filterCategory.options.length > 1) filterCategory.remove(1);
  cats.forEach(c => {
    const opt = new Option(c, c);
    filterCategory.add(opt);
  });
  filterCategory.value = prevCat;

  // Rebuild category datalist for form
  categoryDatalist.innerHTML = '';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    categoryDatalist.appendChild(opt);
  });

  // Clear old item cards
  const cards = itemList.querySelectorAll('.item-card');
  cards.forEach(c => c.remove());

  // Render items
  if (visible.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  visible.forEach(item => {
    const status = stockStatus(item);
    const card = document.createElement('div');
    card.className = `item-card${status === 'low' ? ' low-stock' : ''}${status === 'out' ? ' out-of-stock' : ''}`;
    card.dataset.id = item.id;

    const badgeClass = { ok: 'badge-ok', low: 'badge-low', out: 'badge-out' }[status];
    const badgeText  = { ok: 'In Stock', low: 'Low', out: 'Out of Stock' }[status];

    const metaParts = [];
    if (item.category) metaParts.push(item.category);
    if (item.notes)    metaParts.push(item.notes);

    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        ${metaParts.length ? `<div class="item-meta">${escHtml(metaParts.join(' · '))}</div>` : ''}
      </div>
      <div class="item-qty-block">
        <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
        <span class="qty-display">${item.qty}</span>
        ${item.unit ? `<span class="qty-unit">${escHtml(item.unit)}</span>` : ''}
        <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
      </div>
      <span class="stock-badge ${badgeClass}">${badgeText}</span>
      <div class="item-actions">
        <button class="btn-icon" data-action="edit" data-id="${item.id}" title="Edit" aria-label="Edit ${escHtml(item.name)}">✏️</button>
        <button class="btn-icon" data-action="delete" data-id="${item.id}" title="Delete" aria-label="Delete ${escHtml(item.name)}">🗑️</button>
      </div>
    `;

    itemList.appendChild(card);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function openModal(item = null) {
  itemForm.reset();
  [fieldName, fieldQty, fieldUnit, fieldCategory, fieldLowThreshold, fieldNotes]
    .forEach(f => f.classList.remove('invalid'));

  if (item) {
    modalTitle.textContent = 'Edit Item';
    fieldId.value           = item.id;
    fieldName.value         = item.name;
    fieldQty.value          = item.qty;
    fieldUnit.value         = item.unit || '';
    fieldCategory.value     = item.category || '';
    fieldLowThreshold.value = item.lowThreshold || '';
    fieldNotes.value        = item.notes || '';
  } else {
    modalTitle.textContent = 'Add Item';
    fieldId.value = '';
  }

  modalOverlay.hidden = false;
  fieldName.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
}

function isValidQuantity(value) {
  return value !== '' && !isNaN(Number(value)) && Number(value) >= 0;
}


addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
});

itemForm.addEventListener('submit', e => {
  e.preventDefault();

  let valid = true;
  if (!fieldName.value.trim()) {
    fieldName.classList.add('invalid');
    valid = false;
  } else {
    fieldName.classList.remove('invalid');
  }
  if (!isValidQuantity(fieldQty.value)) {
    fieldQty.classList.add('invalid');
    valid = false;
  } else {
    fieldQty.classList.remove('invalid');
  }
  if (!valid) return;

  const id = fieldId.value;
  const data = {
    name:         fieldName.value.trim(),
    qty:          Number(fieldQty.value),
    unit:         fieldUnit.value.trim(),
    category:     fieldCategory.value.trim(),
    lowThreshold: Number(fieldLowThreshold.value) || 0,
    notes:        fieldNotes.value.trim(),
  };

  if (id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) items[idx] = { ...items[idx], ...data };
  } else {
    items.push({ id: uid(), ...data });
  }

  save();
  closeModal();
  render();
});

// Delegate qty +/- and edit/delete clicks
itemList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, id } = btn.dataset;
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (action === 'inc') {
    item.qty++;
    save();
    render();
  } else if (action === 'dec') {
    if (item.qty > 0) { item.qty--; save(); render(); }
  } else if (action === 'edit') {
    openModal(item);
  } else if (action === 'delete') {
    if (confirm(`Delete "${item.name}"?`)) {
      items = items.filter(i => i.id !== id);
      save();
      render();
    }
  }
});

searchInput.addEventListener('input', render);
filterCategory.addEventListener('change', render);

// ── Init ───────────────────────────────────────────────────────────────────
render();

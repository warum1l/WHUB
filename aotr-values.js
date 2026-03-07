// =============================================
// AOT:R Value List — Table Logic
// =============================================

let currentSort = { key: 'value', dir: 'desc' };
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  buildFilters();
  renderTable();
});

function buildFilters() {
  const sources = [...new Set(ITEMS.map(i => i.source))].sort();
  const wrap = document.getElementById('vlFilters');
  sources.forEach(src => {
    const btn = document.createElement('button');
    btn.className = 'vl-filter-btn';
    btn.dataset.source = src;
    btn.textContent = src;
    btn.onclick = () => setFilter(btn, src);
    wrap.appendChild(btn);
  });
}

function setFilter(btn, source) {
  activeFilter = source;
  document.querySelectorAll('.vl-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function sortBy(key) {
  if (currentSort.key === key) {
    currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.key = key;
    currentSort.dir = key === 'value' ? 'desc' : 'asc';
  }
  // update icons
  ['name', 'source', 'value'].forEach(k => {
    const el = document.getElementById('sort-' + k);
    if (el) el.textContent = currentSort.key === k ? (currentSort.dir === 'asc' ? '↑' : '↓') : '';
  });
  renderTable();
}

function renderTable() {
  const query = document.getElementById('vlSearch').value.toLowerCase();
  let filtered = ITEMS.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(query) || item.source.toLowerCase().includes(query);
    const matchFilter = activeFilter === 'all' || item.source === activeFilter;
    return matchSearch && matchFilter;
  });

  // sort
  filtered.sort((a, b) => {
    let va = a[currentSort.key], vb = b[currentSort.key];
    if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase();
    if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  // stats
  document.getElementById('statTotal').textContent = ITEMS.length;
  document.getElementById('statShowing').textContent = filtered.length;
  const maxVal = Math.max(...ITEMS.map(i => i.value));
  document.getElementById('statMax').textContent = maxVal.toLocaleString();

  // render rows
  const tbody = document.getElementById('vlTableBody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="vl-empty">No items found.</td></tr>`;
    return;
  }

  // rank by original value position
  const valueRanks = [...ITEMS].sort((a,b) => b.value - a.value);
  const rankMap = {};
  valueRanks.forEach((item, i) => rankMap[item.id] = i + 1);

  tbody.innerHTML = filtered.map(item => {
    const tier = getValueTier(item.value);
    return `
      <tr class="vl-row">
        <td class="col-rank"><span class="rank-num">${rankMap[item.id]}</span></td>
        <td class="col-name">
          <span class="item-name-cell">
            <span class="item-tier-dot tier-${tier}"></span>
            ${item.name}
          </span>
        </td>
        <td class="col-source"><span class="source-tag">${item.source}</span></td>
        <td class="col-value"><span class="value-cell">🔑 ${item.value.toLocaleString()}</span></td>
      </tr>
    `;
  }).join('');
}

function getValueTier(value) {
  if (value >= 10000) return 'legendary';
  if (value >= 1000)  return 'epic';
  if (value >= 100)   return 'rare';
  if (value >= 20)    return 'uncommon';
  return 'common';
}

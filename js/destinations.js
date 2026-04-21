// destinations.js — dynamic loading, filtering, and sorting for destinations

let allDestinations = [];
let _activeDestCat = 'all';

// ── Load data from API ────────────────────────────────────────────────────
async function loadDestinations() {
  try {
    allDestinations = await fetchAPI('/destinations');
    applyDestFilters(); // render immediately on load
  } catch (error) {
    console.error('Failed to load destinations:', error);
    document.getElementById('dGrid').innerHTML = '<p style="padding:40px;color:var(--danger)">Failed to load destinations. Using local fallback...</p>';
  }
}

// ── Render destination cards ──────────────────────────────────────────────────
function renderDestinations(dests) {
  const grid = document.getElementById('dGrid');
  if (!grid) return;

  if (!dests.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ts);">
      <p style="font-size:2rem;margin-bottom:12px">📍</p>
      <h3 style="margin-bottom:8px">No destinations found</h3>
      <p>Try selecting a different filter.</p>
    </div>`;
    return;
  }

  const html = dests.map(d => {
    return `
    <div class="dcard" 
         data-cat="${d.category || ''}" 
         data-type="${d.type || ''}" 
         data-price="${d.budget ? parseInt(d.budget.replace(/[^0-9]/g, '')) : 0}" 
         data-rating="5.0">
      <div class="dcard-img">
        <img src="${d.image}" alt="${d.title}">
        <span class="dcard-badge badge">Trending</span>
      </div>
      <div class="dcard-body">
        <div class="dcard-country">${d.country}</div>
        <div class="dcard-title">${d.title}</div>
        <div class="dcard-desc">${d.description || 'Explore the beauty of ' + d.title}</div>
        <div class="dcard-info">
          <span>☀️ Best: ${d.season || 'Year-round'}</span>
          <span>✈️ ${d.duration || '--'}</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="openModal('${d._id || d.id}')">View Details</button>
          <a href="packages.html" class="btn btn-outline btn-sm">Packages</a>
        </div>
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = html;
}

// ── Category / type tag filter ────────────────────────────────────────────
function filterDest(cat, el) {
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  _activeDestCat = cat.toLowerCase();
  applyDestFilters();
}

// ── Main filter + sort logic ──────────────────────────────────────────────
function applyDestFilters() {
  const sortEl = document.getElementById('destSort');
  const sortVal = sortEl ? sortEl.value : 'popular';

  let filtered = allDestinations.filter(d => {
    if (_activeDestCat === 'all') return true;
    const catMatch = d.category && d.category.toLowerCase() === _activeDestCat;
    const typeMatch = d.type && d.type.toLowerCase() === _activeDestCat;
    return catMatch || typeMatch;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    const priceA = a.budget ? parseInt(a.budget.replace(/[^0-9]/g, '')) : 0;
    const priceB = b.budget ? parseInt(b.budget.replace(/[^0-9]/g, '')) : 0;
    
    switch (sortVal) {
      case 'price-asc':  return priceA - priceB;
      case 'price-desc': return priceB - priceA;
      case 'rating':     return 0; // Rating not yet in Destination model
      default:           return 0; // popular
    }
  });

  renderDestinations(filtered);
}

// ── Destination detail modal ──────────────────────────────────────────────────
function openModal(id) {
  const d = allDestinations.find(dest => dest._id === id || dest.id === id);
  if (!d) return;

  document.getElementById('mTitle').textContent = d.title + ', ' + d.country;
  document.getElementById('mBody').innerHTML = `
    <div class="modal-img"><img src="${d.image}" alt="${d.title}"></div>
    <p style="margin-bottom:20px;font-size:15px;line-height:1.75;color:var(--ts)">${d.description || ''}</p>
    <div class="info-grid">
      <div class="info-box"><div class="info-box-label">Duration</div><div class="info-box-value">${d.duration || '--'}</div></div>
      <div class="info-box"><div class="info-box-label">Budget</div><div class="info-box-value">${d.budget || '--'}</div></div>
      <div class="info-box"><div class="info-box-label">Best Season</div><div class="info-box-value">${d.season || '--'}</div></div>
      <div class="info-box"><div class="info-box-label">Visa</div><div class="info-box-value">${d.visa || '--'}</div></div>
    </div>
    <div class="divider"></div>
    <h4 style="margin-bottom:12px">Pre-trip Checklist</h4>
    <ul class="checklist-items">${(d.checklist && d.checklist.length) ? d.checklist.map(c => `<li>${c}</li>`).join('') : '<li>Check local travel advisories</li><li>Valid passport & ID</li>'}</ul>
    <div class="divider"></div>
    <div style="margin-top:14px;display:flex;gap:10px">
      <a href="packages.html" class="btn btn-primary btn-full">View Packages</a>
      <a href="booking.html" class="btn btn-outline btn-full">Book Now</a>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  loadDestinations();
  document.getElementById('modal')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
});

// Global exports
window.filterDest = filterDest;
window.applyDestFilters = applyDestFilters;
window.openModal = openModal;
window.closeModal = closeModal;

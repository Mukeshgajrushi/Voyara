// packages.js — dynamic loading, filtering, and sorting

let allPackages = [];
let _activePkgCat = 'all';

// ── Load data from API / fallback ─────────────────────────────────────────
async function loadPackages() {
  try {
    allPackages = await fetchAPI('/packages');
    applyPkgFilters(); // render immediately on load
  } catch (error) {
    console.error('Failed to load packages:', error);
  }
}

// ── Render package cards ──────────────────────────────────────────────────
function renderPackages(packages) {
  const grid = document.getElementById('pkgGrid');
  if (!grid) return;

  if (!packages.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ts);">
      <p style="font-size:2rem;margin-bottom:12px">🔍</p>
      <h3 style="margin-bottom:8px">No packages found</h3>
      <p>Try selecting a different filter.</p>
    </div>`;
    return;
  }

  const html = packages.map(pkg => {
    let badgeHtml = '';
    if (pkg.badges && pkg.badges.length > 0) {
      badgeHtml = `<span class="pkg-badge badge${pkg.badges[0] === 'New' ? ' badge-warn' : ''}">${pkg.badges[0]}</span>`;
    }

    return `
    <div class="pkg-card" 
         data-cat="${pkg.category}" 
         data-type="${pkg.type || ''}" 
         data-price="${pkg.price}" 
         data-rating="${pkg.rating}" 
         data-duration="${pkg.duration}">
      <div class="pkg-img">
        <img src="${pkg.image}" alt="${pkg.location}">
        ${badgeHtml}
      </div>
      <div class="pkg-body">
        <div class="pkg-cat">${pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1)} · ${pkg.location}</div>
        <h3 class="pkg-title">${pkg.title}</h3>
        <p class="pkg-desc">${pkg.desc}</p>
        <div class="pkg-meta">
          <span>🗓️ ${pkg.duration}</span>
          ${pkg.meta.map(m => `<span>${m}</span>`).join('')}
        </div>
        <div class="pkg-rating">
          <div class="stars">
            ${'<span>★</span>'.repeat(Math.round(pkg.rating))}${'<span style="color:var(--border)">★</span>'.repeat(5 - Math.round(pkg.rating))}
          </div>
          <span>${pkg.rating}</span><span style="color:var(--ts)">(${pkg.reviewCount} reviews)</span>
        </div>
      </div>
      <div class="pkg-footer">
        <div class="pkg-price">₹${pkg.price.toLocaleString('en-IN')} <small>/person</small></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="openPkg('${pkg.id}')">Details</button>
          <a href="booking.html?pkg=${pkg.id}" class="btn btn-primary btn-sm">Book Now</a>
        </div>
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = html;

  // Trigger animations
  requestAnimationFrame(() => {
    grid.querySelectorAll('.pkg-card').forEach((card, i) => {
      card.style.animationDelay = (i * 0.05) + 's';
    });
  });
}

// ── Category / type tag filter ────────────────────────────────────────────
function filterPkg(cat, el) {
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  _activePkgCat = cat.toLowerCase(); // Ensure lowercase
  applyPkgFilters();
}

// ── Main filter + sort logic ──────────────────────────────────────────────
function applyPkgFilters() {
  const sortEl     = document.getElementById('pkgSort');
  const durEl      = document.getElementById('pkgDuration');
  const budgetEl   = document.getElementById('pkgBudget');

  const sortVal    = sortEl   ? sortEl.value   : 'recommended';
  const durVal     = durEl    ? durEl.value    : 'any';
  const budgetVal  = budgetEl ? budgetEl.value : 'any';

  let filtered = allPackages.filter(p => {
    // Category / type filter - Case insensitive
    if (_activePkgCat !== 'all') {
      const catMatch = p.category && p.category.toLowerCase() === _activePkgCat;
      const typeMatch = p.type && p.type.toLowerCase() === _activePkgCat;
      if (!catMatch && !typeMatch) return false;
    }

    // Duration filter
    if (durVal !== 'any') {
      const days = parseInt(p.duration);
      if (durVal === '3-5'  && !(days >= 3 && days <= 5))  return false;
      if (durVal === '5-7'  && !(days >= 5 && days <= 7))  return false;
      if (durVal === '7plus' && days < 7)                   return false;
    }

    // Budget filter
    if (budgetVal !== 'any') {
      const price = p.price;
      if (budgetVal === 'under20'  && price >= 20000)               return false;
      if (budgetVal === '20-60'    && (price < 20000 || price > 60000)) return false;
      if (budgetVal === 'over60'   && price <= 60000)               return false;
    }

    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortVal) {
      case 'price-asc':  return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'rating':     return b.rating - a.rating;
      default:           return 0; // recommended
    }
  });

  renderPackages(filtered);
}

// ── Package detail modal ──────────────────────────────────────────────────
async function openPkg(id) {
  const p = allPackages.find(pkg => pkg.id === id || pkg._id === id);
  if (!p) return;
  
  // Use _id for API requests if it exists (MongoDB), otherwise fallback to id
  const packageId = p._id || p.id;
  
  document.getElementById('pmTitle').textContent = p.title;
  document.getElementById('pkgModal').classList.add('open');
  document.getElementById('pmBody').innerHTML = `<div style="padding:40px;text-align:center"><div class="spinner"></div></div>`;

  try {
    const reviews = await fetchAPI('/reviews/package/' + packageId);

    document.getElementById('pmBody').innerHTML = `
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab(this,'inc')">What's Included</button>
        <button class="tab-btn" onclick="switchTab(this,'rev')">Reviews (${reviews.length})</button>
      </div>
      <div class="tab-panel active" id="tab-inc">
        <ul class="inc-list">${p.included.map(i => `<li class="inc-item">${i}</li>`).join('')}</ul>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><span style="font-size:13px;color:var(--ts)">Starting from</span><br><span style="font-family:var(--fd);font-size:1.8rem;color:var(--text)">₹${p.price.toLocaleString('en-IN')}</span><span style="font-size:13px;color:var(--ts)"> /person</span></div>
          <a href="booking.html?pkg=${packageId}" class="btn btn-primary btn-lg">Book This Package</a>
        </div>
      </div>
      <div class="tab-panel" id="tab-rev">
        ${reviews.length > 0 ? reviews.map(r => `
          <div class="review-card">
            <div class="review-top">
              <div>
                <span class="reviewer">${r.userName}</span>
                <div class="stars" style="margin-top:4px">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
              </div>
              <span class="rev-date">${new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="rev-body">${r.text}</p>
          </div>
        `).join('') : `<p style="text-align:center;padding:20px;color:var(--ts)">No reviews yet. Be the first to share your experience!</p>`}
        <div class="write-review" onclick="window.location.href='my-trips.html'"><p style="color:var(--ts);font-size:14px">Have you been on this trip? <strong style="color:var(--ac)">Write a review in My Trips →</strong></p></div>
      </div>`;
  } catch (err) {
    console.error('Error loading package details:', err);
  }
}

function closePkg() {
  document.getElementById('pkgModal').classList.remove('open');
}

function switchTab(btn, id) {
  btn.closest('.modal-body').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.closest('.modal-body').querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  loadPackages();
  document.getElementById('pkgModal')?.addEventListener('click', function(e) { if (e.target === this) closePkg(); });
});

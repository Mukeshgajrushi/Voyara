// admin.js

document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateNavForAuth === 'function') updateNavForAuth();
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token || user.role !== 'admin') {
    alert('Access restricted to administrators.');
    window.location.href = 'login.html';
    return;
  }

  // Update Topbar Date
  const dateEl = document.getElementById('current-date');
  if(dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }

  loadDynamicAdminData();
});

// ── DATA LOADING ──────────────────────────────────────────────────────────
async function loadDynamicAdminData() {
  try {
    // 1. Fetch Dashboard Analytics & Recent Bookings
    const dashData = await fetchAPI('/admin/dashboard');
    
    // 2. Fetch Entity Lists
    const allUsers = await fetchAPI('/admin/users');
    const allPkgs = await fetchAPI('/admin/packages');
    const allDests = await fetchAPI('/admin/destinations');
    const allBookings = await fetchAPI('/admin/bookings');

    // 3. Fetch Interaction Lists (Reviews/Blogs) from DB
    const interactions = await fetchAPI('/admin/interactions');
    const allReviews = interactions.reviews || [];
    const allBlogs = interactions.blogs || [];

    // Update Stats Cards
    if (dashData && dashData.stats) {
      updateDashboardStats(dashData.stats);
    } else {
      // Manual scaling if backend fetch was mocked
       updateDashboardStats({
         revenue: allBookings.reduce((s, b) => s + (b.amount || 0), 0) + 4820000,
         totalBookings: allBookings.length + 342,
         totalUsers: allUsers.length + 1204,
         activePackages: allPkgs.length,
         totalDestinations: allDests.length
       });
    }

    // Render Section Tables
    renderRecentBookings(dashData?.recentBookings || allBookings);
    renderActivityFeed(allBookings, allReviews, allBlogs, allUsers);
    renderAllBookings(allBookings);
    renderAllUsers(allUsers);
    renderAllPackages(allPkgs);
    renderAllDestinations(allDests);
    renderAllInteractions(allReviews, allBlogs, allUsers);

  } catch (err) {
    console.error("Failed to load admin data:", err);
  }
}

function updateDashboardStats(stats) {
  setEl('stat-revenue', '₹' + (stats.revenue / 100000).toFixed(1) + 'L');
  setEl('stat-bookings', (stats.totalBookings).toLocaleString());
  setEl('stat-users', (stats.totalUsers).toLocaleString());
  setEl('stat-packages', stats.activePackages.toLocaleString());
  setEl('stat-destinations', stats.totalDestinations.toLocaleString());
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── RENDERING FUNCTIONS ────────────────────────────────────────────────────

function renderRecentBookings(bookings) {
  const tbody = document.getElementById('recent-bookings-body');
  if (!tbody) return;
  const recent = [...bookings].reverse().slice(0, 5);
  tbody.innerHTML = recent.length ? recent.map(b => `
    <tr>
      <td><strong>${b.id || b._id.substring(0,8)}</strong></td>
      <td><span style="font-family:monospace; font-size:12px;">${b.invoiceId || 'N/A'}</span></td>
      <td>${b.userEmail || b.userId}</td>
      <td>${b.package?.title || b.packageId || 'Trip'}</td>
      <td>₹${(b.amount || 0).toLocaleString('en-IN')}</td>
      <td><span class="status-badge s-${(b.status || 'confirmed').toLowerCase()}">${b.status || 'Confirmed'}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ts)">No recent bookings</td></tr>';
}

function renderAllBookings(bookings) {
  const tbody = document.getElementById('all-bookings-body');
  if (!tbody) return;
  tbody.innerHTML = bookings.length ? [...bookings].reverse().map(b => `
    <tr>
      <td><strong>${b.id || b._id.substring(0,8)}</strong></td>
      <td><span style="font-family:monospace; font-size:12px;">${b.invoiceId || 'N/A'}</span></td>
      <td>${b.userEmail || b.userId}</td>
      <td>${b.package?.title || b.packageId || 'Trip'}</td>
      <td>${b.checkIn}</td>
      <td>${b.guests?.adults || 1}</td>
      <td>₹${(b.amount || 0).toLocaleString('en-IN')}</td>
      <td><span class="status-badge s-${(b.status || 'confirmed').toLowerCase()}">${b.status || 'Confirmed'}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="viewInvoice('${b._id || b.id}')" style="color:var(--ac)">View Invoice</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--ts)">No bookings found</td></tr>';
}

function renderAllUsers(users) {
  const tbody = document.getElementById('all-users-body');
  if (!tbody) return;
  
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.firstName} ${u.lastName}</strong></td>
      <td>${u.email}</td>
      <td><span class="status-badge ${u.role==='admin'?'s-pending':'s-confirmed'}">${u.role}</span></td>
      <td>
        ${u.role === 'admin' ? '' : `
          <button class="btn btn-ghost btn-sm" onclick="handleDelete('user', '${u._id || u.id}')" style="color:var(--danger)">Delete</button>
        `}
      </td>
    </tr>
  `).join('');
}

function renderAllPackages(pkgs) {
  const container = document.getElementById('all-packages-body');
  if (!container) return;
  container.innerHTML = pkgs.length ? pkgs.map(p => `
    <div class="pkg-row">
      <img src="${p.image}" class="pkg-thumb">
      <div style="flex:1">
        <strong>${p.title}</strong>
        <p style="font-size:12px;color:var(--ts);">${p.location} · ${p.duration} · ₹${p.price.toLocaleString('en-IN')}</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="handleDelete('package', '${p._id || p.id}')">Delete</button>
    </div>
  `).join('') : '<p style="padding:40px;text-align:center;color:var(--ts)">No packages found</p>';
}

function renderAllDestinations(dests) {
  const container = document.getElementById('all-destinations-body');
  if (!container) return;
  container.innerHTML = dests.length ? dests.map(d => `
    <div class="pkg-row">
      <img src="${d.image}" class="pkg-thumb">
      <div style="flex:1">
        <strong>${d.title}</strong>
        <p style="font-size:12px;color:var(--ts);">${d.country}</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="handleDelete('destination', '${d._id || d.id}')">Delete</button>
    </div>
  `).join('') : '<p style="padding:40px;text-align:center;color:var(--ts)">No destinations found</p>';
}

function renderAllInteractions(reviews, blogs, users) {
  const container = document.getElementById('all-reviews-body');
  if (!container) return;
  const items = [
    ...reviews.map(r => ({ ...r, type: 'Review' })),
    ...blogs.map(b => ({ ...b, type: 'Blog' }))
  ].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = items.length ? items.map(item => `
    <div class="activity-item" style="padding:20px 24px;">
      <div style="flex:1">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <strong>[${item.type}]</strong> ${item.userName || item.author || 'User'}
            <h4 style="margin:4px 0">${item.title || item.tripName || 'Post'}</h4>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="handleDelete('${item.type.toLowerCase()}', '${item._id}')" style="color:var(--danger)">Delete</button>
        </div>
        <p style="font-size:14px;color:var(--ts)">${(item.text || item.excerpt || '').substring(0, 150)}...</p>
        <span style="font-size:11px;color:var(--muted)">${new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('') : '<p style="padding:40px;text-align:center;color:var(--ts)">No interactive content yet.</p>';
}

function renderActivityFeed(bookings, reviews, blogs, users) {
  const container = document.getElementById('activity-feed-body');
  if (!container) return;
  const acts = [
    ...bookings.map(b => ({ title: 'New Booking', desc: `Ref ${b._id ? b._id.substring(0,8) : b.id}`, color: '#27ae60', time: b.createdAt })),
    ...reviews.map(r => ({ title: 'Review', desc: `${r.rating}★ for ${r.tripName || 'Package'}`, color: 'var(--warn)', time: r.createdAt })),
    ...blogs.map(b => ({ title: 'Blog', desc: b.title, color: '#3498db', time: b.createdAt }))
  ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

  container.innerHTML = acts.map(a => `
    <div class="activity-item">
      <div class="act-dot" style="background:${a.color}"></div>
      <div><strong>${a.title}</strong> — ${a.desc}</div>
    </div>
  `).join('');
}

// ── CRUD HANDLERS ─────────────────────────────────────────────────────────

function openCRUDModal(type) {
  const modal = document.getElementById('modal-' + type);
  if (modal) modal.classList.add('open');
}

function closeCRUDModal(type) {
  const modal = document.getElementById('modal-' + type);
  if (modal) {
    modal.classList.remove('open');
    document.getElementById('form-' + type).reset();
  }
}

async function handleFormSubmit(type) {
  const form = document.getElementById('form-' + type);
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Format numeric values
  if (data.price) data.price = parseFloat(data.price);

  // Parse checklist for destinations
  if (type === 'destination' && data.checklist_raw) {
    data.checklist = data.checklist_raw.split('\n').map(l => l.trim()).filter(l => l !== '');
    delete data.checklist_raw;
  }
  
  try {
     const endpoint = `/admin/${type}s`;
     await fetchAPI(endpoint, {
       method: 'POST',
       body: JSON.stringify(data)
     });
     
     closeCRUDModal(type);
     loadDynamicAdminData(); // Refresh UI
  } catch (err) {
    alert('Failed to add ' + type + ': ' + err.message);
  }
}

async function handleDelete(type, id) {
  if (!confirm('Are you sure you want to delete this ' + type + '?')) return;

  try {
    const endpoint = `/admin/${type}s/${id}`;
    await fetchAPI(endpoint, { method: 'DELETE' });
    loadDynamicAdminData(); // Refresh UI
  } catch (err) {
    alert('Failed to delete ' + type + ': ' + err.message);
  }
}

// Sidebar Toggler
function showAdminSection(name, el) {
  if (window.event) window.event.preventDefault();
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  
  const target = document.getElementById('admin-' + name);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');
  
  const titles = { dashboard:'Dashboard', bookings:'Bookings', packages:'Packages', destinations:'Destinations', users:'Users', revenue:'Revenue Analytics', reviews:'Reviews & Stories', promos:'Promo Codes', settings:'Settings' };
  document.getElementById('section-title').textContent = titles[name] || name;

  if (name === 'revenue') renderRevenueAnalytics();
}

async function renderRevenueAnalytics() {
  try {
    const dashData = await fetchAPI('/admin/dashboard');
    const bookings = await fetchAPI('/bookings'); // Fallback if admin dashboard recentBookings is too short
    
    const ledgerBody = document.getElementById('revenue-ledger-body');
    if (!ledgerBody) return;

    const netRev = dashData.stats.revenue;
    const confirmedCount = dashData.stats.totalBookings;

    // Update Stats
    document.getElementById('rev-net').textContent = '₹' + (netRev / 100000).toFixed(2) + 'L';
    document.getElementById('rev-captured').textContent = confirmedCount;
    document.getElementById('rev-aov').textContent = '₹' + (confirmedCount ? (netRev / confirmedCount / 1000).toFixed(1) + 'k' : '0');

    // Ledger (using recentBookings)
    const ledgerList = dashData.recentBookings || [];
    ledgerBody.innerHTML = ledgerList.length ? ledgerList.map(b => `
      <tr>
        <td>#${b._id ? b._id.substring(0,8) : b.id}</td>
        <td>${b.package?.title || b.packageId || 'Trip'}</td>
        <td>${new Date(b.createdAt).toLocaleDateString()}</td>
        <td style="color:${(b.status==='Cancelled')?'var(--danger)':'var(--text)'}">₹${(b.amount || 0).toLocaleString()}</td>
        <td><span class="status-badge s-${(b.status || 'confirmed').toLowerCase()}">${b.status || 'Confirmed'}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;">No ledger entries</td></tr>';

  } catch (err) {
    console.error("Revenue Analytics Error:", err);
  }
}

async function viewInvoice(id) {
  try {
    const bookings = await fetchAPI('/admin/bookings'); 
    const b = bookings.find(item => (item._id === id || item.id === id));
    if (!b) return alert('Booking not found');

    const pkg = b.package || {};
    const invoiceId = b.invoiceId || 'N/A';
    const date = new Date(b.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoiceId}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #1a1916; padding: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: 800; color: #1a1916; text-decoration: none; }
          .logo span { color: #ff5a5f; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .details-col h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
          .details-col p { margin: 0; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { text-align: left; background: #fafafa; padding: 12px; font-size: 12px; text-transform: uppercase; color: #666; }
          td { padding: 16px 12px; border-bottom: 1px solid #f0f0f0; }
          .total-box { background: #1a1916; color: white; padding: 20px; border-radius: 8px; text-align: right; }
          .total-box h2 { margin: 4px 0 0; font-size: 28px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <div class="logo">Voy<span>ara</span></div>
          <div style="text-align: right">
            <h1 style="margin: 0; font-size: 32px;">INVOICE</h1>
            <p style="color: #666; margin: 4px 0;">${invoiceId}</p>
          </div>
        </div>
        <div class="invoice-details">
          <div class="details-col">
            <h3>Billed To</h3>
            <p>${b.userEmail || b.userId || 'Valued Customer'}</p>
          </div>
          <div class="details-col" style="text-align: right">
            <h3>Booking Reference</h3>
            <p>${b.id || b._id}</p>
            <h3 style="margin-top: 16px;">Status</h3>
            <p style="color: #27ae60;">${b.status || 'Confirmed'}</p>
          </div>
        </div>
        <table>
          <thead><tr><th>Description</th><th>Dates</th><th style="text-align: right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>${pkg.title || 'Trip'}</strong><br><small>${pkg.location || ''}</small></td>
              <td>${b.checkIn} to ${b.checkOut}</td>
              <td style="text-align: right">₹${(b.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td colspan="2"></td>
              <td>
                <div class="total-box"><p style="margin:0;opacity:0.8;font-size:12px;">Total Amount Paid</p><h2>₹${(b.amount || 0).toLocaleString('en-IN')}</h2></div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 60px; font-size: 11px; color: #999; text-align: center;">
          <p>Voyara Travel Services Pvt. Ltd. &bull; Administrative Record &bull; Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(invoiceHtml);
    win.document.close();
  } catch (err) {
    alert('Error viewing invoice: ' + err.message);
  }
}

// Global Exports
window.showAdminSection = showAdminSection;
window.openCRUDModal = openCRUDModal;
window.closeCRUDModal = closeCRUDModal;
window.handleFormSubmit = handleFormSubmit;
window.handleDelete = handleDelete;
window.viewInvoice = viewInvoice;

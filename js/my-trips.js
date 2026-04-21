// my-trips.js — loads user profile and bookings dynamically

let myBookings = []; // Global store for modal access

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Populate sidebar profile
  const initials = ((user.firstName ? user.firstName[0] : '') + (user.lastName ? user.lastName[0] : '')).toUpperCase() || 'U';
  document.getElementById('profile-avatar-text').textContent = initials;
  document.getElementById('profile-name').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Traveller';
  document.getElementById('profile-email').textContent = user.email || '';

  // Load bookings
  try {
    const bookings = await fetchAPI('/bookings/my-trips');
    myBookings = Array.isArray(bookings) ? bookings : [];
    renderTrips(myBookings);
    updateProfileStats(myBookings);
  } catch (err) {
    console.error('Failed to load trips', err);
    document.getElementById('trips-list').innerHTML =
      '<p style="padding:20px;color:var(--danger);">Could not load your trips. Please try again later.</p>';
  }
});

async function updateProfileStats(bookings) {
  // Cities logic: Unique locations from bookings
  const cities = new Set();
  bookings.forEach(b => {
    if (b.package && b.package.location) {
      b.package.location.split(',').forEach(loc => cities.add(loc.trim()));
    }
  });
  document.getElementById('stat-cities-count').textContent = cities.size || 0;

  // Rating logic: Average of user's reviews from API
  try {
    const reviews = await fetchAPI('/reviews/my-reviews');
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      document.getElementById('stat-user-rating').textContent = avg.toFixed(1);
    } else {
      document.getElementById('stat-user-rating').textContent = '5.0';
    }
  } catch (err) {
    console.error('Failed to load rating stats', err);
  }
}

function renderTrips(bookings) {
  const list = document.getElementById('trips-list');
  list.innerHTML = '';

  if (!bookings.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:64px 20px;">
        <div style="font-size:56px;margin-bottom:20px;">☁️</div>
        <h3 class="heading-3 mb-8">No journeys found</h3>
        <p style="color:var(--ts);margin-bottom:28px;max-width:300px;margin-left:auto;margin-right:auto;">Every great journey starts with a single click. Start yours today.</p>
        <a href="packages.html" class="btn btn-primary">Discover Places</a>
      </div>`;
    document.getElementById('stat-total-trips').textContent = '0';
    document.getElementById('stat-total-spent').textContent = '₹0';
    document.getElementById('stat-trips-count').textContent = '0';
    return;
  }

  let totalSpent = 0;
  bookings.forEach(b => {
    totalSpent += b.amount || 0;
    const pkg = b.package || {};
    
    // Status Logic
    let statusColor = '#666';
    let statusBg = 'var(--border)';
    if (b.status === 'Confirmed') { statusColor = '#fff'; statusBg = 'var(--ac)'; }
    if (b.status === 'Cancelled') { statusColor = '#fff'; statusBg = 'var(--danger)'; }
    if (b.status === 'Pending')   { statusColor = '#1a1916'; statusBg = 'var(--warn)'; }

    const checkoutDate = b.checkOut ? new Date(b.checkOut) : null;
    const isCompleted = checkoutDate && checkoutDate < new Date() && b.status !== 'Cancelled';
    const finalStatusName = isCompleted ? 'Completed' : (b.status || 'Confirmed');
    const filterStatus = isCompleted ? 'completed' : ((b.status === 'Cancelled') ? 'cancelled' : 'upcoming');

    // Create Card
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.dataset.status = filterStatus;
    card.onclick = () => openTripModal(b.id);
    
    card.innerHTML = `
      <div class="trip-img-box">
        <img src="${pkg.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80'}" class="trip-img">
      </div>
      <div class="trip-content">
        <div class="flex justify-between items-start mb-12">
          <div>
            <p style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${pkg.location || 'GLOBAL'}</p>
            <h3 class="heading-3" style="font-size:20px;">${pkg.title || 'Custom Adventure'}</h3>
          </div>
          <span class="status-pill" style="background:${statusBg}; color:${statusColor};">${finalStatusName}</span>
        </div>
        <div style="font-size:14px; color:var(--ts); display:flex; gap:16px; margin-bottom:auto;">
          <span>📅 ${b.checkIn || '--'}</span>
          <span>👥 ${b.guests?.adults || 1} Traveller${(b.guests?.adults > 1) ? 's' : ''}</span>
        </div>
        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <p style="font-size:11px; color:var(--muted);">TOTAL INVESTMENT</p>
            <strong style="font-size:18px; color:var(--text); font-family:var(--fb);">₹${(b.amount || 0).toLocaleString('en-IN')}</strong>
          </div>
          <span style="font-size:13px; color:var(--ac); font-weight:600;">View Details →</span>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  document.getElementById('stat-total-trips').textContent = bookings.length;
  document.getElementById('stat-trips-count').textContent = bookings.length;
  document.getElementById('stat-total-spent').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
}

let activeTripId = null;

function openTripModal(id) {
  const b = myBookings.find(item => item.id === id || item._id === id);
  if (!b) return;
  activeTripId = id;

  const pkg = b.package || {};
  document.getElementById('modal-img').src = pkg.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
  document.getElementById('modal-title').textContent = pkg.title || 'Trip Details';
  document.getElementById('modal-status').textContent = b.status || 'Confirmed';
  document.getElementById('modal-dates').textContent = `${b.checkIn} - ${b.checkOut}`;
  document.getElementById('modal-ref').textContent = `#VOY-${String(b.id || b._id).slice(-6).toUpperCase()}`;
  document.getElementById('modal-guests').textContent = `${b.guests?.adults || 1} Adult${(b.guests?.adults > 1) ? 's' : ''}`;
  document.getElementById('modal-amount').textContent = `₹${(b.amount || 0).toLocaleString('en-IN')}`;

  // Cancellation Button Logic
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const checkoutDate = b.checkOut ? new Date(b.checkOut) : null;
  const isPast = checkoutDate && checkoutDate < new Date();
  
  if (cancelBtn) {
    if (b.status === 'Cancelled' || isPast) {
      cancelBtn.style.display = 'none';
    } else {
      cancelBtn.style.display = 'block';
    }
  }

  document.getElementById('trip-modal-overlay').classList.add('active');
}

async function handleCancelBooking() {
  if (!activeTripId) return;
  
  if (!confirm('Are you sure you want to cancel this booking? This action is permanent.')) {
    return;
  }

  const btn = document.getElementById('modal-cancel-btn');
  btn.disabled = true;
  btn.textContent = 'Cancelling...';

  try {
    const res = await fetchAPI(`/bookings/${activeTripId}/cancel`, {
      method: 'PUT'
    });

    if (res) {
      alert('Booking cancelled successfully.');
      closeTripModal();
      // Reload bookings to refresh UI
      const bookings = await fetchAPI('/bookings/my-trips');
      myBookings = Array.isArray(bookings) ? bookings : [];
      renderTrips(myBookings);
      updateProfileStats(myBookings);
    }
  } catch (err) {
    console.error('Cancellation failed', err);
    alert('Failed to cancel booking. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = '✕ Cancel Booking';
  }
}

function closeTripModal(e) {
  if (!e || e.target.id === 'trip-modal-overlay') {
    document.getElementById('trip-modal-overlay').classList.remove('active');
    activeTripId = null;
  }
}

async function downloadInvoice() {
  if (!activeTripId) return;
  const b = myBookings.find(item => item.id === activeTripId || item._id === activeTripId);
  if (!b) return;

  const pkg = b.package || {};
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const invoiceId = b.invoiceId || `INV-${String(b.id || b._id).slice(-8).toUpperCase()}`;
  const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

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
        .total-row td { border-bottom: none; padding-top: 24px; }
        .total-box { background: #1a1916; color: white; padding: 20px; border-radius: 8px; text-align: right; }
        .total-box p { margin: 0; font-size: 14px; opacity: 0.8; }
        .total-box h2 { margin: 4px 0 0; font-size: 28px; }
        .footer { margin-top: 60px; font-size: 12px; color: #999; text-align: center; }
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
          <p>${user.firstName} ${user.lastName}</p>
          <p style="font-weight: 400; color: #666;">${user.email}</p>
        </div>
        <div class="details-col" style="text-align: right">
          <h3>Issue Date</h3>
          <p>${date}</p>
          <h3 style="margin-top: 16px;">Status</h3>
          <p style="color: #27ae60;">${b.status || 'Confirmed'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Booking Dates</th>
            <th>Travellers</th>
            <th style="text-align: right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <p style="margin: 0; font-weight: 600;">${pkg.title || 'Custom Adventure'}</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #666;">${pkg.location || 'Global'}</p>
            </td>
            <td>${b.checkIn} to ${b.checkOut}</td>
            <td>${b.guests?.adults || 1} Adult(s)</td>
            <td style="text-align: right; font-weight: 600;">₹${(b.amount || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2"></td>
            <td colspan="2">
              <div class="total-box">
                <p>Total Paid</p>
                <h2>₹${(b.amount || 0).toLocaleString('en-IN')}</h2>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Thank you for choosing Voyara. We wish you an incredible journey!</p>
        <p>Voyara Travel Services Pvt. Ltd. &bull; 123 Discovery Way, Explorer's Hub &bull; contact@voyara.com</p>
      </div>
      
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #1a1916; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Print Invoice</button>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  win.document.write(invoiceHtml);
  win.document.close();
}

// Global hook for the close button in HTML
window.closeTripModal = closeTripModal;

function filterTrips(status, el) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.trip-card').forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? 'flex' : 'none';
  });
}

function showSection(name, el) {
  if (window.event) window.event.preventDefault();
  ['trips', 'upcoming', 'wishlist', 'reviews', 'settings', 'write'].forEach(s => {
    const sec = document.getElementById('section-' + s);
    if (sec) sec.style.display = 'none';
  });
  const target = document.getElementById('section-' + name);
  if (target) {
    target.style.display = 'block';
    
    // Pre-fill settings if name is 'settings'
    if (name === 'settings') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sfname = document.getElementById('settings-fname');
      const slname = document.getElementById('settings-lname');
      const semail = document.getElementById('settings-email');
      const sphon  = document.getElementById('settings-phone');
      if (sfname) sfname.value = user.firstName || '';
      if (slname) slname.value = user.lastName  || '';
      if (semail) semail.value = user.email     || '';
      if (sphon)  sphon.value  = user.phone     || '';
    }
  }
  document.querySelectorAll('.side-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  
  if (name === 'upcoming') {
    showSection('trips', document.querySelector('.side-nav a[onclick*="trips"]'));
    filterTrips('upcoming', document.querySelector('.tab-btn:nth-child(2)'));
    return;
  }

  if (name === 'write' || name === 'reviews') { renderMyBlogs(); renderMyReviews(); }
}

// ── Profile Update ─────────────────────────────────────────────────────────
async function updateProfile() {
  const firstName = document.getElementById('settings-fname').value.trim();
  const lastName  = document.getElementById('settings-lname').value.trim();
  const phone     = document.getElementById('settings-phone').value.trim();
  const btn       = document.getElementById('update-profile-btn');

  if (!firstName || !lastName) {
    alert('First and Last name are required.');
    return;
  }

  const originalBtnText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const res = await fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ firstName, lastName, phone })
    });

    if (res && res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
      
      // Update Sidebar Immediately
      const initials = ((res.user.firstName ? res.user.firstName[0] : '') + (res.user.lastName ? res.user.lastName[0] : '')).toUpperCase() || 'U';
      document.getElementById('profile-avatar-text').textContent = initials;
      document.getElementById('profile-name').textContent = `${res.user.firstName || ''} ${res.user.lastName || ''}`.trim();
      
      // Update Nav (from auth.js)
      if (window.updateNavForAuth) window.updateNavForAuth();

      btn.textContent = '✅ Profile Updated!';
      btn.style.background = 'var(--ac)';
      
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalBtnText;
        btn.style.background = '';
      }, 2000);
    }
  } catch (err) {
    console.error('Update failed', err);
    alert('Failed to update profile. Please try again.');
    btn.disabled = false;
    btn.textContent = originalBtnText;
  }
}

// Global hooks
window.showSection = showSection;
window.updateProfile = updateProfile;
window.switchWriteTab = switchWriteTab;
window.submitBlog = submitBlog;
window.submitReview = submitReview;
window.clearBlogForm = clearBlogForm;
window.clearRevForm = clearRevForm;
window.updateBlogPreview = updateBlogPreview;

// Existing review/blog rendering logic preserved...
async function renderMyReviews() {
  const list = document.getElementById('user-reviews-list');
  if (!list) return;
  list.innerHTML = '<div class="spinner"></div>';

  try {
    const reviews = await fetchAPI('/reviews/my-reviews');
    list.innerHTML = '';

    if (!reviews || !reviews.length) {
      list.innerHTML = '<p style="color:var(--muted); padding:20px; text-align:center;">You haven\'t shared any reviews yet.</p>';
      return;
    }

    reviews.forEach(r => {
      const card = document.createElement('div');
      card.style.background = 'var(--white)';
      card.style.border = '1px solid var(--border)';
      card.style.borderRadius = '16px';
      card.style.padding = '24px';
      card.style.marginBottom = '16px';
      card.innerHTML = `
        <div class="flex justify-between items-center mb-8">
          <strong style="color:var(--text);">${r.tripName || 'Trip Review'}</strong>
          <span style="color:var(--warn);">${'★'.repeat(r.rating)}</span>
        </div>
        <p style="font-size:14px; color:var(--ts); line-height:1.6;">${r.text}</p>
        <span style="font-size:11px; color:var(--muted)">${new Date(r.createdAt).toLocaleDateString()}</span>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load my reviews', err);
    list.innerHTML = '<p style="color:var(--danger); padding:20px;">Error loading reviews.</p>';
  }
}

async function renderMyBlogs() {
  const container = document.getElementById('my-blogs-list');
  if (!container) return;
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const blogs = await fetchAPI('/blogs/my-blogs');
    container.innerHTML = '';

    if (!blogs || !blogs.length) {
      container.innerHTML = '<p style="color:var(--muted); padding:20px; text-align:center;">No blogs published yet by you.</p>';
      return;
    }

    blogs.forEach(blog => {
      const div = document.createElement('div');
      div.className = 'wishlist-item';
      div.style.background = 'white';
      div.innerHTML = `
        <img src="${blog.image || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=500&q=80'}" class="wishlist-thumb" style="width:80px;height:60px;">
        <div style="flex:1">
          <h3 class="heading-3" style="font-size:16px;">${blog.title}</h3>
          <p style="font-size:12px;color:var(--ts);">${new Date(blog.createdAt).toLocaleDateString()} &middot; ${blog.category}</p>
        </div>
        <span class="badge" style="background:var(--acl);color:var(--ac);">${blog.isVerified ? 'Published' : 'Under Review'}</span>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to load my blogs', err);
    container.innerHTML = '<p style="color:var(--danger); padding:20px;">Error loading blogs.</p>';
  }
}

// Pre-fill logic for settings and write sections
function switchWriteTab(tab) {
  const blogPanel = document.getElementById('write-blog');
  const revPanel = document.getElementById('write-review');
  const blogTab = document.getElementById('write-tab-blog');
  const revTab = document.getElementById('write-tab-review');

  if (tab === 'blog') {
    if (blogPanel) blogPanel.style.display = 'block';
    if (revPanel) revPanel.style.display = 'none';
    if (blogTab) blogTab.classList.add('active');
    if (revTab) revTab.classList.remove('active');
  } else {
    if (revPanel) revPanel.style.display = 'block';
    if (blogPanel) blogPanel.style.display = 'none';
    if (revTab) revTab.classList.add('active');
    if (blogTab) blogTab.classList.remove('active');
  }
}

// ── Blog submission ────────────────────────────────────────────────────────
async function submitBlog() {
  const title = document.getElementById('blog-title').value.trim();
  const category = document.getElementById('blog-cat').value;
  const destination = document.getElementById('blog-dest').value.trim();
  const image = document.getElementById('blog-img')?.value.trim();
  const excerpt = document.getElementById('blog-excerpt').value.trim();
  const content = document.getElementById('blog-body').value.trim();
  const btn = document.getElementById('blog-submit-btn');

  if (!title || !category || !destination || !excerpt || !content) {
    alert('Please fill in all required fields.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    const res = await fetchAPI('/blogs', {
      method: 'POST',
      body: JSON.stringify({ title, category, destination, excerpt, content, image })
    });

    if (res) {
      btn.textContent = '✅ Published!';
      btn.classList.add('btn-success');
      setTimeout(() => {
        btn.textContent = 'Publish Story';
        btn.classList.remove('btn-success');
        btn.disabled = false;
        clearBlogForm();
        renderMyBlogs();
      }, 2000);
    }
  } catch (err) {
    console.error('Blog submission failed', err);
    alert('Failed to publish story.');
    btn.disabled = false;
    btn.textContent = 'Publish Story';
  }
}

function clearBlogForm() {
  ['blog-title', 'blog-cat', 'blog-dest', 'blog-excerpt', 'blog-body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const imgInput = document.getElementById('blog-img');
  if (imgInput) imgInput.value = '';
  
  const preview = document.getElementById('blog-img-preview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
}

function updateBlogPreview(url) {
  const preview = document.getElementById('blog-img-preview');
  if (!preview) return;
  if (!url || !url.trim()) {
    preview.style.display = 'none';
    return;
  }
  preview.src = url;
  preview.style.display = 'block';
  preview.onerror = () => {
    preview.style.display = 'none';
  };
}

// ── Review submission ───────────────────────────────────────────────────────
async function submitReview() {
  const tripName = document.getElementById('rev-trip').value.trim();
  const rating = parseInt(document.getElementById('rev-rating').value);
  const text = document.getElementById('rev-body').value.trim();
  const btn = document.getElementById('rev-submit-btn');

  if (!tripName || !rating || !text) {
    alert('Please choose a trip, a rating, and write your review.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetchAPI('/reviews', {
      method: 'POST',
      body: JSON.stringify({ tripName, rating, text })
    });

    if (res) {
      btn.textContent = '✅ Submitted!';
      btn.classList.add('btn-success');
      setTimeout(() => {
        btn.textContent = 'Submit Review';
        btn.classList.remove('btn-success');
        btn.disabled = false;
        clearRevForm();
        renderMyReviews();
        updateProfileStats(myBookings);
      }, 2000);
    }
  } catch (err) {
    console.error('Review submission failed', err);
    alert('Failed to submit review.');
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
}

function clearRevForm() {
  const trip = document.getElementById('rev-trip');
  const body = document.getElementById('rev-body');
  const rating = document.getElementById('rev-rating');
  if (trip) trip.value = '';
  if (body) body.value = '';
  if (rating) rating.value = '0';
  setRating(0);
}

function setRating(val) {
  document.getElementById('rev-rating').value = val;
  document.querySelectorAll('.star-btn').forEach(btn => {
    const btnVal = parseInt(btn.getAttribute('data-val'));
    btn.classList.toggle('active', btnVal <= val);
  });
}

// Global hooks
window.switchWriteTab = switchWriteTab;
window.setRating = setRating;
window.submitBlog = submitBlog;
window.submitReview = submitReview;
window.clearBlogForm = clearBlogForm;
window.clearRevForm = clearRevForm;
window.updateBlogPreview = updateBlogPreview;
window.downloadInvoice = downloadInvoice;

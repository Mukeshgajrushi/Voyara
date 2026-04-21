// auth.js — handles token state, nav updates, login/logout

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

/**
 * Reads the current auth state from localStorage and updates
 * the .navbar-actions / .nav-actions element in the nav bar.
 * - Logged in  → shows user's name + "Log Out" button
 * - Logged out → shows "Login" + "Book Now" links
 */
function updateNavForAuth() {
  const token   = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  // Support both class names used across pages
  const navActions = document.querySelector('.navbar-actions') || document.querySelector('.nav-actions');
  if (!navActions) return;

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      const initials = (user.firstName ? user.firstName[0] : '') + (user.lastName ? user.lastName[0] : '');
      const isAdmin   = user.role === 'admin';

      navActions.innerHTML = `
        <a href="${isAdmin ? 'admin.html' : 'my-trips.html'}" class="btn btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:6px;">
          <span style="width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;">${initials.toUpperCase() || 'U'}</span>
          ${isAdmin ? 'Admin Dashboard' : 'My Trips'}
        </a>
        <button onclick="handleLogout()" class="btn btn-outline btn-sm">Log Out</button>
      `;
    } catch (e) {
      console.warn('auth.js: failed to parse user', e);
    }
  } else {
    navActions.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="booking.html" class="btn btn-primary btn-sm">Book Now</a>
    `;
  }
}

// Run on every page as soon as DOM is ready
document.addEventListener('DOMContentLoaded', updateNavForAuth);

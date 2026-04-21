// booking.js

let selectedPackage = null;

document.addEventListener('DOMContentLoaded', async () => {
  updateNavForAuth();
  
  // Check auth
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in to book a package.');
    window.location.href = 'login.html';
    return;
  }

  // Get package ID from URL
  const params = new URLSearchParams(window.location.search);
  const pkgId = params.get('pkg');
  
  if (pkgId) {
    try {
      selectedPackage = await fetchAPI(`/packages/${pkgId}`);
      updateSummary();
    } catch (err) {
      console.error('Failed to load package details', err);
      alert('Selected package not found.');
    }
  }

  // Pre-fill user data
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.firstName) {
    document.getElementById('t-fname').value = user.firstName || '';
    document.getElementById('t-lname').value = user.lastName || '';
    document.getElementById('t-email').value = user.email || '';
    document.getElementById('t-phone').value = user.phone || '';
  }
});

function updateSummary() {
  if (!selectedPackage) return;
  
  document.getElementById('sum-title').textContent = selectedPackage.title;
  document.getElementById('sum-meta').innerHTML = `${selectedPackage.duration} &middot; <span id="gc">2 Adults</span>`;
  document.getElementById('sum-img').src = selectedPackage.image;
  
  const budgetL = document.getElementById('budgetLink');
  if (budgetL) budgetL.href = 'budget-calculator.html?preset=' + selectedPackage.id;
  
  recalcTotal();
}

function recalcTotal() {
  if (!selectedPackage) return;
  
  const adults = parseInt(document.getElementById('adults').textContent) || 2;
  const children = parseInt(document.getElementById('children').textContent) || 0;
  
  const basePrice = selectedPackage.price;
  const subtotal = (basePrice * adults) + (basePrice * 0.5 * children);
  const taxes = Math.round(subtotal * 0.18);
  const total = subtotal + taxes;
  
  document.getElementById('p-base').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  document.getElementById('p-base-label').textContent = `Base price (${adults} Adults${children ? `, ${children} Children` : ''})`;
  document.getElementById('p-taxes').textContent = `₹${taxes.toLocaleString('en-IN')}`;
  const val = total || 0;
  document.getElementById('tot').textContent = `₹${val.toLocaleString('en-IN')}`;
  document.getElementById('confirm-btn').textContent = `Confirm & Pay ₹${val.toLocaleString('en-IN')} →`;
  
  return val;
}

// Override original `upd` function to recalc summary dynamically
const C = {adults:2, children:0, infants:0};
function upd(k, d) {
  C[k] = Math.max(k === 'adults' ? 1 : 0, C[k] + d);
  document.getElementById(k).textContent = C[k];
  const a = C.adults, c = C.children;
  document.getElementById('gc').textContent = `${a} Adult${a > 1 ? 's' : ''}${c ? `, ${c} Child${c > 1 ? 'ren' : ''}` : ''}`;
  recalcTotal();
}

async function handleConfirmBooking() {
  const tFname = document.getElementById('t-fname') ? document.getElementById('t-fname').value.trim() : 'Guest';
  const tLname = document.getElementById('t-lname') ? document.getElementById('t-lname').value.trim() : '';
  const tEmail = document.getElementById('t-email') ? document.getElementById('t-email').value.trim() : '';
  
  if (!tFname || !tEmail) {
    alert('Please provide your name and email address in Step 2 before confirming payment.');
    go(2);
    return;
  }

  const amount = recalcTotal();
  if (!amount || amount <= 0) {
    alert('Invalid total amount. Please refresh the page or try selecting a different package.');
    return;
  }
  const checkIn = document.getElementById('cin').value;
  const checkOut = document.getElementById('cout').value;
  
  try {
    const data = await fetchAPI('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        packageId: selectedPackage ? selectedPackage.id : 'custom',
        checkIn,
        checkOut,
        guests: C,
        amount,
        specialRequests: document.getElementById('t-req').value || ''
      })
    });
    
    // Hide form steps and show confirmed
    [1,2,3].forEach(i => document.getElementById('step'+i).style.display='none');
    document.getElementById('confirmed').classList.add('show');
    document.getElementById('booking-id-text').textContent = data.booking.id;
    window.scrollTo({top:0, behavior:'smooth'});

  } catch (err) {
    alert('Failed to process booking: ' + err.message);
  }
}

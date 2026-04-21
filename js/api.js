// Base URL for backend API
const API_URL = 'http://localhost:5000/api';

// Helper to handle tokens and common fetch logic
window.fetchAPI = async function(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    // Auto logout if unauthorized token
    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    return data;
  } catch (error) {
    // Backend offline — use smart mock fallback
    console.warn('Backend offline, using mock fallback for:', endpoint);
    return getMockFallback(endpoint, options);
  }
}

// ─── MOCK / OFFLINE FALLBACK ────────────────────────────────────────────────
// Simulates backend behaviour using localStorage so auth & trips work offline.
window.getMockFallback = function(endpoint, options = {}) {

  // ── AUTH: LOGIN ──────────────────────────────────────────────────────────
  if (endpoint === '/auth/login') {
    const body = JSON.parse(options.body || '{}');
    const storedUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');

    // Check against demo credentials first
    const demoUsers = [
      { id: 'u1', firstName: 'Priya', lastName: 'Sharma', email: 'priya@email.com', password: 'password123', role: 'user' },
      { id: 'a1', firstName: 'Admin', lastName: 'User',   email: 'admin@voyara.in',  password: 'admin',       role: 'admin' }
    ];
    const allUsers = [...demoUsers, ...storedUsers];
    const found = allUsers.find(u => u.email === body.email && u.password === body.password);

    if (!found) throw new Error('Invalid email or password');

    const token = 'mock-jwt-' + btoa(found.email + ':' + Date.now());
    const user = { id: found.id, firstName: found.firstName, lastName: found.lastName, email: found.email, role: found.role };
    return { token, user };
  }

  // ── AUTH: REGISTER ───────────────────────────────────────────────────────
  if (endpoint === '/auth/register') {
    const body = JSON.parse(options.body || '{}');
    const storedUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const demoEmails = ['priya@email.com', 'admin@voyara.in'];

    if (demoEmails.includes(body.email) || storedUsers.find(u => u.email === body.email)) {
      throw new Error('An account with this email already exists');
    }

    const newUser = {
      id: 'u' + Date.now(),
      firstName: body.firstName,
      lastName:  body.lastName,
      email:     body.email,
      phone:     body.phone || '',
      password:  body.password,
      role:      'user'
    };
    storedUsers.push(newUser);
    localStorage.setItem('mock_users', JSON.stringify(storedUsers));

    const token = 'mock-jwt-' + btoa(newUser.email + ':' + Date.now());
    const user  = { id: newUser.id, firstName: newUser.firstName, lastName: newUser.lastName, email: newUser.email, role: 'user' };
    return { token, user };
  }

  // ── PACKAGES LIST ────────────────────────────────────────────────────────
  if (endpoint === '/packages') {
    const defaultPkgs = [
      { id: 'maldives',  title: 'Maldives Bliss Package',        category: 'honeymoon', type: 'international', location: 'Maldives',      duration: '5 Days / 4 Nights', price: 85999,  image: 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=600&q=80',     desc: 'Overwater villa, candlelit dinners, snorkelling, and sunset cruises for two.', badges: ['Bestseller'], rating: 4.9, reviewCount: 128, meta: ['✈️ Flights Included', '🍽️ Meals Included'], included: ['Luxury overwater villa', 'Daily candlelight dinner', 'Snorkelling gear', 'Sunset cruise'] },
      { id: 'rajasthan', title: 'Royal Rajasthan Family Tour',    category: 'family',    type: 'national',      location: 'Rajasthan',     duration: '8 Days / 7 Nights', price: 32499,  image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80',  desc: 'Forts, palaces, camel rides, and folk cultural evenings for the whole family.', badges: [], rating: 4.7, reviewCount: 94, meta: ['🚌 Transport Included', '🏨 4-Star Hotels'], included: ['Palace stay in Jaipur', 'Camel safari in Thar', 'Guided city tours', 'Cultural folk evening'] },
      { id: 'manali',    title: 'Himalayan Adventure Rush',       category: 'adventure', type: 'national',      location: 'Manali',        duration: '6 Days / 5 Nights', price: 18999,  image: 'https://images.unsplash.com/photo-1594002413550-ba57ce8fc161?w=600&q=80',                                                             desc: 'Paragliding, river rafting, trekking, and snow sports in the mighty Himalayas.', badges: ['New'], rating: 4.5, reviewCount: 67, meta: ['🧗 All Activities', '🍳 Breakfast Incl.'], included: ['Paragliding session', 'Solang Valley trip', 'River rafting', 'Professional guide'] },
      { id: 'swiss',     title: 'Swiss Alps Grand Tour',          category: 'luxury',    type: 'international', location: 'Switzerland',   duration: '7 Days / 6 Nights', price: 124999, image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80', desc: 'Five-star chalets, private skiing lessons, scenic rail journeys, and fine dining.', badges: [], rating: 4.9, reviewCount: 43, meta: ['✈️ Flights Included', '⭐ 5-Star Hotels'], included: ['Luxury chalet stay', 'Private ski lessons', 'Glacier Express tickets', 'Fine dining experience'] },
      { id: 'bali',      title: 'Bali Budget Explorer',           category: 'budget',    type: 'international', location: 'Bali',          duration: '5 Days / 4 Nights', price: 38499,  image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',  desc: 'Temples, rice terraces, surf lessons, and a cooking class without breaking the bank.', badges: ['Value Pick'], rating: 4.4, reviewCount: 211, meta: ['🏨 3-Star Stays', '🛵 Scooter Rental'], included: ['Boutique villa stay', 'Balinese cooking class', 'Temple & rice terrace tour', 'Surf lesson'] },
      { id: 'london',    title: 'London Family Experience',       category: 'family',    type: 'international', location: 'London',        duration: '7 Days / 6 Nights', price: 92999,  image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80', desc: 'Harry Potter tour, Buckingham Palace, museums, and a West End show.', badges: [], rating: 4.8, reviewCount: 76, meta: ['✈️ Flights Included', '🎭 Show Tickets'], included: ['WB Harry Potter Studio tour', 'Buckingham Palace visit', 'West End show tickets', 'Hop-on hop-off pass'] }
    ];

    let storedPkgs = JSON.parse(localStorage.getItem('voyara_packages'));
    if (!storedPkgs || storedPkgs.length === 0) {
      localStorage.setItem('voyara_packages', JSON.stringify(defaultPkgs));
      storedPkgs = defaultPkgs;
    }
    return storedPkgs;
  }

  // ── AUTH: UPDATE PROFILE ──────────────────────────────────────────────────
  if (endpoint === '/auth/profile' && options.method === 'PUT') {
    const body = JSON.parse(options.body || '{}');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const storedUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    
    const userIndex = storedUsers.findIndex(u => u.id === user.id || u.email === user.email);
    const updatedUser = { 
      ...user, 
      firstName: body.firstName || user.firstName,
      lastName:  body.lastName  || user.lastName,
      phone:     body.phone     || user.phone
    };

    if (userIndex !== -1) {
      storedUsers[userIndex] = { ...storedUsers[userIndex], ...updatedUser };
      localStorage.setItem('mock_users', JSON.stringify(storedUsers));
    }

    localStorage.setItem('user', JSON.stringify(updatedUser));
    return { message: 'Profile updated successfully', user: updatedUser };
  }

  // ── DESTINATIONS LIST ──────────────────────────────────────────────────
  if (endpoint === '/destinations') {
    const defaultDests = [
      { id: 'd1', title: 'Maldives', country: 'Maldives', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&q=80' },
      { id: 'd2', title: 'Bali', country: 'Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
      { id: 'd3', title: 'Santorini', country: 'Greece', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' },
      { id: 'd4', title: 'Tokyo', country: 'Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80' }
    ];

    let storedDests = JSON.parse(localStorage.getItem('voyara_destinations'));
    if (!storedDests || storedDests.length === 0) {
      localStorage.setItem('voyara_destinations', JSON.stringify(defaultDests));
      storedDests = defaultDests;
    }
    return storedDests;
  }

  if (endpoint.startsWith('/packages/')) {
    const id = endpoint.split('/packages/')[1];
    return getMockFallback('/packages').find(p => p.id === id) || getMockFallback('/packages')[0];
  }

  // ── CANCEL BOOKING ───────────────────────────────────────────────────────
  if (endpoint.endsWith('/cancel') && endpoint.includes('/bookings/')) {
    const id = endpoint.split('/bookings/')[1].split('/')[0];
    const allBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const index = allBookings.findIndex(b => b.id === id || b._id === id);

    if (index !== -1) {
      allBookings[index].status = 'Cancelled';
      localStorage.setItem('mock_bookings', JSON.stringify(allBookings));
      return { message: 'Booking cancelled', booking: allBookings[index] };
    }
    throw new Error('Booking not found');
  }

  // ── MY TRIPS ─────────────────────────────────────────────────────────────
  if (endpoint === '/bookings/my-trips') {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const allBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const myBookings = allBookings.filter(b => b.userId === user.id);
    
    // Always include demo data for Priya to maintain history
    if (user.email === 'priya@email.com') {
      const demoTrips = [
        { id: 'VYR-2025-01', checkIn: '2025-10-15', checkOut: '2025-10-21', amount: 248000, status: 'Confirmed', guests: { adults: 2 }, package: { title: 'Santorini Sunset', location: 'Greece', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&q=80' } },
        { id: 'VYR-2025-02', checkIn: '2025-04-03', checkOut: '2025-04-08', amount: 136000, status: 'Completed', guests: { adults: 2 }, package: { title: 'Bali Temple & Trek', location: 'Indonesia', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80' } }
      ];
      // Avoid duplicating demo trips if they were somehow added to mock_bookings
      const uniqueMyBookings = myBookings.filter(b => !b.id.startsWith('VYR-2025'));
      return [...demoTrips, ...uniqueMyBookings];
    }
    return myBookings;
  }

  // ── CREATE BOOKING ───────────────────────────────────────────────────────
  if (endpoint === '/bookings') {
    const user    = JSON.parse(localStorage.getItem('user') || '{}');
    const body    = JSON.parse((options && options.body) || '{}');
    const pkgs    = getMockFallback('/packages');
    const pkg     = pkgs.find(p => p.id === body.packageId) || { title: 'Custom Package', location: 'Various', image: '' };
    const booking = {
      id:       'VYR-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000),
      userId:   user.id || 'guest',
      packageId: body.packageId,
      checkIn:   body.checkIn,
      checkOut:  body.checkOut,
      guests:    body.guests,
      amount:    body.amount,
      specialRequests: body.specialRequests || '',
      status:   'Confirmed',
      createdAt: new Date().toISOString(),
      package: { title: pkg.title, location: pkg.location, image: pkg.image }
    };
    const allBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    allBookings.push(booking);
    localStorage.setItem('mock_bookings', JSON.stringify(allBookings));
    return { message: 'Booking confirmed', booking };
  }

  // ── BLOGS ────────────────────────────────────────────────────────────────
  if (endpoint === '/blogs') {
    const defaultBlogs = [
      { id: 'b1', title: 'Santorini Guide', category: 'guides', destination: 'Greece', excerpt: 'Complete guide to Santorini.', author: 'Anika Verma', authorInitials: 'AV', date: 'June 12, 2025', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' }
    ];
    let storedBlogs = JSON.parse(localStorage.getItem('user_blogs') || '[]');
    return [...defaultBlogs, ...storedBlogs].map(b => ({ ...b, createdAt: b.date || b.createdAt }));
  }

  // ── REVIEWS ─────────────────────────────────────────────────────────────
  if (endpoint.startsWith('/reviews/package/')) {
    return [
      { userName: 'Happy Traveller', rating: 5, createdAt: new Date().toISOString(), text: 'An absolutely amazing experience! Highly recommend.' }
    ];
  }

  // ── ADMIN: USERS ─────────────────────────────────────────────────────────
  if (endpoint === '/admin/users') {
    return JSON.parse(localStorage.getItem('mock_users') || '[]');
  }

  // ── ADMIN: PACKAGES ──────────────────────────────────────────────────────
  if (endpoint === '/admin/packages') {
    return getMockFallback('/packages');
  }

  // ── ADMIN: DESTINATIONS ──────────────────────────────────────────────────
  if (endpoint === '/admin/destinations') {
    return getMockFallback('/destinations');
  }

  // ── ADMIN DASHBOARD ──────────────────────────────────────────────────────
  if (endpoint === '/admin/dashboard') {
    const allBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const storedUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const storedPkgs  = JSON.parse(localStorage.getItem('voyara_packages') || '[]');
    const storedDests = JSON.parse(localStorage.getItem('voyara_destinations') || '[]');

    return {
      stats: {
        revenue:       allBookings.reduce((s, b) => s + (b.amount || 0), 0) || 4820000,
        totalBookings: allBookings.length || 1284,
        totalUsers:    storedUsers.length + 2 + 1204, // scaling for UI
        activePackages: storedPkgs.length || 6,
        totalDestinations: storedDests.length || 4
      },
      recentBookings: allBookings.slice(-5).reverse().length ? allBookings.slice(-5).reverse() : [
        { id: 'VYR-28441', userId: 'Priya S.', packageId: 'Santorini', amount: 248000, status: 'Confirmed' },
        { id: 'VYR-28440', userId: 'Arun M.',  packageId: 'Bali Trek',  amount: 136000, status: 'Confirmed' }
      ]
    };
  }

  return [];
}

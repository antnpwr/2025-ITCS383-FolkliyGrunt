// Base API configuration
const API_URL = '/api';

// Setup common auth headers if token exists
const getAuthHeaders = () => {
    const token = localStorage.getItem('supabase_token');
    return token ? {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    } : {
        'Content-Type': 'application/json'
    };
};

/* --- Login Page Logic --- */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorDiv = document.getElementById('login-error');
        errorDiv.style.display = 'none';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save session to localStorage
            localStorage.setItem('supabase_token', data.session.access_token);
            
            // Redirect to dashboard (or wherever next)
            alert('Login successful!');
            globalThis.location.href = '/'; // Change destination as needed
            
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        }
    });
}

/* --- Registration Page Logic --- */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorDiv = document.getElementById('register-error');
        const successDiv = document.getElementById('register-success');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('fullName').value;
        const address = document.getElementById('address').value;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: fullName, address })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            successDiv.textContent = 'Registration successful! You can now login.';
            successDiv.style.display = 'block';
            registerForm.reset();
            
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        }
    });
}
/* --- Dashboard / Global Logic --- */
const updateAuthUI = (profile) => {
    const welcomeSection = document.getElementById('welcome-section');
    const guestSection = document.getElementById('guest-section');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const logoutBtn = document.getElementById('logoutBtn');
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');

    if (profile) {
        if (welcomeSection) welcomeSection.style.display = 'block';
        if (guestSection) guestSection.style.display = 'none';
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (nameEl) nameEl.textContent = profile.full_name;
        if (emailEl) emailEl.textContent = profile.email;
    } else {
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (guestSection) guestSection.style.display = 'block';
        if (navLogin) navLogin.style.display = 'block';
        if (navRegister) navRegister.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
};

const handleAutoRedirect = () => {
    const path = globalThis.location.pathname;
    if (path.includes('login.html') || path.includes('register.html')) {
        globalThis.location.href = '/';
    }
};

const fetchAndSyncProfile = async () => {
    const token = localStorage.getItem('supabase_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            updateAuthUI(data.profile);
            handleAutoRedirect();
        } else {
            localStorage.removeItem('supabase_token');
            updateAuthUI(null);
        }
    } catch (err) {
        console.error('Failed to fetch profile:', err);
    }
};


const fetchAndRenderCourts = async () => {
    const courtsGrid = document.getElementById('courts-grid');
    if (!courtsGrid) return; // Only process if we are on a page with a courts grid

    try {
        const response = await fetch(`${API_URL}/courts`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to load courts');
        
        const courtsArray = Array.isArray(data) ? data : (data.courts || []);
        if (courtsArray.length === 0) {
            courtsGrid.innerHTML = '<div class="col-span-full p-8 text-center text-slate-500">No courts available at the moment.</div>';
            return;
        }

        courtsGrid.innerHTML = courtsArray.map(court => `
<!-- Court Card dynamically rendered -->
<div class="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-2xl transition-all duration-300">
<div class="relative aspect-video overflow-hidden">
<img alt="${court.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${court.image_url || 'https://via.placeholder.com/400x200?text=Court+Image'}"/>
<div class="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-1 rounded text-xs font-bold ${court.current_status === 'AVAILABLE' ? 'text-green-600' : 'text-red-600'}">
    ${court.current_status || 'UNKNOWN'}
</div>
</div>
<div class="p-5 flex flex-col gap-4">
<div class="flex justify-between items-start">
<div>
<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">${court.name}</h3>
<div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mt-1">
<span class="material-symbols-outlined text-sm">location_on</span>
    ${court.address || 'Unknown Location'}
</div>
</div>
<div class="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">
<span class="material-symbols-outlined text-xs">star</span> ${Number(court.average_rating || 0).toFixed(1)}
</div>
</div>
<div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
<div class="flex flex-col">
<span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Price</span>
<span class="text-lg font-bold text-slate-900 dark:text-slate-100">$${ court.price_per_hour }<span class="text-xs font-normal text-slate-500">/hr</span></span>
</div>
<button onclick="globalThis.location.href='/pages/court.html?id=${court.id}'" class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors">
    View Details
</button>
</div>
</div>
</div>
        `).join('');
        
        // Initialize Global Map
        initGlobalMap(courtsArray);

    } catch (err) {
        console.error('Failed to render courts:', err);
        courtsGrid.innerHTML = `<div class="col-span-1 border border-red-200 p-4 rounded text-red-500">Error loading courts: ${err.message}.</div>`;
    }
};

const initGlobalMap = (courts) => {
    const mapContainer = document.getElementById('global-map');
    if (!mapContainer || typeof L === 'undefined') return;

    // Center of Bangkok
    const bangkokCenter = [13.7563, 100.5018];
    const map = L.map('global-map').setView(bangkokCenter, 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    courts.forEach(court => {
        if (court.location_lat && court.location_lng) {
            const marker = L.marker([court.location_lat, court.location_lng]).addTo(map);
            marker.bindPopup(`
                <div class="p-2 min-w-[150px]">
                    <h3 class="font-bold border-b pb-1 mb-1 text-slate-900">${court.name}</h3>
                    <p class="text-xs text-slate-600 mb-2">${court.address || ''}</p>
                    <div class="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span class="text-xs font-bold text-primary">$${Number(court.price_per_hour).toFixed(2)}/hr</span>
                        <a href="/pages/court.html?id=${court.id}" class="text-xs text-white bg-primary px-2 py-1 rounded hover:opacity-90 transition-opacity">Details</a>
                    </div>
                </div>
            `);
        }
    });
};

/* --- Court Detail Page Logic --- */
const fetchAndRenderCourtDetail = async () => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const courtId = urlParams.get('id');
    if (!courtId) return;

    const nameEl = document.getElementById('court-name');
    if (!nameEl) return;

    try {
        const response = await fetch(`${API_URL}/courts/${courtId}`);
        const court = await response.json();

        if (!response.ok) throw new Error(court.error || 'Failed to load court details');

        // Populate elements
        document.getElementById('court-name').textContent = court.name;
        document.getElementById('court-address').textContent = court.address || 'Location details not available';
        document.getElementById('court-rating').textContent = Number(court.average_rating || 4.5).toFixed(1);
        document.getElementById('court-reviews').textContent = '120 reviews';
        document.getElementById('court-image').src = court.image_url || 'https://via.placeholder.com/800x400?text=No+Image';
        document.getElementById('court-image').alt = court.name;
        document.getElementById('court-price').textContent = `$${Number(court.price_per_hour || 0).toFixed(2)}`;
        document.getElementById('court-hours').textContent = `Open: ${court.opening_time} · Closes: ${court.closing_time}`;

        // Initialize Map
        if (court.location_lat && court.location_lng && typeof L !== 'undefined') {
            const map = L.map('court-map').setView([court.location_lat, court.location_lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            L.marker([court.location_lat, court.location_lng]).addTo(map)
                .bindPopup(court.name)
                .openPopup();
            
            const directionsBtn = document.getElementById('get-directions-btn');
            if (directionsBtn) {
                directionsBtn.onclick = () => {
                    globalThis.open(`https://www.google.com/maps/dir/?api=1&destination=${court.location_lat},${court.location_lng}`, '_blank');
                };
            }
        }
    } catch (err) {
        console.error('Error loading court detail:', err);
        const container = document.querySelector('.px-6.-mt-6');
        if (container) {
            container.innerHTML = `<div class="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">Error loading court details: ${err.message}</div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndSyncProfile();
    await fetchAndRenderCourts();
    await fetchAndRenderCourtDetail();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('supabase_token');
            alert('Logged out successfully');
            globalThis.location.href = '/pages/login.html';
        });
    }
});

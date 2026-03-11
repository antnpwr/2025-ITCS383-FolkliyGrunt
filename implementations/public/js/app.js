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
    if (profile) {
        setAuthStateUI(true, profile);
    } else {
        setAuthStateUI(false);
    }
};

const setAuthStateUI = (isAuthenticated, profile = null) => {
    const welcomeSection = document.getElementById('welcome-section');
    const guestSection = document.getElementById('guest-section');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const logoutBtn = document.getElementById('logoutBtn');
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');

    const displayWelcome = isAuthenticated ? 'block' : 'none';
    const displayGuest = isAuthenticated ? 'none' : 'block';

    if (welcomeSection) welcomeSection.style.display = displayWelcome;
    if (guestSection) guestSection.style.display = displayGuest;
    if (navLogin) navLogin.style.display = displayGuest;
    if (navRegister) navRegister.style.display = displayGuest;
    if (logoutBtn) logoutBtn.style.display = displayWelcome;

    if (isAuthenticated && profile) {
        if (nameEl) nameEl.textContent = profile.full_name;
        if (emailEl) emailEl.textContent = profile.email;
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
            globalThis.currentUserProfile = data.profile; // Store globally
            updateAuthUI(data.profile);
            handleAutoRedirect();
        } else {
            localStorage.removeItem('supabase_token');
            globalThis.currentUserProfile = null;
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
        document.getElementById('court-address').textContent = court.address || 'Sukhumvit 49/9 Alley, Bangkok'; // Fallback for screenshot consistency
        
        const rating = Number(court.avg_rating || court.average_rating || 4.5);
        const reviewCount = court.review_count || 120;
        document.getElementById('court-rating').textContent = rating.toFixed(1);
        document.getElementById('court-reviews').textContent = `${reviewCount} reviews`;
        
        document.getElementById('court-image').src = court.image_url || 'https://lh3.googleusercontent.com/p/AF1QipN9f6-0G6TIn9h_T-n-T7A-z0_n-y8wN_Z6S9h_=s1360-w1360-h160';
        document.getElementById('court-image').alt = court.name;
        
        const price = Number(court.price_per_hour || 350);
        document.getElementById('court-price').textContent = `฿${price.toFixed(0)}`;
        
        // Format time to remove seconds if present (HH:mm:ss -> HH:mm)
        const formatTime = (timeStr) => {
            if (!timeStr) return '--:--';
            return timeStr.split(':').slice(0, 2).join(':');
        };
        const openTime = formatTime(court.opening_time);
        const closeTime = formatTime(court.closing_time);
        document.getElementById('court-hours').textContent = `Open: ${openTime} - Close: ${closeTime}`;



        // Equipment Rental Logic
        let rackets = 2;
        let shuttlecocks = 0;
        const RACKET_PRICE = 50;
        const SHUTTLE_PRICE = 20;

        const updateEquipmentUI = () => {
            document.getElementById('qty-racket').textContent = rackets;
            document.getElementById('qty-shuttle').textContent = shuttlecocks;
            
            const totalEquipmentPrice = (rackets * RACKET_PRICE) + (shuttlecocks * SHUTTLE_PRICE);
            const totalPrice = price + totalEquipmentPrice;
            document.getElementById('court-price').textContent = `฿${totalPrice.toFixed(0)}`;
        };

        document.getElementById('plus-racket')?.addEventListener('click', () => { rackets++; updateEquipmentUI(); });
        document.getElementById('minus-racket')?.addEventListener('click', () => { if (rackets > 0) { rackets--; updateEquipmentUI(); } });
        document.getElementById('plus-shuttle')?.addEventListener('click', () => { shuttlecocks++; updateEquipmentUI(); });
        document.getElementById('minus-shuttle')?.addEventListener('click', () => { if (shuttlecocks > 0) { shuttlecocks--; updateEquipmentUI(); } });

        const dateButtons = document.querySelectorAll('.date-slot');
        let selectedDate = null;
        const initialDate = document.querySelector('.date-slot.bg-primary');
        if (initialDate) selectedDate = initialDate.querySelector('.text-xl').textContent.trim();

        dateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                dateButtons.forEach(b => {
                    b.classList.remove('bg-primary', 'text-white', 'shadow-lg', 'shadow-primary/30');
                    b.classList.add('bg-white', 'dark:bg-slate-800', 'border', 'border-slate-200', 'dark:border-slate-700');
                    const day = b.querySelector('.text-xs');
                    if (day) day.classList.replace('opacity-80', 'text-slate-500');
                });
                btn.classList.remove('bg-white', 'dark:bg-slate-800', 'border', 'border-slate-200', 'dark:border-slate-700');
                btn.classList.add('bg-primary', 'text-white', 'shadow-lg', 'shadow-primary/30');
                const day = btn.querySelector('.text-xs');
                if (day) day.classList.replace('text-slate-500', 'opacity-80');
                selectedDate = btn.querySelector('.text-xl').textContent.trim();
            });
        });

        // Date & Time Logic (Simple selection)
        const timeButtons = document.querySelectorAll('.time-slot');
        let selectedTime = null;
        
        // Pick default if any
        const initialSelected = document.querySelector('.time-slot.border-primary');
        if (initialSelected) selectedTime = initialSelected.querySelector('span').textContent.trim();

        timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Clear selection from all
                timeButtons.forEach(b => {
                    b.classList.remove('border-2', 'border-primary');
                    b.classList.add('border', 'border-slate-200', 'dark:border-slate-800');
                });
                
                // Set selection on clicked
                btn.classList.remove('border', 'border-slate-200', 'dark:border-slate-800');
                btn.classList.add('border-2', 'border-primary');
                
                // Correctly extract time (first span's text)
                selectedTime = btn.querySelector('span').textContent.trim();
            });
        });

        // Confirm & Pay Logic
        const confirmBtn = document.getElementById('confirm-booking-btn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                const token = localStorage.getItem('supabase_token');
                if (!token) {
                    alert('Please login to book a court');
                    globalThis.location.href = '/pages/login.html';
                    return;
                }

                if (!selectedTime || !selectedDate) {
                    alert('Please select a date and time slot first');
                    return;
                }
                
                const bookingData = {
                    court_id: courtId,
                    start_time: `2024-03-${selectedDate}T${selectedTime.includes('AM') ? selectedTime.replace(' AM', ':00').padStart(5, '0') : (Number.parseInt(selectedTime, 10) + 12) + ':00:00'}`, // Simple mock date
                    duration_hours: 1,
                    equipment: [
                        { equipment_type: 'RACKET', quantity: rackets },
                        { equipment_type: 'SHUTTLECOCK', quantity: shuttlecocks }
                    ].filter(e => e.quantity > 0),
                    payment_method: 'CREDIT_CARD'
                };

                try {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'Processing...';
                    
                    const response = await fetch(`${API_URL}/bookings`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(bookingData)
                    });

                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Booking failed');

                    alert('Booking Confirmed! Check your email for details.');
                    globalThis.location.href = '/'; // Go home
                } catch (err) {
                    alert(`Error: ${err.message}`);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirm & Pay';
                }
            };
        }

        // Initialize Map
        if (court.location_lat && court.location_lng && typeof L !== 'undefined') {
            initCourtDetailMap(court);
        }

        // Admin Logic
        if (globalThis.currentUserProfile?.role === 'ADMIN') {
            initAdminPanel(court.id);
        }
        
        const directionsBtn = document.getElementById('get-directions-btn');
        if (directionsBtn) {
            directionsBtn.onclick = () => {
                globalThis.open(`https://www.google.com/maps/dir/?api=1&destination=${court.location_lat},${court.location_lng}`, '_blank');
            };
        }
    } catch (err) {
        console.error('Error loading court detail:', err);
    }
};

const initCourtDetailMap = async (court) => {
    const map = L.map('court-map').setView([court.location_lat, court.location_lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    try {
        const allResponse = await fetch(`${API_URL}/courts`);
        const allCourts = await allResponse.json();
        
        (allCourts.courts || allCourts).forEach(c => {
            const isMain = c.id == court.id;
            const marker = L.marker([c.location_lat, c.location_lng], {
                icon: isMain ? undefined : L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            
            if (isMain) {
                marker.bindPopup(`<strong>${c.name}</strong><br>Current Selection`).openPopup();
            } else {
                marker.bindPopup(`<strong>${c.name}</strong><br><a href="/pages/court.html?id=${c.id}" class="text-primary text-xs font-bold">View this instead</a>`);
            }
        });
    } catch {
        L.marker([court.location_lat, court.location_lng]).addTo(map).bindPopup(court.name).openPopup();
    }
};

const initAdminPanel = (courtId) => {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.classList.remove('hidden');

    const updateStatus = async (status) => {
        try {
            const res = await fetch(`${API_URL}/courts/${courtId}/status`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to update status');
            alert(`Court status updated to ${status}`);
            globalThis.location.reload();
        } catch (err) {
            alert(err.message);
        }
    };

    document.getElementById('status-available')?.addEventListener('click', () => updateStatus('AVAILABLE'));
    document.getElementById('status-maintenance')?.addEventListener('click', () => updateStatus('MAINTENANCE'));
    document.getElementById('status-busy')?.addEventListener('click', () => updateStatus('BUSY'));
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

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
            
            // Fetch profile to verify role
            const profileRes = await fetch(`${API_URL}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${data.session.access_token}` }
            });
            
            let userRole = 'CUSTOMER';
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                userRole = profileData.profile?.role || 'CUSTOMER';
            }

            // Check intended login mode from UI
            const loginModeInput = document.getElementById('loginMode');
            const loginMode = loginModeInput ? loginModeInput.value : 'CUSTOMER';

            if (loginMode === 'ADMIN') {
                if (userRole !== 'ADMIN') {
                    // Unauthorized
                    localStorage.removeItem('supabase_token');
                    throw new Error('Unauthorized: You are not an administrator.');
                }
                alert('Admin Login successful!');
                globalThis.location.href = '/pages/admin.html';
                return;
            }

            // Normal user login
            alert('Login successful!');
            globalThis.location.href = '/';
            
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
        const registerModeInput = document.getElementById('registerMode');
        const role = registerModeInput ? registerModeInput.value : 'CUSTOMER';

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: fullName, address, role })
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


const fetchAndRenderCourts = async (searchQuery = '') => {
    const courtsGrid = document.getElementById('courts-grid');
    if (!courtsGrid) return; // Only process if we are on a page with a courts grid

    try {
        const url = searchQuery 
            ? `${API_URL}/courts/search?name=${encodeURIComponent(searchQuery)}`
            : `${API_URL}/courts`;
        const response = await fetch(url);
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

        // Fetch and Render Reviews
        const reviewsList = document.getElementById('court-reviews-list');
        const countBadge = document.getElementById('court-reviews-count-badge');
        const reviewsText = document.getElementById('court-reviews');
        
        if (reviewsList) {
            try {
                const reviewRes = await fetch(`${API_URL}/reviews/court/${courtId}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    const reviews = data.reviews || [];
                    
                    if (countBadge) countBadge.textContent = reviews.length;
                    if (reviewsText) reviewsText.textContent = `${reviews.length} reviews`;

                    if (reviews.length === 0) {
                        reviewsList.innerHTML = `<div class="text-center py-6 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">No reviews yet. Be the first to review!</div>`;
                    } else {
                        reviewsList.innerHTML = reviews.map(r => {
                            const date = new Date(r.created_at).toLocaleDateString();
                            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                            return `
                                <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                    <div class="flex items-start justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                ${(r.user_name || 'A')[0]}
                                            </div>
                                            <div>
                                                <p class="text-sm font-bold">${r.user_name || 'Anonymous User'}</p>
                                                <p class="text-[10px] text-slate-400">${date}</p>
                                            </div>
                                        </div>
                                        <div class="text-yellow-400 text-sm tracking-widest">${stars}</div>
                                    </div>
                                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">${r.comment_text || ''}</p>
                                </div>
                            `;
                        }).join('');
                    }
                } else {
                    reviewsList.innerHTML = `<div class="text-center py-6 text-red-400">Could not load reviews</div>`;
                }
            } catch (rErr) {
                console.error('Failed to parse reviews API', rErr);
                reviewsList.innerHTML = `<div class="text-center py-6 text-red-400">Failed to load reviews</div>`;
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
    await fetchAndRenderMyReviews();

    const searchBtn = document.getElementById('main-search-btn');
    const searchInput = document.getElementById('main-search-name');
    if (searchBtn && searchInput) {
        const triggerSearch = () => {
            const query = searchInput.value.trim();
            fetchAndRenderCourts(query);
            // Auto scroll to results section
            document.getElementById('courts-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        searchBtn.addEventListener('click', triggerSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerSearch();
        });
    }

    const viewAllBtn = document.getElementById('view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
             if (searchInput) searchInput.value = '';
             fetchAndRenderCourts('');
             document.getElementById('courts-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('supabase_token');
            alert('Logged out successfully');
            globalThis.location.href = '/pages/login.html';
        });
    }
});

// ==========================================
// 8. Reviews System (my-bookings Modal & reviews.html)
// ==========================================
const fetchAndRenderMyReviews = async () => {
    const listWrapper = document.getElementById('my-reviews-list');
    if (!listWrapper) return;
    
    const token = localStorage.getItem('supabase_token');
    if (!token) {
        listWrapper.innerHTML = `<div class="text-center py-6 text-slate-500 bg-white border border-slate-200 rounded-xl">Please login to view your reviews</div>`;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/reviews/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to load your feedback');
        const reviews = await res.json();
        
        if (!reviews || reviews.length === 0) {
            listWrapper.innerHTML = `
                <div class="text-center py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
                    <span class="material-symbols-outlined text-4xl mb-2 opacity-50">rate_review</span>
                    <p>You haven't written any reviews yet.</p>
                    <a href="/pages/my-bookings.html" class="inline-block mt-4 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors">Go to Past Bookings to Review</a>
                </div>
            `;
            return;
        }

        listWrapper.innerHTML = reviews.map(r => {
            const date = new Date(r.created_at).toLocaleDateString();
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            
            // To provide a better UI, we can show the court ID or fetch court name if joined, 
            // but for now we just show the review content cleanly
            return `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-lg text-slate-900 dark:text-slate-100 flex gap-2 items-center">
                                <span class="material-symbols-outlined text-slate-400">sports_tennis</span>
                                Court Feedback
                            </p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${date}</p>
                        </div>
                        <div class="text-yellow-400 text-lg tracking-widest">${stars}</div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p class="text-sm text-slate-700 dark:text-slate-300 italic">"${r.comment_text}"</p>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error(err);
        listWrapper.innerHTML = `<div class="text-center py-6 text-red-500 bg-red-50 rounded-xl border border-red-200">Could not load your reviews: ${err.message}</div>`;
    }
};

window.openReviewModal = function(courtId) {
    const modal = document.getElementById('review-modal');
    const courtIdInput = document.getElementById('review-court-id');
    if (modal && courtIdInput) {
        courtIdInput.value = courtId;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeReviewModal = function() {
    const modal = document.getElementById('review-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('review-form')?.reset();
    }
};

window.submitReview = async function(e) {
    e.preventDefault();
    const courtId = document.getElementById('review-court-id').value;
    const rating = parseInt(document.getElementById('review-rating').value);
    const commentText = document.getElementById('review-comment').value;

    const token = localStorage.getItem('supabase_token');
    if (!token) {
        alert('Please login to submit a review');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                court_id: courtId,
                rating: rating,
                comment_text: commentText
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to submit review');
        }

        alert('Review submitted successfully! Thank you for your feedback.');
        closeReviewModal();
    } catch (err) {
        alert(err.message);
    }
};

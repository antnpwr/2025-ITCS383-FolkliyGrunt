const API_URL = '/api';
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=200&auto=format&fit=crop';

const getAuthHeaders = () => {
    const token = localStorage.getItem('supabase_token');
    if (!token) {
        alert('Not authenticated. Redirecting to login.');
        globalThis.location.href = '/pages/login.html';
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

/* --- Toast Notification --- */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

/* --- Image Preview --- */
function previewImage(url, previewId) {
    const img = document.getElementById(previewId);
    if (url && url.startsWith('http')) {
        img.src = url;
        img.style.display = 'block';
        img.onerror = () => { img.style.display = 'none'; };
    } else {
        img.style.display = 'none';
    }
}

/* --- Panel Switching --- */
function switchPanel(panel, btn) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${panel}`).classList.add('active');
    if (panel === 'courts') loadAdminCourts();
    if (panel === 'users') loadAdminUsers();
}

/* --- Leaflet Maps for location picking --- */
let createMap, createMarker;
let editMap, editMarker;

function initCreateMap() {
    if (createMap) return; // already initialized
    createMap = L.map('create-map').setView([13.7563, 100.5018], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap © CARTO'
    }).addTo(createMap);

    createMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('c-lat').value = lat.toFixed(8);
        document.getElementById('c-lng').value = lng.toFixed(8);
        if (createMarker) {
            createMarker.setLatLng(e.latlng);
        } else {
            createMarker = L.marker(e.latlng, { draggable: true }).addTo(createMap);
            createMarker.on('dragend', () => {
                const pos = createMarker.getLatLng();
                document.getElementById('c-lat').value = pos.lat.toFixed(8);
                document.getElementById('c-lng').value = pos.lng.toFixed(8);
            });
        }
    });
}

function initEditMap(lat, lng) {
    // Destroy previous map if exists
    if (editMap) {
        editMap.remove();
        editMap = null;
        editMarker = null;
    }

    // Small delay to ensure modal is visible and map container has dimensions
    setTimeout(() => {
        editMap = L.map('edit-map').setView([lat || 13.7563, lng || 100.5018], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap © CARTO'
        }).addTo(editMap);

        if (lat && lng) {
            editMarker = L.marker([lat, lng], { draggable: true }).addTo(editMap);
            editMarker.on('dragend', () => {
                const pos = editMarker.getLatLng();
                document.getElementById('e-lat').value = pos.lat.toFixed(8);
                document.getElementById('e-lng').value = pos.lng.toFixed(8);
            });
        }

        editMap.on('click', (e) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            document.getElementById('e-lat').value = newLat.toFixed(8);
            document.getElementById('e-lng').value = newLng.toFixed(8);
            if (editMarker) {
                editMarker.setLatLng(e.latlng);
            } else {
                editMarker = L.marker(e.latlng, { draggable: true }).addTo(editMap);
                editMarker.on('dragend', () => {
                    const pos = editMarker.getLatLng();
                    document.getElementById('e-lat').value = pos.lat.toFixed(8);
                    document.getElementById('e-lng').value = pos.lng.toFixed(8);
                });
            }
        });

        editMap.invalidateSize();
    }, 200);
}

/* --- DOMContentLoaded --- */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem('supabase_token');
        globalThis.location.href = '/pages/login.html';
    });

    // Initialize create map
    initCreateMap();

    // Initial load
    loadAdminCourts();
});

/* --- Courts Management --- */
async function loadAdminCourts() {
    const tbody = document.getElementById('admin-courts-tbody');
    try {
        const res = await fetch(`${API_URL}/courts/search`);
        const courts = await res.json();
        if (!res.ok) throw new Error(courts.error);

        tbody.innerHTML = courts.map(c => {
            const imgSrc = c.image_url || PLACEHOLDER_IMG;
            const statusColor = c.current_status === 'AVAILABLE' ? 'color:#22c55e' : 'color:#ef4444';
            return `
            <tr>
                <td><img src="${imgSrc}" class="court-thumb" alt="${c.name}" onerror="this.src='${PLACEHOLDER_IMG}'"></td>
                <td style="font-weight:600">${c.name}</td>
                <td style="font-weight:600;color:var(--ad-primary)">฿${c.price_per_hour}</td>
                <td>${c.opening_time?.substring(0, 5)} - ${c.closing_time?.substring(0, 5)}</td>
                <td>
                    <select onchange="updateCourtStatus('${c.id}', this.value)" class="status-select" style="${statusColor}">
                        <option value="AVAILABLE" ${c.current_status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
                        <option value="RENOVATE" ${c.current_status === 'RENOVATE' ? 'selected' : ''}>RENOVATE</option>
                        <option value="DAMAGED" ${c.current_status === 'DAMAGED' ? 'selected' : ''}>DAMAGED</option>
                    </select>
                </td>
                <td>
                    <button class="btn-icon" onclick="openEditModal('${c.id}')" title="Edit court">
                        <span class="material-symbols-outlined" style="font-size:1.1rem">edit</span>
                    </button>
                </td>
            </tr>
        `}).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ad-danger);padding:2rem">Error loading courts: ${err.message}</td></tr>`;
    }
}

async function updateCourtStatus(courtId, newStatus) {
    try {
        const res = await fetch(`${API_URL}/courts/${courtId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error('Update failed');
        showToast('Court status updated!');
        loadAdminCourts();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

/* --- Create Court --- */
document.getElementById('addCourtForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('c-name').value,
        location_lat: Number.parseFloat(document.getElementById('c-lat').value),
        location_lng: Number.parseFloat(document.getElementById('c-lng').value),
        price_per_hour: Number.parseFloat(document.getElementById('c-price').value),
        allowed_shoes: document.getElementById('c-shoes').value,
        opening_time: document.getElementById('c-open').value,
        closing_time: document.getElementById('c-close').value,
        image_url: document.getElementById('c-image').value || null
    };

    try {
        const res = await fetch(`${API_URL}/courts`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errDecoded = await res.json();
            throw new Error(errDecoded.error || 'Registration failed');
        }
        showToast('Court registered successfully!');
        document.getElementById('addCourtForm').reset();
        document.getElementById('c-img-preview').style.display = 'none';
        if (createMarker) { createMap.removeLayer(createMarker); createMarker = null; }
        loadAdminCourts();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

/* --- Edit Court Modal --- */
let allCourts = [];

async function openEditModal(courtId) {
    try {
        const res = await fetch(`${API_URL}/courts/${courtId}`);
        const court = await res.json();
        if (!res.ok) throw new Error('Court not found');

        document.getElementById('e-id').value = court.id;
        document.getElementById('e-name').value = court.name;
        document.getElementById('e-price').value = court.price_per_hour;
        document.getElementById('e-open').value = court.opening_time?.substring(0, 5);
        document.getElementById('e-close').value = court.closing_time?.substring(0, 5);
        document.getElementById('e-shoes').value = court.allowed_shoes || 'Non-marking';
        document.getElementById('e-image').value = court.image_url || '';
        document.getElementById('e-lat').value = court.location_lat;
        document.getElementById('e-lng').value = court.location_lng;

        // Preview image
        previewImage(court.image_url, 'e-img-preview');

        // Show modal
        document.getElementById('editModal').classList.add('show');

        // Init map with court location
        initEditMap(court.location_lat, court.location_lng);
    } catch (err) {
        showToast('Error loading court: ' + err.message, 'error');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    if (editMap) { editMap.remove(); editMap = null; editMarker = null; }
}

document.getElementById('editCourtForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const courtId = document.getElementById('e-id').value;
    const payload = {
        name: document.getElementById('e-name').value,
        location_lat: Number.parseFloat(document.getElementById('e-lat').value),
        location_lng: Number.parseFloat(document.getElementById('e-lng').value),
        price_per_hour: Number.parseFloat(document.getElementById('e-price').value),
        allowed_shoes: document.getElementById('e-shoes').value,
        opening_time: document.getElementById('e-open').value,
        closing_time: document.getElementById('e-close').value,
        image_url: document.getElementById('e-image').value || null
    };

    try {
        const res = await fetch(`${API_URL}/courts/${courtId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Update failed');
        showToast('Court updated successfully!');
        closeEditModal();
        loadAdminCourts();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

/* --- Users Management --- */
async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
        const res = await fetch(`${API_URL}/auth/users`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const users = data.users || [];
        tbody.innerHTML = users.map(u => {
            const joinDate = new Date(u.created_at).toLocaleDateString();
            const isBlocked = u.is_disabled;
            const roleBadge = u.role === 'ADMIN'
                ? '<span class="badge badge-admin">ADMIN</span>'
                : '<span class="badge badge-customer">CUSTOMER</span>';
            const statusBadge = isBlocked
                ? '<span class="badge badge-blocked">Blocked</span>'
                : '<span class="badge badge-active">Active</span>';
            const action = (!isBlocked && u.role !== 'ADMIN')
                ? `<button class="btn-block" onclick="blockUser('${u.auth_id}')">Block</button>`
                : '<span style="color:var(--ad-muted);font-size:0.78rem;font-style:italic">—</span>';
            return `
            <tr>
                <td style="font-weight:600">${u.full_name}</td>
                <td style="font-size:0.82rem;color:var(--ad-muted)">${u.email || '—'}</td>
                <td>${roleBadge}</td>
                <td style="color:var(--ad-muted)">${joinDate}</td>
                <td>${statusBadge}</td>
                <td>${action}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ad-danger);padding:2rem">Error: ${err.message}</td></tr>`;
    }
}

async function blockUser(userId) {
    if (!confirm('Are you sure you want to block this user?')) return;
    try {
        const res = await fetch(`${API_URL}/auth/users/${userId}/disable`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to block user');
        showToast('User blocked successfully.');
        loadAdminUsers();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

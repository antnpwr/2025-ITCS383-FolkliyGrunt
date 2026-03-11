const API_URL = '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('supabase_token');
    if (!token) {
        alert('Not authenticated. Redirecting to login.');
        window.location.href = '/pages/login.html';
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

/* --- Navigation between Panels --- */
document.addEventListener('DOMContentLoaded', () => {
    const tabCourts = document.getElementById('tab-courts');
    const tabUsers = document.getElementById('tab-users');
    const panelCourts = document.getElementById('panel-courts');
    const panelUsers = document.getElementById('panel-users');

    const switchTab = (activeTab, activePanel, inactiveTab, inactivePanel) => {
        activeTab.className = "w-full text-left flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-lg font-bold shadow-md transition-colors";
        inactiveTab.className = "w-full text-left flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition-colors";
        activePanel.style.display = "block";
        inactivePanel.style.display = "none";
    };

    tabCourts.addEventListener('click', () => {
        switchTab(tabCourts, panelCourts, tabUsers, panelUsers);
        loadAdminCourts();
    });

    tabUsers.addEventListener('click', () => {
        switchTab(tabUsers, panelUsers, tabCourts, panelCourts);
        loadAdminUsers();
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem('supabase_token');
        window.location.href = '/pages/login.html';
    });

    // Initial load
    loadAdminCourts();
});

/* --- Courts Management --- */
async function loadAdminCourts() {
    const tbody = document.getElementById('admin-courts-tbody');
    try {
        const res = await fetch(`${API_URL}/courts`);
        const courts = await res.json();
        
        if (!res.ok) throw new Error(courts.error);

        tbody.innerHTML = courts.map(c => `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-4 font-bold">${c.name}</td>
                <td class="px-4 py-4 font-semibold text-primary">$${c.price_per_hour}</td>
                <td class="px-4 py-4">${c.opening_time} - ${c.closing_time}</td>
                <td class="px-4 py-4">
                    <select onchange="updateCourtStatus('${c.id}', this.value)" class="text-xs font-bold rounded border-slate-300 py-1 pl-2 pr-6 appearance-none focus:ring-primary focus:border-primary ${c.current_status === 'AVAILABLE' ? 'text-green-600' : 'text-red-500'}">
                        <option value="AVAILABLE" ${c.current_status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
                        <option value="RENOVATE" ${c.current_status === 'RENOVATE' ? 'selected' : ''}>RENOVATE</option>
                        <option value="DAMAGED" ${c.current_status === 'DAMAGED' ? 'selected' : ''}>DAMAGED</option>
                    </select>
                </td>
                <td class="px-4 py-4">
                    <button class="text-slate-400 hover:text-slate-600" onclick="alert('Edit feature coming soon!')">
                        <span class="material-symbols-outlined text-base">edit</span>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-red-500 py-4 px-4">Error loading courts: ${err.message}</td></tr>`;
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
        alert('Court status updated successfully!');
        loadAdminCourts();
    } catch (err) {
        alert('Error updating status: ' + err.message);
    }
}

document.getElementById('addCourtForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('c-name').value,
        location_lat: parseFloat(document.getElementById('c-lat').value),
        location_lng: parseFloat(document.getElementById('c-lng').value),
        price_per_hour: parseFloat(document.getElementById('c-price').value),
        allowed_shoes: document.getElementById('c-shoes').value,
        opening_time: document.getElementById('c-open').value,
        closing_time: document.getElementById('c-close').value
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
        alert('Court successfully registered!');
        document.getElementById('addCourtForm').reset();
        loadAdminCourts();
    } catch (err) {
        alert('Error adding court: ' + err.message);
    }
});


/* --- Users Management --- */
async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
        const res = await fetch(`${API_URL}/auth/users`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);

        const users = data.users || [];
        
        tbody.innerHTML = users.map(u => {
            const joinDate = new Date(u.created_at).toLocaleDateString();
            const isBlocked = u.is_disabled;
            return `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-4 font-bold text-slate-800">${u.full_name}</td>
                <td class="px-4 py-4"><span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">${u.role}</span></td>
                <td class="px-4 py-4 text-slate-500">${joinDate}</td>
                <td class="px-4 py-4">
                    ${isBlocked 
                        ? '<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">Blocked</span>'
                        : '<span class="bg-green-100 text-green-600 px-2 py-0.5 rounded text-xs font-bold">Active</span>'
                    }
                </td>
                <td class="px-4 py-4">
                    ${!isBlocked && u.role !== 'ADMIN' ? 
                        `<button onclick="blockUser('${u.auth_id}')" class="text-xs font-bold bg-white border border-red-500 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded transition-colors">
                            Block User
                        </button>` 
                        : '<span class="text-xs text-slate-400 italic">No Action</span>'
                    }
                </td>
            </tr>
        `}).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-red-500 py-4 px-4">Error loading users: ${err.message}</td></tr>`;
    }
}

async function blockUser(userId) {
    if (!confirm('Are you sure you want to block this user? They will not be able to log in anymore.')) return;
    
    try {
        const res = await fetch(`${API_URL}/auth/users/${userId}/disable`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to block user');
        alert('User has been blocked successfully.');
        loadAdminUsers();
    } catch (err) {
        alert('Error blocking user: ' + err.message);
    }
}

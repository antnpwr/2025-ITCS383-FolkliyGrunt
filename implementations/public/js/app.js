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
            window.location.href = '/'; // Change destination as needed
            
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
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('supabase_token');
    const welcomeSection = document.getElementById('welcome-section');
    const guestSection = document.getElementById('guest-section');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const logoutBtn = document.getElementById('logoutBtn');

    if (token) {
        try {
            const response = await fetch(`${API_URL}/auth/profile`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update UI for logged-in user
                if (welcomeSection) welcomeSection.style.display = 'block';
                if (guestSection) guestSection.style.display = 'none';
                if (navLogin) navLogin.style.display = 'none';
                if (navRegister) navRegister.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'block';

                const nameEl = document.getElementById('user-name');
                const emailEl = document.getElementById('user-email');
                if (nameEl) nameEl.textContent = data.profile.full_name;
                if (emailEl) emailEl.textContent = data.profile.email;

                // Auto-redirect if on login or register page
                const path = window.location.pathname;
                if (path.includes('login.html') || path.includes('register.html')) {
                    window.location.href = '/';
                }
            } else {
                // Token might be expired
                localStorage.removeItem('supabase_token');
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('supabase_token');
            alert('Logged out successfully');
            window.location.href = '/pages/login.html';
        });
    }
});

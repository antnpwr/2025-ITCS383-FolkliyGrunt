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
                body: JSON.stringify({ email, password, fullName, address })
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

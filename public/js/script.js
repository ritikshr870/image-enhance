document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = localStorage.getItem('csrfToken');
  if (!csrfToken && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }

  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (response.ok) {
          localStorage.setItem('csrfToken', result.csrfToken);
          localStorage.setItem('username', username);
          window.location.href = 'index.html';
        } else {
          alert(result.error || 'Login failed');
        }
      } catch (err) {
        alert('Login error: ' + err.message);
      }
    });
  }

  // Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUsername').value;
      const password = document.getElementById('regPassword').value;
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (response.ok) {
          localStorage.setItem('csrfToken', result.csrfToken);
          localStorage.setItem('username', username);
          window.location.href = 'index.html';
        } else {
          alert(result.error || 'Registration failed');
        }
      } catch (err) {
        alert('Registration error: ' + err.message);
      }
    });
  }

  // Profile Form
  const updateProfileForm = document.getElementById('updateProfileForm');
  if (updateProfileForm) {
    const usernameDisplay = document.getElementById('usernameDisplay');
    usernameDisplay.textContent = `Username: ${localStorage.getItem('username') || 'Unknown'}`;
    updateProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newUsername = document.getElementById('newUsername').value;
      const newPassword = document.getElementById('newPassword').value;
      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ username: newUsername, password: newPassword }),
        });
        const result = await response.json();
        if (response.ok) {
          if (newUsername) localStorage.setItem('username', newUsername);
          usernameDisplay.textContent = `Username: ${localStorage.getItem('username')}`;
          alert('Profile updated successfully');
        } else {
          alert(result.error || 'Update failed');
        }
      } catch (err) {
        alert('Profile update error: ' + err.message);
      }
    });
  }

  // Logout
  document.getElementById('logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Login/Register Switch
  document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginCard').classList.add('d-none');
    document.getElementById('registerCard').classList.remove('d-none');
  });
  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerCard').classList.add('d-none');
    document.getElementById('loginCard').classList.remove('d-none');
  });

  // Enhancement Buttons
  document.querySelectorAll('.enhance-btn').forEach(btn => {
    btn.addEventListener('click', () => enhanceImage(btn.dataset.type));
  });

  // Download and Save Buttons
  document.getElementById('downloadBtn')?.addEventListener('click', downloadImage);
  document.getElementById('saveBtn')?.addEventListener('click', saveToHistory);

  // Clean History
  document.getElementById('cleanHistoryBtn')?.addEventListener('click', clearHistory);

  // Initial History Load and Preview
  loadHistory();
  document.getElementById('imageInput')?.addEventListener('change', previewImage);
});
// ============================================
// Auth Page Logic (Login + Register)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (isAuthenticated()) {
    redirectBasedOnRole();
    return;
  }

  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');
  const btnText = btn.querySelector('.btn-text');

  if (!email || !password) {
    showToast('Please fill in all fields', 'warning');
    return;
  }

  // Show loading
  btnText.textContent = 'Signing in...';
  spinner.classList.remove('d-none');
  btn.disabled = true;

  try {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    saveAuth(data.token, data.user);
    showToast('Login successful!', 'success');

    setTimeout(() => {
      redirectBasedOnRole();
    }, 500);
  } catch (error) {
    showToast(error.message, 'error');
    btnText.textContent = 'Sign In';
    spinner.classList.add('d-none');
    btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  const btn = document.getElementById('registerBtn');
  const spinner = document.getElementById('registerSpinner');
  const btnText = btn.querySelector('.btn-text');

  if (!name || !email || !password) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'warning');
    return;
  }

  // Show loading
  btnText.textContent = 'Creating account...';
  spinner.classList.remove('d-none');
  btn.disabled = true;

  try {
    const data = await apiCall('/auth/register', 'POST', { name, email, password, phone });
    saveAuth(data.token, data.user);
    showToast('Account created successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/student-dashboard';
    }, 500);
  } catch (error) {
    showToast(error.message, 'error');
    btnText.textContent = 'Create Account';
    spinner.classList.add('d-none');
    btn.disabled = false;
  }
}

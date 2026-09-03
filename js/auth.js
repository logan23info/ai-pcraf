// js/auth.js — Authentication: sign in, sign up, sign out, launch app
// Depends on: config.js (sb, currentUser, controls), ui.js (showToast), controls.js (loadControlsFromDB)

var authMode = 'login';

function switchAuth(mode) {
  authMode = mode;
  document.getElementById('tab-login-btn').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup-btn').classList.toggle('active', mode === 'signup');
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'Sign in' : 'Create account';
  document.getElementById('auth-err').textContent = '';
  document.getElementById('auth-msg').textContent = '';
}

async function submitAuth() {
  var email    = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  var errEl    = document.getElementById('auth-err');
  var msgEl    = document.getElementById('auth-msg');
  errEl.textContent = '';
  msgEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Enter email and password'; return; }

  document.getElementById('auth-submit-btn').disabled = true;
  document.getElementById('auth-submit-btn').textContent = 'Please wait...';

  var result;
  if (authMode === 'signup') {
    result = await sb.auth.signUp({ email: email, password: password });
    if (!result.error) {
      msgEl.textContent = 'Account created — check your email to confirm, then sign in.';
      switchAuth('login');
    }
  } else {
    result = await sb.auth.signInWithPassword({ email: email, password: password });
    if (!result.error) {
      currentUser = result.data.user;
      launchApp();
    }
  }

  if (result.error) { errEl.textContent = result.error.message; }
  document.getElementById('auth-submit-btn').disabled = false;
  document.getElementById('auth-submit-btn').textContent = authMode === 'login' ? 'Sign in' : 'Create account';
}

function launchApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('sidebar').style.display     = 'flex';
  document.getElementById('main').style.display        = 'flex';
  document.getElementById('user-email').textContent    = currentUser.email;
  document.getElementById('db-status-pill').textContent = 'Supabase connected';
  document.getElementById('db-status-pill').classList.remove('offline');
  loadControlsFromDB();
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null;
  controls    = [];
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('sidebar').style.display     = 'none';
  document.getElementById('main').style.display        = 'none';
  document.getElementById('auth-email').value    = '';
  document.getElementById('auth-password').value = '';
}

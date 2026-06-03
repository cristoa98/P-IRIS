const form = document.getElementById('login-form');
const alertEl = document.getElementById('login-alert');
const submitBtn = document.getElementById('login-submit');

function showLoginAlert(message, type = 'error') {
    alertEl.textContent = message;
    alertEl.className = `login-alert login-alert-${type}`;
    alertEl.style.display = 'block';
}

async function redirectIfLoggedIn() {
    try {
        const res = await api.get('/auth/me');
        const user = res.data.user;

        if (user.rol === 'admin') {
        window.location.href = '/admin.html';
        } else {
        window.location.href = '/index.html';
        }
    } catch (_) {
        // Sin sesión activa: se mantiene en login.
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    if (!email || !password) {
        showLoginAlert('Ingresa correo y contraseña.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    try {
        const res = await api.post('/auth/login', { email, password, remember });
        const user = res.data.user;

    if (user.rol === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'index.html';
        }
    } catch (error) {
        const msg = error.response?.data?.message || 'No se pudo iniciar sesión.';
        showLoginAlert(msg);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
});

redirectIfLoggedIn();

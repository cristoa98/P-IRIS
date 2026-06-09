const registroForm = document.getElementById('registro-form');
const registroAlert = document.getElementById('registro-alert');
const registroSubmit = document.getElementById('registro-submit');

function showRegistroAlert(message, type = 'error') {
    registroAlert.textContent = message;
    registroAlert.className = `login-alert login-alert-${type}`;
    registroAlert.style.display = 'block';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function redirectIfLoggedIn() {
    try {
        const res = await api.get('/auth/me');
        const user = res.data.user;
        window.location.href = user.rol === 'admin' ? '/admin.html' : '/index.html';
    } catch (_) {
        // Sin sesión activa: se mantiene en registro.
    }
}

registroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registroAlert.style.display = 'none';

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!nombre || !email || !password || !confirmPassword) {
        showRegistroAlert('Todos los campos son obligatorios.');
        return;
    }

    if (!isValidEmail(email)) {
        showRegistroAlert('El correo debe tener un formato válido.');
        return;
    }

    if (password.length < 6) {
        showRegistroAlert('La contraseña debe tener mínimo 6 caracteres.');
        return;
    }

    if (password !== confirmPassword) {
        showRegistroAlert('Las contraseñas no coinciden');
        return;
    }

    registroSubmit.disabled = true;
    registroSubmit.textContent = 'Registrando...';

    try {
        await api.post('/auth/register', { nombre, email, password, confirmPassword });
        window.location.href = '/login.html?registered=1';
    } catch (error) {
        const msg = error.response?.data?.message || 'No se pudo registrar el usuario.';
        showRegistroAlert(msg);
    } finally {
        registroSubmit.disabled = false;
        registroSubmit.textContent = 'Registrarse';
    }
});

redirectIfLoggedIn();

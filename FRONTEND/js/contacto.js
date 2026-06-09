document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const user = data.user;
      if (user) {
        const nombreEl = document.getElementById('contacto-nombre');
        const correoEl = document.getElementById('contacto-correo');
        if (nombreEl && user.nombre) {
          nombreEl.value = user.apellido ? user.nombre + ' ' + user.apellido : user.nombre;
        }
        if (correoEl && user.email) correoEl.value = user.email;
      }
    }
  } catch (_) {}

  const form = document.getElementById('form-contacto');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('contacto-nombre').value;
    const correo = document.getElementById('contacto-correo').value;
    const mensaje = document.getElementById('contacto-mensaje').value;
    const msgEl = document.getElementById('contacto-msg');

    msgEl.textContent = '';
    msgEl.className = 'contacto-msg';
    msgEl.style.display = 'none';

    if (!nombre.trim() || !correo.trim() || !mensaje.trim()) {
      msgEl.textContent = 'Todos los campos son obligatorios.';
      msgEl.className = 'contacto-msg contacto-msg--error';
      msgEl.style.display = 'block';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      msgEl.textContent = 'Ingresa un correo válido.';
      msgEl.className = 'contacto-msg contacto-msg--error';
      msgEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('btn-contacto');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo, mensaje })
      });

      const data = await res.json();

      if (data.ok) {
        form.reset();
        mostrarNotificacion('Mensaje enviado correctamente');
      } else {
        msgEl.textContent = data.message || 'No se pudo enviar el mensaje.';
        msgEl.className = 'contacto-msg contacto-msg--error';
        msgEl.style.display = 'block';
      }
    } catch (_) {
      msgEl.textContent = 'No se pudo enviar el mensaje.';
      msgEl.className = 'contacto-msg contacto-msg--error';
      msgEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar mensaje';
    }
  });
});

async function getCurrentUser() {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  if (!response.ok) return null;
  const data = await response.json();
  return data.user || null;
}

async function logoutUser() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  window.location.href = '/index.html';
}

function authLink(href, text, className = '') {
  return `<a href="${href}" class="${className}">${text}</a>`;
}

function renderAuthNav(user) {
  document.querySelectorAll('[data-auth-nav]').forEach((container) => {
    const current = container.dataset.authCurrent || '';

    if (!user) {
      container.innerHTML = authLink('/login.html', 'Iniciar sesión');
      return;
    }

    const links = [];
    if (user.rol === 'admin' && current !== 'admin') {
      links.unshift(authLink('/admin.html', 'Administración'));
    }
    if (current !== 'historial' && current !== 'contenido') {
      links.push(authLink('/historial.html', 'Historial'));
    }
    links.push('<button type="button" class="nav-logout" data-logout>Cerrar sesión</button>');
    container.innerHTML = links.join('');
  });

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', logoutUser);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  renderAuthNav(user);
});

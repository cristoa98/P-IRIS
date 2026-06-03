const STORAGE_KEY = 'iris_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function formatPrice(amount) {
  return '$' + Math.round(amount).toLocaleString('es-CL');
}

function renderResumen(cart) {
  const lista = document.getElementById('resumen-items');
  const totalEl = document.getElementById('resumen-total');
  const total = cart.reduce((sum, c) => sum + (c.price || 0), 0);

  lista.innerHTML = cart.map(item =>
    `<li><span>${item.title}</span><span>${formatPrice(item.price || 0)}</span></li>`
  ).join('');

  totalEl.textContent = formatPrice(total);
}

function mostrarError(campo, msg) {
  const el = document.getElementById('err-' + campo);
  if (el) el.textContent = msg;
}

function validarCampos(nombre, numero, fv, cvv) {
  let ok = true;

  if (!nombre.trim()) {
    mostrarError('nombre', 'El nombre es obligatorio.');
    ok = false;
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim())) {
    mostrarError('nombre', 'Solo se permiten letras y espacios.');
    ok = false;
  } else {
    mostrarError('nombre', '');
  }

  if (!numero.trim()) {
    mostrarError('numero', 'El número de tarjeta es obligatorio.');
    ok = false;
  } else if (!/^\d{16}$/.test(numero)) {
    mostrarError('numero', 'Debe ser un número entero de 16 dígitos.');
    ok = false;
  } else {
    mostrarError('numero', '');
  }

  if (!fv.trim()) {
    mostrarError('fv', 'La fecha de vencimiento es obligatoria.');
    ok = false;
  } else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(fv)) {
    mostrarError('fv', 'Formato inválido. Use AAAA-MM.');
    ok = false;
  } else {
    mostrarError('fv', '');
  }

  if (!cvv.trim()) {
    mostrarError('cvv', 'El CVV es obligatorio.');
    ok = false;
  } else if (!/^\d{3}$/.test(cvv)) {
    mostrarError('cvv', 'Debe ser un número de 3 dígitos.');
    ok = false;
  } else {
    mostrarError('cvv', '');
  }

  return ok;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
  } catch (_) {
    window.location.href = '/login.html';
    return;
  }

  const cart = getCart();

  // Carrito vacío — redirigir
  if (cart.length === 0) {
    window.location.href = '/index.html';
    return;
  }

  renderResumen(cart);

  document.getElementById('form-pago').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('pago-nombre').value;
    const numero = document.getElementById('pago-numero').value;
    const fv = document.getElementById('pago-fv').value;
    const cvv = document.getElementById('pago-cvv').value;

    if (!validarCampos(nombre, numero, fv, cvv)) return;

    const btn = document.getElementById('btn-pagar');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const msgEl = document.getElementById('pago-mensaje');

    try {
      const res = await fetch('/api/compras', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrito: cart,
          pago: { nombre, numero_tarjeta: numero, fecha_vencimiento: fv, cvv }
        })
      });

      const data = await res.json();

      if (data.ok) {
        msgEl.textContent = data.mensaje;
        msgEl.className = 'pago-mensaje pago-mensaje--exito';
        msgEl.style.display = 'block';
        saveCart([]);
        btn.textContent = 'Compra completada';

        document.getElementById('link-historial').style.display = 'inline-block';
        document.getElementById('link-volver').style.display = 'none';
      } else {
        msgEl.textContent = data.mensaje || 'Pago rechazado';
        msgEl.className = 'pago-mensaje pago-mensaje--error';
        msgEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Pagar';
      }
    } catch (_) {
      msgEl.textContent = 'Pago rechazado';
      msgEl.className = 'pago-mensaje pago-mensaje--error';
      msgEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Pagar';
    }
  });
});

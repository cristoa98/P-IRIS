const STORAGE_KEY = 'iris_cart';
const IVA_RATE = 0.19;

function getCart() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(course) {
  const cart = getCart();
  if (cart.find(c => c.id === course.id)) return false;
  cart.push({ id: course.id, title: course.titulo, price: course.precio });
  saveCart(cart);
  updateBadge();
  renderCart();
  return true;
}

function removeFromCart(id) {
  saveCart(getCart().filter(c => c.id !== id));
  updateBadge();
  renderCart();
}

function calculateTotals(cart) {
  const total = cart.reduce((sum, c) => sum + c.price, 0);
  const taxAmount = Math.round(total * IVA_RATE / (1 + IVA_RATE));
  return { total, taxAmount, net: total - taxAmount };
}

function formatPrice(amount) {
  return '$' + Math.round(amount).toLocaleString('es-CL');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateBadge() {
  const count = getCart().length;
  const badge = document.getElementById('carrito-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function renderCart() {
  const listEl = document.getElementById('carrito-lista');
  const summaryEl = document.getElementById('carrito-resumen');
  const checkoutBtn = document.getElementById('btn-checkout');
  if (!listEl) return;

  const cart = getCart();

  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    listEl.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.</p>';
    summaryEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = cart.map(item => `
    <div class="carrito-item">
      <div class="carrito-item-info">
        <span class="carrito-item-titulo">${escapeHtml(item.title)}</span>
        <span class="carrito-item-precio">${formatPrice(item.price)}</span>
      </div>
      <button class="carrito-item-remove" data-id="${item.id}" title="Eliminar">&times;</button>
    </div>
  `).join('');

  listEl.querySelectorAll('.carrito-item-remove').forEach(btn =>
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)))
  );

  const { total, taxAmount, net } = calculateTotals(cart);
  summaryEl.innerHTML = `
    <div class="carrito-resumen-row">
      <span>Subtotal (neto)</span>
      <span>${formatPrice(net)}</span>
    </div>
    <div class="carrito-resumen-row">
      <span>IVA (19%)</span>
      <span>${formatPrice(taxAmount)}</span>
    </div>
    <div class="carrito-resumen-divider"></div>
    <div class="carrito-resumen-row carrito-total">
      <span>Total</span>
      <span>${formatPrice(total)}</span>
    </div>
    <p class="carrito-iva-nota">* Los valores indicados en el detalle cuentan con valor IVA incluido.</p>
  `;
}

function openCart() {
  document.getElementById('carrito-drawer').classList.add('open');
  document.getElementById('carrito-overlay').style.display = 'block';
  document.body.classList.add('modal-open');
}

function closeCart() {
  document.getElementById('carrito-drawer').classList.remove('open');
  document.getElementById('carrito-overlay').style.display = 'none';
  document.body.classList.remove('modal-open');
}

document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  renderCart();

  document.getElementById('btn-carrito').addEventListener('click', openCart);
  document.getElementById('carrito-close').addEventListener('click', closeCart);
  document.getElementById('carrito-overlay').addEventListener('click', closeCart);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  document.getElementById('modal-agregar').addEventListener('click', () => {
    const btn = document.getElementById('modal-agregar');
    const id = parseInt(btn.dataset.cursoId);
    const price = parseFloat(btn.dataset.cursoPrecio);
    const titulo = btn.dataset.cursoTitulo;
    if (!id) return;

    const added = addToCart({ id, titulo, precio: price });
    if (added) {
      btn.textContent = '✓ En el carrito';
      btn.disabled = true;
    }
  });
});

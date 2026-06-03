document.getElementById('btn-checkout').addEventListener('click', async () => {
  if (getCart().length === 0) return;

  const msgEl = document.getElementById('checkout-auth-msg');

  try {
    await api.get('/auth/me');
    msgEl.style.display = 'none';
    window.location.href = '/pago.html';
  } catch (_) {
    msgEl.style.display = 'flex';
  }
});

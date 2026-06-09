(function () {
  const style = document.createElement('style');
  style.textContent = `
    .notificacion-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #88B04B;
      color: #ffffff;
      padding: 0.875rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(107,91,149,0.2);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transform: translateY(1rem);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none;
    }
    .notificacion-toast--visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
})();

function mostrarNotificacion(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'notificacion-toast';
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('notificacion-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('notificacion-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

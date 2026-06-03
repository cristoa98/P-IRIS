(async () => {
  try {
    const res = await api.get('/auth/me');
    if (res.data.user?.rol !== 'admin') window.location.replace('/index.html');
  } catch (_) {
    window.location.replace('/login.html');
  }
})();

const ITEMS_PER_PAGE = 10;

let cursos = [];
let currentPage = 1;
let pendingAction = null; // { type: 'toggle'|'delete', id }

const tbody = document.getElementById('cursos-tbody');
const paginationEl = document.getElementById('admin-pagination');
const alertEl = document.getElementById('admin-alert');
const busquedaInput = document.getElementById('admin-busqueda');
const categoriaSelect = document.getElementById('admin-categoria');
const estadoSelect = document.getElementById('admin-estado');
const ordenarSelect = document.getElementById('admin-ordenar');

// ── Alerta global ─────────────────────────────────────────────────────────────

function showAlert(msg, tipo = 'success') {
  alertEl.textContent = msg;
  alertEl.className = `admin-alert admin-alert-${tipo}`;
  alertEl.style.display = 'block';
  setTimeout(() => { alertEl.style.display = 'none'; }, 4000);
}

// ── Carga inicial ─────────────────────────────────────────────────────────────

async function loadCategorias() {
  try {
    const res = await api.get('/categorias');
    const formSelect = document.getElementById('form-categoria');
    res.data.forEach(cat => {
      const opt = `<option value="${cat.id}">${cat.nombre}</option>`;
      formSelect.innerHTML += opt;
      categoriaSelect.innerHTML += opt;
    });
  } catch (e) {
    console.error('Error al cargar categorías:', e);
  }
}

async function loadCursos() {
  tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Cargando...</td></tr>';
  try {
    const res = await api.get('/cursos/admin/todos');
    cursos = res.data;
    currentPage = 1;
    renderVista();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Error al cargar los cursos.</td></tr>';
  }
}

// ── Filtrado y ordenamiento ───────────────────────────────────────────────────

function getFiltrados() {
  const q = busquedaInput.value.trim().toLowerCase();
  const catId = categoriaSelect.value;
  const estado = estadoSelect.value;
  const orden = ordenarSelect.value;

  let resultado = cursos.filter(c => {
    if (q && !c.titulo.toLowerCase().includes(q)) return false;
    if (catId && String(c.categoria_id) !== catId) return false;
    if (estado !== '' && String(c.habilitado) !== estado) return false;
    return true;
  });

  if (orden === 'precio_asc') {
    resultado.sort((a, b) => a.precio - b.precio);
  } else if (orden === 'precio_desc') {
    resultado.sort((a, b) => b.precio - a.precio);
  }

  return resultado;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderVista() {
  const filtrados = getFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  if (currentPage > totalPaginas) currentPage = totalPaginas;

  const inicio = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagina = filtrados.slice(inicio, inicio + ITEMS_PER_PAGE);

  renderTabla(pagina, filtrados.length);
  renderPaginacion(totalPaginas);
}

function formatPrecio(precio) {
  return '$' + Number(precio).toLocaleString('es-CL');
}

function renderTabla(pagina, total) {
  const totalEl = document.getElementById('tabla-total');
  if (totalEl) totalEl.textContent = `Total: ${total} ${total === 1 ? 'curso' : 'cursos'}`;

  if (!pagina.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">${
      busquedaInput.value.trim() ? 'Sin resultados para esta búsqueda.' : 'No hay cursos registrados.'
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = pagina.map(c => `
    <tr class="${c.habilitado ? '' : 'row-disabled'}">
      <td class="td-titulo" title="${escapeHtml(c.titulo)}">${escapeHtml(c.titulo)}</td>
      <td>${formatPrecio(c.precio)}</td>
      <td>${escapeHtml(c.categoria || '—')}</td>
      <td>
        <span class="badge-estado ${c.habilitado ? 'badge-activo' : 'badge-inactivo'}">
          ${c.habilitado ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="td-acciones">
        <button class="btn-table btn-edit" data-id="${c.id}">Editar</button>
        <button class="btn-table ${c.habilitado ? 'btn-disable' : 'btn-enable'}" data-id="${c.id}">
          ${c.habilitado ? 'Deshabilitar' : 'Habilitar'}
        </button>
        <button class="btn-table btn-delete" data-id="${c.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => abrirEditar(parseInt(btn.dataset.id)))
  );
  tbody.querySelectorAll('.btn-disable, .btn-enable').forEach(btn =>
    btn.addEventListener('click', () => pedirConfirm('toggle', parseInt(btn.dataset.id)))
  );
  tbody.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => pedirConfirm('delete', parseInt(btn.dataset.id)))
  );
}

function renderPaginacion(totalPaginas) {
  if (totalPaginas <= 1) { paginationEl.innerHTML = ''; return; }

  let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&#8592;</button>`;

  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += '<span class="page-ellipsis">…</span>';
    }
  }

  html += `<button ${currentPage === totalPaginas ? 'disabled' : ''} data-page="${currentPage + 1}">&#8594;</button>`;
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('button[data-page]').forEach(btn =>
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      renderVista();
    })
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Modal formulario ──────────────────────────────────────────────────────────

function abrirCrear() {
  document.getElementById('modal-form-titulo').textContent = 'Nuevo Curso';
  document.getElementById('btn-guardar').textContent = 'Guardar curso';
  document.getElementById('curso-form').reset();
  document.getElementById('form-id').value = '';
  limpiarErrores();
  document.getElementById('modal-form').style.display = 'flex';
}

function abrirEditar(id) {
  const curso = cursos.find(c => c.id === id);
  if (!curso) return;

  document.getElementById('modal-form-titulo').textContent = 'Editar Curso';
  document.getElementById('btn-guardar').textContent = 'Guardar cambios';
  document.getElementById('form-id').value = curso.id;
  document.getElementById('form-titulo').value = curso.titulo || '';
  document.getElementById('form-descripcion').value = curso.descripcion || '';
  document.getElementById('form-precio').value = curso.precio ?? '';
  document.getElementById('form-duracion').value = curso.duracion || '';
  document.getElementById('form-video-url').value = curso.video_url || '';
  document.getElementById('form-imagen-url').value = curso.imagen_url || '';
  document.getElementById('form-categoria').value = curso.categoria_id || '';
  limpiarErrores();
  document.getElementById('modal-form').style.display = 'flex';
}

function cerrarModalForm() {
  document.getElementById('modal-form').style.display = 'none';
}

// ── Validación ────────────────────────────────────────────────────────────────

function limpiarErrores() {
  ['titulo', 'descripcion', 'precio', 'video-url'].forEach(campo => {
    const el = document.getElementById(`err-${campo}`);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.form-group input, .form-group textarea').forEach(el =>
    el.classList.remove('input-error')
  );
}

function setError(campo, msg) {
  const errEl = document.getElementById(`err-${campo}`);
  const inputEl = document.getElementById(`form-${campo}`);
  if (errEl) errEl.textContent = msg;
  if (inputEl) inputEl.classList.add('input-error');
}

function validarFormulario() {
  limpiarErrores();
  let valido = true;
  const titulo = document.getElementById('form-titulo').value.trim();
  const descripcion = document.getElementById('form-descripcion').value.trim();
  const precio = document.getElementById('form-precio').value.trim();
  const videoUrl = document.getElementById('form-video-url').value.trim();

  if (!titulo) { setError('titulo', 'El nombre es obligatorio'); valido = false; }
  if (!descripcion) { setError('descripcion', 'La descripción es obligatoria'); valido = false; }
  if (!precio) {
    setError('precio', 'El precio es obligatorio'); valido = false;
  } else if (isNaN(Number(precio)) || Number(precio) < 0) {
    setError('precio', 'Ingresa un precio numérico válido'); valido = false;
  }
  if (!videoUrl) { setError('video-url', 'El enlace del curso es obligatorio'); valido = false; }
  return valido;
}

// ── Envío del formulario ──────────────────────────────────────────────────────

document.getElementById('curso-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validarFormulario()) return;

  const id = document.getElementById('form-id').value;
  const payload = {
    titulo: document.getElementById('form-titulo').value.trim(),
    descripcion: document.getElementById('form-descripcion').value.trim(),
    precio: document.getElementById('form-precio').value.trim(),
    video_url: document.getElementById('form-video-url').value.trim(),
    imagen_url: document.getElementById('form-imagen-url').value.trim() || null,
    categoria_id: document.getElementById('form-categoria').value || null,
    duracion: document.getElementById('form-duracion').value.trim() || null,
  };

  const btnGuardar = document.getElementById('btn-guardar');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    if (id) {
      await api.put(`/cursos/${id}`, payload);
      showAlert('Curso actualizado correctamente.');
    } else {
      await api.post('/cursos', payload);
      showAlert('Curso creado correctamente.');
    }
    cerrarModalForm();
    await loadCursos();
  } catch (err) {
    showAlert(err.response?.data?.message || 'Error al guardar el curso.', 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = id ? 'Guardar cambios' : 'Guardar curso';
  }
});

// ── Modal confirmación (toggle y delete) ─────────────────────────────────────

function pedirConfirm(tipo, id) {
  const curso = cursos.find(c => c.id === id);
  if (!curso) return;
  pendingAction = { tipo, id };

  const modalConfirm = document.getElementById('modal-confirm');

  if (tipo === 'delete') {
    document.getElementById('confirm-titulo').textContent = '¿Eliminar curso?';
    document.getElementById('confirm-mensaje').textContent =
      `"${curso.titulo}" será eliminado permanentemente y no podrá recuperarse.`;
    document.getElementById('confirm-aceptar').className = 'btn-danger';
    document.getElementById('confirm-aceptar').textContent = 'Eliminar';
  } else {
    const deshabilitar = curso.habilitado === 1;
    document.getElementById('confirm-titulo').textContent =
      deshabilitar ? '¿Deshabilitar curso?' : '¿Habilitar curso?';
    document.getElementById('confirm-mensaje').textContent = deshabilitar
      ? `"${curso.titulo}" dejará de aparecer en el catálogo público.`
      : `"${curso.titulo}" volverá a aparecer en el catálogo público.`;
    document.getElementById('confirm-aceptar').className = deshabilitar ? 'btn-danger' : 'btn-primary';
    document.getElementById('confirm-aceptar').textContent = deshabilitar ? 'Deshabilitar' : 'Habilitar';
  }

  modalConfirm.style.display = 'flex';
}

document.getElementById('confirm-aceptar').addEventListener('click', async () => {
  if (!pendingAction) return;
  const { tipo, id } = pendingAction;
  pendingAction = null;
  document.getElementById('modal-confirm').style.display = 'none';

  try {
    if (tipo === 'delete') {
      await api.delete(`/cursos/${id}`);
      showAlert('Curso eliminado correctamente.');
    } else {
      const res = await api.patch(`/cursos/${id}/toggle`);
      showAlert(res.data.message);
    }
    await loadCursos();
  } catch (err) {
    showAlert(
      tipo === 'delete' ? 'Error al eliminar el curso.' : 'Error al cambiar el estado del curso.',
      'error'
    );
  }
});

// ── Listeners ─────────────────────────────────────────────────────────────────

document.getElementById('btn-nuevo-curso').addEventListener('click', abrirCrear);
document.getElementById('modal-close-btn').addEventListener('click', cerrarModalForm);
document.getElementById('btn-cancelar').addEventListener('click', cerrarModalForm);
document.getElementById('modal-backdrop').addEventListener('click', cerrarModalForm);

function cerrarConfirm() {
  document.getElementById('modal-confirm').style.display = 'none';
  pendingAction = null;
}
document.getElementById('confirm-cancelar').addEventListener('click', cerrarConfirm);
document.getElementById('confirm-backdrop').addEventListener('click', cerrarConfirm);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { cerrarModalForm(); cerrarConfirm(); }
});

let debounceTimer;
busquedaInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { currentPage = 1; renderVista(); }, 250);
});

categoriaSelect.addEventListener('change', () => { currentPage = 1; renderVista(); });
estadoSelect.addEventListener('change', () => { currentPage = 1; renderVista(); });
ordenarSelect.addEventListener('change', () => { currentPage = 1; renderVista(); });

// ── Init ──────────────────────────────────────────────────────────────────────

loadCategorias();
loadCursos();

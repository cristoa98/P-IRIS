let currentPage = 1;
let currentFiltros = {
  busqueda: '',
  ordenar: 'relevancia',
  categoria: '',
  precio_min: '',
  precio_max: ''
};
let debounceTimer = null;

const container = document.getElementById('cursos-container');
const pagination = document.getElementById('pagination');

function formatPrecio(precio) {
  return '$' + precio.toLocaleString('es-CL');
}

async function loadCategorias() {
  try {
    const response = await api.get('/categorias');
    const select = document.getElementById('categoria-select');
    select.innerHTML = '<option value="">Todas las categorías</option>';
    response.data.forEach(cat => {
      select.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
    });
  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }
}

function showSkeleton() {
  let html = '';
  for (let i = 0; i < 8; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div style="padding: 1rem;">
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text short" style="margin-top: 0.5rem;"></div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
            <div class="skeleton" style="width: 80px; height: 24px;"></div>
            <div class="skeleton" style="width: 70px; height: 30px; border-radius: 8px;"></div>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function renderCursos(cursos) {
  container.innerHTML = cursos.map(curso => `
    <article class="card-curso" data-id="${curso.id}">
      <img src="${curso.imagen_url}" alt="${curso.titulo}" class="card-img" loading="lazy">
      <div class="card-body">
        <h3 class="card-title">${curso.titulo}</h3>
        <p class="card-desc">${curso.descripcion}</p>
        <div class="card-footer">
          <span class="badge-precio">${formatPrecio(curso.precio)}</span>
          <button class="btn-primary btn-sm ver-mas-btn" data-id="${curso.id}">Ver más</button>
        </div>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.ver-mas-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModal(parseInt(btn.dataset.id));
    });
  });
}

function renderPagination(page, totalPaginas) {
  if (totalPaginas <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = `<button id="prev-btn" ${page === 1 ? 'disabled' : ''}>Anterior</button>`;
  html += '<div class="page-numbers">';

  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= page - 1 && i <= page + 1)) {
      html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += '<span class="page-ellipsis">...</span>';
    }
  }
  html += '</div>';
  html += `<button id="next-btn" ${page === totalPaginas ? 'disabled' : ''}>Siguiente</button>`;

  pagination.innerHTML = html;

  document.getElementById('prev-btn').addEventListener('click', () => loadCursos(page - 1));
  document.getElementById('next-btn').addEventListener('click', () => loadCursos(page + 1));

  pagination.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => loadCursos(parseInt(btn.dataset.page)));
  });
}

function renderEmpty() {
  container.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <p>No se encontraron resultados</p>
    </div>
  `;
  pagination.innerHTML = '';
}

async function loadCursos(page = 1) {
  currentPage = page;
  showSkeleton();

  try {
    const params = { page, limit: 8 };
    if (currentFiltros.busqueda) params.busqueda = currentFiltros.busqueda;
    if (currentFiltros.ordenar !== 'relevancia') params.ordenar = currentFiltros.ordenar;
    if (currentFiltros.categoria) params.categoria = currentFiltros.categoria;
    if (currentFiltros.precio_min) params.precio_min = currentFiltros.precio_min;
    if (currentFiltros.precio_max) params.precio_max = currentFiltros.precio_max;

    const response = await api.get('/cursos', { params });
    const { cursos, pagina, totalPaginas } = response.data;

    if (cursos.length === 0) {
      renderEmpty();
      return;
    }

    renderCursos(cursos);
    renderPagination(pagina, totalPaginas);
  } catch (error) {
    console.error('Error al cargar cursos:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>Error al cargar los cursos. Intenta nuevamente.</p>
      </div>
    `;
  }
}

function triggerFiltrado() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentFiltros = {
      busqueda: document.getElementById('busqueda-input').value.trim(),
      ordenar: document.getElementById('ordenar-select').value,
      categoria: document.getElementById('categoria-select').value,
      precio_min: document.getElementById('precio-min').value,
      precio_max: document.getElementById('precio-max').value
    };
    currentPage = 1;
    loadCursos(1);
  }, 300);
}

function limpiarFiltros() {
  document.getElementById('busqueda-input').value = '';
  document.getElementById('categoria-select').value = '';
  document.getElementById('ordenar-select').value = 'relevancia';
  document.getElementById('precio-min').value = '';
  document.getElementById('precio-max').value = '';
  triggerFiltrado();
}

async function abrirModal(cursoId) {
  const modal = document.getElementById('modal-curso');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  try {
    const response = await api.get(`/cursos/${cursoId}`);
    const curso = response.data;

    document.getElementById('modal-imagen').src = curso.imagen_url;
    document.getElementById('modal-titulo').textContent = curso.titulo;
    document.getElementById('modal-categoria').textContent = curso.categoria || 'General';
    document.getElementById('modal-descripcion').textContent = curso.descripcion;
    document.getElementById('modal-precio').textContent = formatPrecio(curso.precio);
    document.getElementById('modal-duracion').textContent = curso.duracion || '';

    const addBtn = document.getElementById('modal-agregar');
    addBtn.dataset.cursoId = curso.id;
    addBtn.dataset.cursoPrecio = curso.precio;
    addBtn.dataset.cursoTitulo = curso.titulo;
    const alreadyInCart = getCart().find(c => c.id === curso.id);
    addBtn.textContent = alreadyInCart ? '✓ En el carrito' : 'Agregar al carrito';
    addBtn.disabled = !!alreadyInCart;
  } catch (error) {
    console.error('Error al cargar detalle del curso:', error);
    cerrarModal();
  }
}

function cerrarModal() {
  document.getElementById('modal-curso').style.display = 'none';
  document.body.classList.remove('modal-open');
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategorias();
  loadCursos(1);

  document.getElementById('busqueda-input').addEventListener('input', triggerFiltrado);
  document.getElementById('categoria-select').addEventListener('change', triggerFiltrado);
  document.getElementById('ordenar-select').addEventListener('change', triggerFiltrado);
  document.getElementById('precio-min').addEventListener('input', triggerFiltrado);
  document.getElementById('precio-max').addEventListener('input', triggerFiltrado);
  document.getElementById('limpiar-filtros').addEventListener('click', limpiarFiltros);

  document.querySelector('.modal-close').addEventListener('click', cerrarModal);
  document.querySelector('.modal-backdrop').addEventListener('click', cerrarModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });
});
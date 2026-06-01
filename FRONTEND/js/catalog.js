let currentPage = 1;
const limit = 10;

function formatPrecio(precio) {
  return '$' + precio.toLocaleString('es-CL');
}

function renderCursos(cursos) {
  const container = document.getElementById('cursos-container');
  container.innerHTML = cursos.map(curso => `
    <article class="card-curso">
      <img src="${curso.imagen_url}" alt="${curso.titulo}" class="card-img" loading="lazy">
      <div class="card-body">
        <h3 class="card-title">${curso.titulo}</h3>
        <p class="card-desc">${curso.descripcion}</p>
        <div class="card-footer">
          <span class="badge-precio">${formatPrecio(curso.precio)}</span>
          <button class="btn-primary btn-sm">Ver más</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderPagination(page, totalPaginas) {
  const container = document.getElementById('pagination');
  if (totalPaginas <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  html += `<button id="prev-btn" ${page === 1 ? 'disabled' : ''}>Anterior</button>`;

  html += '<div class="page-numbers">';
  for (let i = 1; i <= totalPaginas; i++) {
    if (
      i === 1 ||
      i === totalPaginas ||
      (i >= page - 1 && i <= page + 1)
    ) {
      html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += '<span style="padding: 0 0.5rem;">...</span>';
    }
  }
  html += '</div>';

  html += `<button id="next-btn" ${page === totalPaginas ? 'disabled' : ''}>Siguiente</button>`;

  container.innerHTML = html;

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) loadCursos(currentPage - 1);
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage < totalPaginas) loadCursos(currentPage + 1);
  });

  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      loadCursos(parseInt(btn.dataset.page));
    });
  });
}

function renderEmpty() {
  document.getElementById('cursos-container').innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <p>No hay cursos disponibles en este momento.</p>
    </div>
  `;
  document.getElementById('pagination').innerHTML = '';
}

async function loadCursos(page = 1) {
  currentPage = page;
  const container = document.getElementById('cursos-container');

  showSkeleton(container, limit);

  try {
    const response = await api.get('/cursos', { params: { page, limit } });
    const { cursos, pagina, totalPaginas } = response.data;

    hideSkeleton(container);

    if (cursos.length === 0) {
      renderEmpty();
      return;
    }

    renderCursos(cursos);
    renderPagination(pagina, totalPaginas);
  } catch (error) {
    console.error('Error al cargar cursos:', error);
    hideSkeleton(container);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>Error al cargar los cursos. Intenta nuevamente.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCursos(1);
});
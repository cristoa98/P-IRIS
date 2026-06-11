async function cargarMetricas() {
  const tbody = document.getElementById('metricas-tbody');

  try {
    const res = await api.get('/metricas/ventas');
    const { totalVentas, totalCompras, cursosVendidos } = res.data;

    document.getElementById('kpi-total-ventas').textContent = formatPrecio(totalVentas);
    document.getElementById('kpi-total-compras').textContent = totalCompras;

    const totalUnidades = cursosVendidos.reduce((sum, c) => sum + c.unidades, 0);
    document.getElementById('kpi-cursos-vendidos').textContent = totalUnidades;

    if (!cursosVendidos.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-loading">Aún no hay ventas registradas.</td></tr>';
      return;
    }

    const maxUnidades = Math.max(...cursosVendidos.map(c => c.unidades));

    tbody.innerHTML = cursosVendidos.map(c => `
      <tr>
        <td class="td-titulo" title="${escapeHtml(c.titulo)}">${escapeHtml(c.titulo)}</td>
        <td>${c.unidades}</td>
        <td>${formatPrecio(c.ingresos)}</td>
        <td>
          <div class="barra-metricas">
            <div class="barra-metricas-fill" style="width: ${(c.unidades / maxUnidades) * 100}%"></div>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    const status = err.response?.status;
    const msg = status === 401 ? 'Debes iniciar sesión como administrador.'
              : status === 403 ? 'Sin permisos. Solo el administrador puede ver métricas.'
              : `Error al cargar métricas (${status || 'sin conexión'}).`;
    tbody.innerHTML = `<tr><td colspan="4" class="table-loading">${msg}</td></tr>`;
  }
}

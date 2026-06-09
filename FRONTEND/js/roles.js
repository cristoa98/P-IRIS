const cambiosPendientes = {};
let editandoUsuarioId = null;

function mostrarAlertaRoles(mensaje, tipo = 'success') {
  const el = document.getElementById('roles-alert');
  el.textContent = mensaje;
  el.className = `admin-alert admin-alert-${tipo}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

async function cargarUsuarios() {
  const tbody = document.getElementById('roles-tbody');
  try {
    const [resUsuarios, resRoles] = await Promise.all([
      api.get('/usuarios'),
      api.get('/auth/roles')
    ]);
    const usuarios = resUsuarios.data;
    const roles = resRoles.data;

    if (!usuarios.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-loading">No hay usuarios.</td></tr>';
      return;
    }

    tbody.innerHTML = usuarios.map(u => {
      const opciones = roles.map(r =>
        `<option value="${r.id}" ${r.id === u.rol_id ? 'selected' : ''}>${r.nombre}</option>`
      ).join('');
      const nombreMostrado = u.nombre || '—';
      return `
        <tr data-usuario-id="${u.id}">
          <td>${u.id}</td>
          <td class="td-nombre-usuario" data-usuario-id="${u.id}">${nombreMostrado}</td>
          <td>${u.email}</td>
          <td>
            <select class="select-rol" data-usuario-id="${u.id}" data-rol-original="${u.rol_id}">
              ${opciones}
            </select>
          </td>
          <td>
            <button class="btn-table btn-edit btn-editar-nombre" data-usuario-id="${u.id}" data-nombre="${u.nombre || ''}">
              Editar
            </button>
            <button class="btn-table btn-disable btn-eliminar-usuario" data-usuario-id="${u.id}" data-nombre="${nombreMostrado}">
              Eliminar
            </button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-editar-nombre').forEach(btn => {
      btn.addEventListener('click', () => abrirEditarNombre(btn.dataset.usuarioId, btn.dataset.nombre));
    });

    tbody.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
      btn.addEventListener('click', () => confirmarEliminar(btn.dataset.usuarioId, btn.dataset.nombre));
    });

    tbody.querySelectorAll('.select-rol').forEach(sel => {
      sel.addEventListener('change', () => {
        const uid = sel.dataset.usuarioId;
        const original = parseInt(sel.dataset.rolOriginal);
        const nuevo = parseInt(sel.value);
        if (nuevo !== original) {
          cambiosPendientes[uid] = nuevo;
          sel.classList.add('select-modificado');
        } else {
          delete cambiosPendientes[uid];
          sel.classList.remove('select-modificado');
        }
      });
    });

  } catch (err) {
    const status = err.response?.status;
    const msg = status === 401 ? 'Debes iniciar sesión como administrador.'
              : status === 403 ? 'Sin permisos. Solo el administrador puede gestionar roles.'
              : `Error al cargar usuarios (${status || 'sin conexión'}).`;
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">${msg}</td></tr>`;
  }
}

async function guardarCambiosRoles() {
  const ids = Object.keys(cambiosPendientes);
  if (!ids.length) {
    mostrarAlertaRoles('No hay cambios pendientes.', 'error');
    return;
  }

  const btn = document.getElementById('btn-guardar-roles');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await Promise.all(ids.map(id =>
      api.patch(`/usuarios/${id}/rol`, { rol_id: cambiosPendientes[id] })
    ));

    // Actualizar los data-rol-original y limpiar marcas
    document.querySelectorAll('.select-rol').forEach(sel => {
      const uid = sel.dataset.usuarioId;
      if (cambiosPendientes[uid]) {
        sel.dataset.rolOriginal = sel.value;
        sel.classList.remove('select-modificado');
      }
    });

    Object.keys(cambiosPendientes).forEach(k => delete cambiosPendientes[k]);
    mostrarAlertaRoles('Roles actualizados correctamente.');
  } catch (err) {
    mostrarAlertaRoles('Error al guardar cambios.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
}

// Sidebar nav
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.dataset.tab;
    document.getElementById('tab-cursos').style.display = target === 'cursos' ? 'block' : 'none';
    document.getElementById('tab-roles').style.display = target === 'roles' ? 'block' : 'none';
    if (target === 'roles') cargarUsuarios();
  });
});

function confirmarEliminar(id, nombre) {
  if (!confirm(`¿Eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
  eliminarUsuario(id);
}

async function eliminarUsuario(id) {
  try {
    await api.delete(`/usuarios/${id}`);
    const fila = document.querySelector(`tr[data-usuario-id="${id}"]`);
    if (fila) fila.remove();
    delete cambiosPendientes[id];
    mostrarAlertaRoles('Usuario eliminado correctamente.');
  } catch (err) {
    const msg = err.response?.data?.message || 'Error al eliminar usuario.';
    mostrarAlertaRoles(msg, 'error');
  }
}

document.getElementById('btn-guardar-roles').addEventListener('click', guardarCambiosRoles);

// ── Editar nombre de usuario ───────────────────────────────────────────────────

function abrirEditarNombre(id, nombre) {
  editandoUsuarioId = id;
  document.getElementById('editar-nombre-input').value = nombre;
  document.getElementById('editar-nombre-error').textContent = '';
  document.getElementById('modal-editar-nombre').style.display = 'flex';
  document.getElementById('editar-nombre-input').focus();
}

function cerrarEditarNombre() {
  document.getElementById('modal-editar-nombre').style.display = 'none';
  editandoUsuarioId = null;
}

async function guardarNombreUsuario() {
  const nombre = document.getElementById('editar-nombre-input').value.trim();
  const errEl = document.getElementById('editar-nombre-error');

  if (!nombre) {
    errEl.textContent = 'El nombre es obligatorio.';
    return;
  }

  const btn = document.getElementById('editar-nombre-guardar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await api.patch(`/usuarios/${editandoUsuarioId}/nombre`, { nombre });

    // Actualizar el nombre en la tabla sin recargar
    const tdNombre = document.querySelector(`.td-nombre-usuario[data-usuario-id="${editandoUsuarioId}"]`);
    if (tdNombre) tdNombre.textContent = nombre;

    const btnEditar = document.querySelector(`.btn-editar-nombre[data-usuario-id="${editandoUsuarioId}"]`);
    if (btnEditar) btnEditar.dataset.nombre = nombre;

    cerrarEditarNombre();
    mostrarAlertaRoles('Nombre actualizado correctamente.');
  } catch (err) {
    errEl.textContent = err.response?.data?.message || 'Error al guardar el nombre.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

document.getElementById('editar-nombre-guardar').addEventListener('click', guardarNombreUsuario);
document.getElementById('editar-nombre-cancelar').addEventListener('click', cerrarEditarNombre);
document.getElementById('editar-nombre-close-btn').addEventListener('click', cerrarEditarNombre);
document.getElementById('editar-nombre-backdrop').addEventListener('click', cerrarEditarNombre);

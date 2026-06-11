document.addEventListener('DOMContentLoaded', () => {
    cargarHistorial();
    cargarCertificados();
});

async function cargarHistorial() {
    const tbody = document.getElementById('historialBody');

    try {
        const response = await fetch('/api/compras/historial', {
        credentials: 'include'
        });

        if (response.status === 401) {
        window.location.href = 'login.html';
        return;
        }

        const historial = await response.json();

        if (!historial.length) {
        tbody.innerHTML = `
            <tr>
            <td colspan="4">No tienes compras registradas.</td>
            </tr>
        `;
        return;
        }

        tbody.innerHTML = historial.map((compra) => `
        <tr>
            <td>${compra.nombre_curso}</td>
            <td>${formatearFecha(compra.fecha_compra)}</td>
            <td>${compra.estado}</td>
            <td>
                <a href="contenido.html?id=${compra.curso_id}" class="btn-primary btn-sm">
                    Acceder
                </a>
            </td>
        </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar historial:', error);
        tbody.innerHTML = `
        <tr>
            <td colspan="4">No se pudo cargar el historial.</td>
        </tr>
        `;
    }
    }

    function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CL');
}

async function cargarCertificados() {
    const tbody = document.getElementById('certificadosBody');

    try {
        const response = await fetch('/api/certificados', {
        credentials: 'include'
        });

        if (response.status === 401) {
        return;
        }

        const certificados = await response.json();

        if (!certificados.length) {
        tbody.innerHTML = `
            <tr>
            <td colspan="3">Aún no tienes certificados. Accede al contenido de un curso para obtener uno.</td>
            </tr>
        `;
        return;
        }

        tbody.innerHTML = certificados.map((cert) => `
        <tr>
            <td>${cert.curso_titulo}</td>
            <td>${formatearFecha(cert.fecha_emision)}</td>
            <td>
                <a href="certificado.html?codigo=${cert.codigo}" class="btn-primary btn-sm">
                    Ver certificado
                </a>
            </td>
        </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar certificados:', error);
        tbody.innerHTML = `
        <tr>
            <td colspan="3">No se pudieron cargar los certificados.</td>
        </tr>
        `;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    cargarCertificado();

    document.getElementById('btn-imprimir').addEventListener('click', () => {
        window.print();
    });
});

async function cargarCertificado() {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');

    if (!codigo) {
        window.location.href = 'historial.html';
        return;
    }

    try {
        const res = await api.get(`/certificados/${codigo}`);
        const cert = res.data;

        const nombreCompleto = [cert.nombre, cert.apellido].filter(Boolean).join(' ') || 'Alumno/a';

        document.getElementById('certificado-nombre').textContent = nombreCompleto;
        document.getElementById('certificado-curso').textContent = cert.curso_titulo;
        document.getElementById('certificado-fecha').textContent = `Emitido el ${formatearFecha(cert.fecha_emision)}`;
        document.getElementById('certificado-codigo').textContent = `Código: ${cert.codigo}`;

    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        window.location.href = 'historial.html';
    }
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CL');
}

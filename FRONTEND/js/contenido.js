document.addEventListener('DOMContentLoaded', cargarContenido);

async function cargarContenido() {
    const params = new URLSearchParams(window.location.search);
    const cursoId = params.get('id');

    if (!cursoId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await api.get(`/compras/contenido/${cursoId}`);
        const curso = response.data;
        let completado = curso.completado === 1;

        document.getElementById('contenido-titulo').textContent = curso.titulo;
        document.getElementById('contenido-descripcion').textContent = curso.descripcion;

        const mensaje = document.getElementById('contenido-mensaje');
        if (mensaje) {
        mensaje.textContent = 'Ya puedes acceder al contenido de este curso.';
        }

        const duracion = document.getElementById('contenido-duracion');
        if (duracion) {
        duracion.textContent = curso.duracion ? `Duración: ${curso.duracion}` : '';
        }

        const imagen = document.getElementById('contenido-imagen');
        if (imagen) {
        imagen.src = curso.imagen_url || '';
        imagen.alt = curso.titulo;
        }

        const youtubeBtn = document.getElementById('btn-youtube');

        if (youtubeBtn) {
        if (curso.video_url) {
            youtubeBtn.style.display = 'inline-block';

            youtubeBtn.addEventListener('click', async () => {
            window.open(curso.video_url, '_blank');

            if (!completado) {
                completado = true;
                try {
                const res = await api.patch(`/compras/contenido/${cursoId}/completar`);
                if (res.data?.certificado?.nuevo) {
                    mostrarNotificacion('¡Felicidades, obtuviste tu certificado!');
                }
                } catch (_) {
                completado = false;
                }
            }
            });
        } else {
            youtubeBtn.style.display = 'none';
        }
        }

    } catch (error) {
        if (error.response && error.response.status === 401) {
        window.location.href = 'login.html';
        return;
        }

        if (error.response && error.response.status === 403) {
        alert('Debes comprar este curso');
        window.location.href = 'index.html';
        return;
        }

        alert('No se pudo cargar el contenido del curso');
        window.location.href = 'index.html';
    }
}
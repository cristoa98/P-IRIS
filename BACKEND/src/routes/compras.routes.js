const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');
const { requireAuth } = require('../middlewares/auth.middleware');

function validarPago(pago) {
  if (!pago || typeof pago !== 'object') return false;
  const { nombre, numero_tarjeta, fecha_vencimiento, cvv } = pago;
  if (!nombre || !numero_tarjeta || !fecha_vencimiento || !cvv) return false;
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim())) return false;
  if (!/^\d{16}$/.test(numero_tarjeta)) return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(fecha_vencimiento)) return false;
  if (!/^\d{3}$/.test(cvv)) return false;
  return true;
}

function validarComprador(comprador) {
  if (!comprador || typeof comprador !== 'object') return false;
  const { nombre, correo } = comprador;
  if (!nombre || !nombre.trim()) return false;
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim())) return false;
  if (!correo || !correo.trim()) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return false;
  return true;
}

router.post('/', requireAuth, async (req, res) => {
  const { carrito, pago, comprador } = req.body;

  if (!Array.isArray(carrito) || carrito.length === 0) {
    return res.status(400).json({ ok: false, mensaje: 'Pago rechazado' });
  }

  if (!validarComprador(comprador)) {
    return res.status(400).json({ ok: false, mensaje: 'Pago rechazado' });
  }

  if (!validarPago(pago)) {
    return res.status(400).json({ ok: false, mensaje: 'Pago rechazado' });
  }

  try {
    const db = await getDb();
    const usuarioId = req.session.userId;
    const cursoIds = [...new Set(carrito.map(item => Number(item.id)).filter(Boolean))];

    if (cursoIds.length !== carrito.length) {
      return res.status(400).json({ ok: false, mensaje: 'Pago rechazado' });
    }

    const placeholders = cursoIds.map(() => '?').join(',');
    const cursosResult = db.exec(
      `SELECT id, titulo, precio FROM cursos WHERE habilitado = 1 AND id IN (${placeholders})`,
      cursoIds
    );
    const cursos = (cursosResult[0]?.values || []).map(row => ({
      id: row[0],
      titulo: row[1],
      precio: row[2]
    }));

    if (cursos.length !== cursoIds.length) {
      return res.status(400).json({ ok: false, mensaje: 'Pago rechazado' });
    }

    const total = cursos.reduce((sum, curso) => sum + curso.precio, 0);
    const datosFacturacion = JSON.stringify({
      nombre: comprador.nombre.trim(),
      correo: comprador.correo.trim(),
      nombre_tarjeta: pago.nombre.trim()
    });

    db.run(
      'INSERT INTO compras (usuario_id, total, estado, datos_facturacion) VALUES (?, ?, ?, ?)',
      [usuarioId, total, 'completada', datosFacturacion]
    );

    const compraId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];

    for (const curso of cursos) {
      db.run(
        'INSERT INTO detalle_compra (compra_id, curso_id, precio_unitario) VALUES (?, ?, ?)',
        [compraId, curso.id, curso.precio]
      );
    }

    saveDb(db);

    const fechaRow = db.exec('SELECT created_at FROM compras WHERE id = ?', [compraId]);
    const fecha = fechaRow[0]?.values[0][0] || new Date().toISOString();

    res.json({
      ok: true,
      mensaje: 'Compra realizada con éxito',
      compraId,
      fecha,
      cursos: cursos.map(curso => ({ titulo: curso.titulo }))
    });
  } catch (err) {
    console.error('Error al registrar compra:', err);
    res.status(500).json({ ok: false, mensaje: 'Pago rechazado' });
  }
});

router.get('/historial', requireAuth, async (req, res) => {
  try {
    const db = await getDb();

    const stmt = db.prepare(`
      SELECT
        cu.id AS curso_id,
        cu.titulo AS nombre_curso,
        co.created_at AS fecha_compra,
        co.estado AS estado
      FROM compras co
      INNER JOIN detalle_compra dc ON dc.compra_id = co.id
      INNER JOIN cursos cu ON cu.id = dc.curso_id
      WHERE co.usuario_id = ?
      ORDER BY co.created_at DESC
    `);

    stmt.bind([req.session.userId]);

    const historial = [];
    while (stmt.step()) {
      historial.push(stmt.getAsObject());
    }
    stmt.free();

    return res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return res.status(500).json({ message: 'Error al obtener historial de compras' });
  }
});

router.get('/verificar/:cursoId', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const usuarioId = req.session.userId;
    const cursoId = Number(req.params.cursoId);

    if (!cursoId) {
      return res.status(400).json({
        comprado: false,
        message: 'Curso inválido'
      });
    }

    const stmt = db.prepare(`
      SELECT COUNT(*) AS total
      FROM compras co
      INNER JOIN detalle_compra dc ON dc.compra_id = co.id
      WHERE co.usuario_id = ?
        AND dc.curso_id = ?
        AND co.estado = 'completada'
    `);

    stmt.bind([usuarioId, cursoId]);

    let total = 0;

    if (stmt.step()) {
      total = stmt.getAsObject().total;
    }

    stmt.free();

    return res.json({
      comprado: total > 0
    });
  } catch (error) {
    console.error('Error al verificar compra:', error);
    return res.status(500).json({
      comprado: false,
      message: 'Error al verificar compra'
    });
  }
});

router.get('/contenido/:cursoId', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const usuarioId = req.session.userId;
    const cursoId = Number(req.params.cursoId);

    if (!cursoId) {
      return res.status(400).json({
        message: 'Curso inválido'
      });
    }

    const stmt = db.prepare(`
      SELECT
        cu.id,
        cu.titulo,
        cu.descripcion,
        cu.imagen_url,
        cu.video_url,
        cu.duracion
      FROM compras co
      INNER JOIN detalle_compra dc ON dc.compra_id = co.id
      INNER JOIN cursos cu ON cu.id = dc.curso_id
      WHERE co.usuario_id = ?
        AND dc.curso_id = ?
        AND co.estado = 'completada'
      LIMIT 1
    `);

    stmt.bind([usuarioId, cursoId]);

    let curso = null;

    if (stmt.step()) {
      curso = stmt.getAsObject();
    }

    stmt.free();

    if (!curso) {
      return res.status(403).json({
        message: 'Debes comprar este curso'
      });
    }

    return res.json(curso);

  } catch (error) {
    console.error('Error al obtener contenido:', error);

    return res.status(500).json({
      message: 'Error al obtener contenido'
    });
  }
});

module.exports = router;

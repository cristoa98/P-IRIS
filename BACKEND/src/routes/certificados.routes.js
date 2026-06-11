const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT c.codigo, c.fecha_emision, cu.id AS curso_id, cu.titulo AS curso_titulo
      FROM certificados c
      INNER JOIN cursos cu ON cu.id = c.curso_id
      WHERE c.usuario_id = ?
      ORDER BY c.fecha_emision DESC
    `);
    stmt.bind([req.session.userId]);

    const certificados = [];
    while (stmt.step()) certificados.push(stmt.getAsObject());
    stmt.free();

    res.json(certificados);
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({ message: 'Error al obtener certificados' });
  }
});

router.get('/:codigo', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT c.codigo, c.fecha_emision, cu.titulo AS curso_titulo, u.nombre, u.apellido
      FROM certificados c
      INNER JOIN cursos cu ON cu.id = c.curso_id
      INNER JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.codigo = ? AND c.usuario_id = ?
      LIMIT 1
    `);
    stmt.bind([req.params.codigo, req.session.userId]);

    let certificado = null;
    if (stmt.step()) certificado = stmt.getAsObject();
    stmt.free();

    if (!certificado) {
      return res.status(404).json({ message: 'Certificado no encontrado' });
    }

    res.json(certificado);
  } catch (error) {
    console.error('Error al obtener certificado:', error);
    res.status(500).json({ message: 'Error al obtener certificado' });
  }
});

module.exports = router;

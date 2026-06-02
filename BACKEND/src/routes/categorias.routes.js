const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT DISTINCT c.id, c.nombre
      FROM categorias c
      INNER JOIN cursos cu ON cu.categoria_id = c.id
      WHERE cu.habilitado = 1
      ORDER BY c.nombre
    `);

    const categorias = (result[0]?.values || []).map(row => ({
      id: row[0],
      nombre: row[1]
    }));

    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
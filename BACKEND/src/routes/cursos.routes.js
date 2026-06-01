const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const db = await getDb();

    const countResult = db.exec("SELECT COUNT(*) FROM cursos WHERE habilitado = 1");
    const total = countResult[0]?.values[0][0] || 0;
    const totalPaginas = Math.ceil(total / limit);

    const cursosResult = db.exec(`
      SELECT id, titulo, descripcion, precio, imagen_url
      FROM cursos
      WHERE habilitado = 1
      ORDER BY id
      LIMIT ${limit} OFFSET ${offset}
    `);

    const cursos = (cursosResult[0]?.values || []).map(row => ({
      id: row[0],
      titulo: row[1],
      descripcion: row[2],
      precio: row[3],
      imagen_url: row[4]
    }));

    res.json({
      cursos,
      pagina: page,
      total,
      totalPaginas
    });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
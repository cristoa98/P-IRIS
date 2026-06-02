const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;
    const { busqueda, ordenar, categoria, precio_min, precio_max } = req.query;

    const db = await getDb();

    const whereClauses = ['habilitado = 1'];
    const params = [];

    if (busqueda && busqueda.trim()) {
      whereClauses.push('(titulo LIKE ? OR descripcion LIKE ?)');
      const term = '%' + busqueda.trim() + '%';
      params.push(term, term);
    }

    if (categoria && categoria !== '') {
      whereClauses.push('categoria_id = ?');
      params.push(parseInt(categoria));
    }

    if (precio_min && precio_min !== '') {
      whereClauses.push('precio >= ?');
      params.push(parseFloat(precio_min));
    }

    if (precio_max && precio_max !== '') {
      whereClauses.push('precio <= ?');
      params.push(parseFloat(precio_max));
    }

    const whereSQL = whereClauses.join(' AND ');

    let orderSQL = 'id DESC';
    if (ordenar === 'fecha') {
      orderSQL = 'created_at DESC, id DESC';
    } else if (ordenar === 'precio_asc') {
      orderSQL = 'precio ASC, id DESC';
    } else if (ordenar === 'precio_desc') {
      orderSQL = 'precio DESC, id DESC';
    }

    const countSql = `SELECT COUNT(*) FROM cursos WHERE ${whereSQL}`;
    const countResult = db.exec(countSql, params);
    const total = countResult[0]?.values[0][0] || 0;
    const totalPaginas = Math.ceil(total / limit);

    const queryParams = [...params, limit, offset];
    const cursosSql = `
      SELECT id, titulo, descripcion, precio, imagen_url
      FROM cursos
      WHERE ${whereSQL}
      ORDER BY ${orderSQL}
      LIMIT ? OFFSET ?
    `;
    const cursosResult = db.exec(cursosSql, queryParams);

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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = db.exec(`
      SELECT c.id, c.titulo, c.descripcion, c.precio, c.imagen_url, c.video_url, c.duracion, c.categoria_id, cat.nombre as categoria
      FROM cursos c
      LEFT JOIN categorias cat ON cat.id = c.categoria_id
      WHERE c.id = ? AND c.habilitado = 1
    `, [parseInt(id)]);

    if (!result[0]?.values || result[0].values.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    const row = result[0].values[0];
    const curso = {
      id: row[0],
      titulo: row[1],
      descripcion: row[2],
      precio: row[3],
      imagen_url: row[4],
      video_url: row[5],
      duracion: row[6],
      categoria_id: row[7],
      categoria: row[8] || 'General'
    };

    res.json(curso);
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireRole } = require('../middlewares/auth.middleware');

router.get('/ventas', requireRole(['admin']), async (req, res) => {
  try {
    const db = await getDb();

    const totalesResult = db.exec(`
      SELECT COUNT(*) AS total_compras, COALESCE(SUM(total), 0) AS total_ventas
      FROM compras
      WHERE estado = 'completada'
    `);
    const [totalCompras, totalVentas] = totalesResult[0]?.values[0] || [0, 0];

    const stmt = db.prepare(`
      SELECT
        cu.id AS curso_id,
        cu.titulo AS titulo,
        COUNT(dc.id) AS unidades,
        COALESCE(SUM(dc.precio_unitario), 0) AS ingresos
      FROM detalle_compra dc
      INNER JOIN compras co ON co.id = dc.compra_id
      INNER JOIN cursos cu ON cu.id = dc.curso_id
      WHERE co.estado = 'completada'
      GROUP BY cu.id
      ORDER BY unidades DESC
    `);

    const cursosVendidos = [];
    while (stmt.step()) cursosVendidos.push(stmt.getAsObject());
    stmt.free();

    res.json({
      totalVentas,
      totalCompras,
      cursosVendidos
    });
  } catch (error) {
    console.error('Error al obtener métricas de ventas:', error);
    res.status(500).json({ message: 'Error al obtener métricas de ventas' });
  }
});

module.exports = router;

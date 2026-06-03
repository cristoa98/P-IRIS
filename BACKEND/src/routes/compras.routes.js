const express = require('express');
const router = express.Router();

const { getDb } = require('../db');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/historial', requireAuth, async (req, res) => {
    try {
        const db = await getDb();

        const stmt = db.prepare(`
        SELECT
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

module.exports = router;
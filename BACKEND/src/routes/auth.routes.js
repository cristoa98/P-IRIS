const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { getDb } = require('../db');
const { requireAuth } = require('../middlewares/auth.middleware');

function mapUsuario(row) {
    return {
        id: row[0],
        email: row[1],
        nombre: row[2],
        apellido: row[3],
        rol: row[4]
    };
    }

    router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) {
        return res.status(400).json({ message: 'El correo es obligatorio' });
        }

        if (!password) {
        return res.status(400).json({ message: 'La contraseña es obligatoria' });
        }

        const db = await getDb();

        const stmt = db.prepare(`
        SELECT u.id, u.email, u.nombre, u.apellido, r.nombre AS rol, u.password, u.activo
        FROM usuarios u
        INNER JOIN roles r ON r.id = u.rol_id
        WHERE LOWER(u.email) = LOWER(?)
        LIMIT 1
        `);

        stmt.bind([email.trim()]);

        let row = null;

        if (stmt.step()) {
        row = stmt.get();
        }

        stmt.free();

        if (!row) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }

        const storedPassword = row[5];
        const activo = row[6];

        if (activo !== 1) {
        return res.status(403).json({ message: 'Usuario inactivo' });
        }

        let passwordOk = false;

        if (storedPassword && storedPassword.startsWith('$2')) {
        passwordOk = await bcrypt.compare(password, storedPassword);
        } else {
        passwordOk = password === storedPassword;
        }

        if (!passwordOk) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        req.session.userId = row[0];
        req.session.rol = row[4];

        return res.json({
        message: 'Inicio de sesión exitoso',
        user: mapUsuario(row)
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
    });

    router.get('/me', requireAuth, async (req, res) => {
    try {
        const db = await getDb();

        const stmt = db.prepare(`
        SELECT u.id, u.email, u.nombre, u.apellido, r.nombre AS rol
        FROM usuarios u
        INNER JOIN roles r ON r.id = u.rol_id
        WHERE u.id = ? AND u.activo = 1
        LIMIT 1
        `);

        stmt.bind([req.session.userId]);

        let row = null;

        if (stmt.step()) {
        row = stmt.get();
        }

        stmt.free();

        if (!row) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: 'No autenticado' });
        }

        return res.json({
        user: mapUsuario(row)
        });
    } catch (error) {
        console.error('Error al obtener sesión:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
    });

    router.get('/roles', requireAuth, async (req, res) => {
    try {
        const db = await getDb();
        const stmt = db.prepare('SELECT id, nombre FROM roles ORDER BY id ASC');
        const roles = [];
        while (stmt.step()) roles.push(stmt.getAsObject());
        stmt.free();
        return res.json(roles);
    } catch (err) {
        return res.status(500).json({ message: 'Error al obtener roles' });
    }
    });

    router.post('/logout', requireAuth, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
        return res.status(500).json({ message: 'No se pudo cerrar la sesión' });
        }

        res.clearCookie('connect.sid');
        return res.json({ message: 'Sesión cerrada' });
    });
});

module.exports = router;
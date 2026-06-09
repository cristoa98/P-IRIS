const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/', async (req, res) => {
  try {
    const { nombre, correo, mensaje } = req.body;

    if (!nombre || !nombre.trim() || !correo || !correo.trim() || !mensaje || !mensaje.trim()) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    if (!isValidEmail(correo.trim())) {
      return res.status(400).json({ message: 'El correo debe tener un formato válido' });
    }

    const db = await getDb();
    db.run(
      'INSERT INTO mensajes_contacto (nombre, email, mensaje) VALUES (?, ?, ?)',
      [nombre.trim(), correo.trim().toLowerCase(), mensaje.trim()]
    );
    saveDb(db);

    res.json({ ok: true, message: 'Mensaje enviado correctamente' });
  } catch (err) {
    console.error('Error al registrar contacto:', err);
    res.status(500).json({ message: 'Error al enviar el mensaje' });
  }
});

module.exports = router;

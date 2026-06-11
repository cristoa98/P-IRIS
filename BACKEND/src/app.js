require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { requireAuth, requireRole } = require('./middlewares/auth.middleware');

const app = express();
const frontendPath = path.join(__dirname, '../../FRONTEND');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'iris-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_DAY_MS
  }
}));

app.get('/admin.html', requireRole(['admin']), (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.get('/historial.html', requireAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'historial.html'));
});

app.get('/pago.html', requireAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'pago.html'));
});

app.get('/contenido.html', requireAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'contenido.html'));
});

app.get('/certificado.html', requireAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'certificado.html'));
});

app.use(express.static(frontendPath));

const cursosRoutes = require('./routes/cursos.routes');
app.use('/api/cursos', cursosRoutes);

const categoriasRoutes = require('./routes/categorias.routes');
app.use('/api/categorias', categoriasRoutes);

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const comprasRoutes = require('./routes/compras.routes');
app.use('/api/compras', comprasRoutes);

const usuariosRoutes = require('./routes/usuarios.routes');
app.use('/api/usuarios', usuariosRoutes);

const contactoRoutes = require('./routes/contacto.routes');
app.use('/api/contacto', contactoRoutes);

const certificadosRoutes = require('./routes/certificados.routes');
app.use('/api/certificados', certificadosRoutes);

const metricasRoutes = require('./routes/metricas.routes');
app.use('/api/metricas', metricasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`P-IRIS Backend running on http://localhost:${PORT}`);
});

module.exports = app;

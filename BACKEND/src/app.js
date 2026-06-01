require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'iris-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(__dirname + '/../../FRONTEND'));

const cursosRoutes = require('./routes/cursos.routes');
app.use('/api/cursos', cursosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`P-IRIS Backend running on http://localhost:${PORT}`);
});

module.exports = app;
# Backend - P-IRIS

## Instalación

```bash
pnpm install
pnpm start
```

## Dependencias

- express ^5.1.0
- express-session ^1.18.0
- bcryptjs ^2.4.3
- cors ^2.8.5
- dotenv ^16.4.0

## Configurar entorno

Copiar `.env.example` a `.env`

## Rutas a desarrollar

Crear archivo `routes/nombre.routes.js` y exportarlo.

Agregar en `app.js`:
```javascript
app.use('/api/modulo', require('./routes/nombre.routes'));
```

## Middlewares

```javascript
const { requireAuth, requireRole } = require('./middlewares/auth.middleware');
```

## Modelos (en memoria)

- `models/user.model.js`
- `models/curso.model.js`
- `models/compra.model.js`

Listos para reemplazar por consultas MySQL cuando se implemente la BD.
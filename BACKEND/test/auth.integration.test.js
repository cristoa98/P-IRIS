const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const initSqlJs = require('sql.js');

const PORT = 3199;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(__dirname, '../src/BD.sqlite');

let server;
let dbBackup;

function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await request('/api/categorias');
      if (response.status < 500) return;
    } catch (_) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error('Server did not start in time');
}

async function login(email, password, remember = false) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember })
  });
  const cookie = response.headers.get('set-cookie');
  return { response, cookie };
}

async function getCompraTotal(compraId) {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);
  const result = db.exec('SELECT total FROM compras WHERE id = ?', [compraId]);
  db.close();
  return result[0]?.values[0]?.[0];
}

test.before(async () => {
  dbBackup = fs.readFileSync(DB_PATH);
  server = spawn(process.execPath, ['src/app.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitForServer();
});

test.after(() => {
  if (server) server.kill();
  if (dbBackup) fs.writeFileSync(DB_PATH, dbBackup);
});

test('admin course list requires an authenticated admin user', async () => {
  const anonymous = await request('/api/cursos/admin/todos');
  assert.equal(anonymous.status, 401);

  const { response, cookie } = await login('usuario@p-iris.cl', 'usuario123');
  assert.equal(response.status, 200);

  const userResponse = await request('/api/cursos/admin/todos', {
    headers: { Cookie: cookie }
  });
  assert.equal(userResponse.status, 403);
});

test('admin html view is not served without a valid admin session', async () => {
  const response = await request('/admin.html');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login.html');
});

test('course content html view is not served without an authenticated session', async () => {
  const response = await request('/contenido.html?id=1');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login.html');
});

test('remember me creates a persistent 30 day session cookie', async () => {
  const beforeLogin = Date.now();
  const { response, cookie } = await login('usuario@p-iris.cl', 'usuario123', true);
  assert.equal(response.status, 200);
  const expires = /Expires=([^;]+)/i.exec(cookie)?.[1];
  assert.ok(expires);
  const days = (new Date(expires).getTime() - beforeLogin) / (24 * 60 * 60 * 1000);
  assert.ok(days > 29 && days <= 31);
  assert.match(cookie, /HttpOnly/i);
});

test('purchase total is calculated from stored course prices, not client payload', async () => {
  const { response, cookie } = await login('usuario@p-iris.cl', 'usuario123');
  assert.equal(response.status, 200);

  const purchase = await request('/api/compras', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      carrito: [{ id: 1, price: 0 }],
      comprador: { nombre: 'Usuario Demo', correo: 'usuario@p-iris.cl' },
      pago: {
        nombre: 'Usuario Demo',
        numero_tarjeta: '1234567812345678',
        fecha_vencimiento: '2027-05',
        cvv: '123'
      }
    })
  });

  assert.equal(purchase.status, 200);
  const data = await purchase.json();
  const total = await getCompraTotal(data.compraId);
  assert.ok(total > 0);
});

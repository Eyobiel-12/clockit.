// Start alles zonder Docker: lokale MySQL, API- en website-devservers, en de Expo-app.
// Gebruik: `npm run start:local`
import { readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const mobile = join(root, 'mobile');
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const WEB = 'http://localhost:8090';
const API = 'http://localhost:4000/api/health';

const c = { dim: '\x1b[2m', bold: '\x1b[1m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', reset: '\x1b[0m' };
const step = (msg) => console.log(`\n${c.bold}${c.yellow}▶${c.reset} ${c.bold}${msg}${c.reset}`);
const ok = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const fail = (msg) => { console.error(`\n${c.red}✖ ${msg}${c.reset}\n`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dbEnv = {
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_NAME: 'clockit',
  DB_USER: 'clockit',
  DB_PASSWORD: 'clockit',
  JWT_SECRET: 'dev-secret-verander-mij',
  COOKIE_SECURE: 'false',
  PORT: '4000',
};

const children = [];

function run(cmd, args, cwd = root, env = process.env) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin, env: { ...process.env, ...env } });
  return res.status === 0;
}

function mysql(args, input) {
  const res = spawnSync('mysql', args, {
    cwd: root,
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: isWin,
  });
  return res.status === 0 ? res.stdout?.toString() ?? '' : null;
}

function mysqlAlive() {
  return spawnSync('mysqladmin', ['ping', '-h', '127.0.0.1'], { stdio: 'ignore', shell: isWin }).status === 0;
}

async function waitFor(url, seconds) {
  for (let i = 0; i < seconds; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // nog niet bereikbaar
    }
    await sleep(1000);
  }
  return false;
}

function lanIp() {
  const all = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal);
  const pick = all.find((n) => n.address.startsWith('192.168.')) ?? all.find((n) => n.address.startsWith('10.')) ?? all[0];
  return pick?.address ?? 'localhost';
}

function spawnDetached(name, cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    detached: !isWin,
    stdio: 'ignore',
    shell: isWin,
  });
  child.unref();
  children.push({ name, child });
  return child;
}

async function ensureMysql() {
  if (mysqlAlive()) return ok('MySQL draait');

  if (isMac && spawnSync('brew', ['--version'], { stdio: 'ignore' }).status === 0) {
    console.log('MySQL starten via Homebrew…');
    spawnSync('brew', ['services', 'start', 'mysql'], { stdio: 'inherit', shell: isWin });
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      if (mysqlAlive()) return ok('MySQL draait');
    }
  }

  fail('MySQL draait niet. Installeer MySQL (bv. brew install mysql) of Docker Desktop voor npm start.');
}

function ensureDatabase() {
  if (!run('mysql', ['-u', 'root', '-e', `
CREATE DATABASE IF NOT EXISTS clockit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'clockit'@'localhost' IDENTIFIED BY 'clockit';
GRANT ALL PRIVILEGES ON clockit.* TO 'clockit'@'localhost';
FLUSH PRIVILEGES;
`])) {
    fail('Kon de clockit-database niet aanmaken. Controleer of MySQL draait en root-toegang werkt.');
  }

  const tables = mysql(['-u', 'clockit', '-pclockit', 'clockit', '-N', '-e', 'SHOW TABLES LIKE "users";']);
  if (!tables?.includes('users')) {
    console.log('Database initialiseren met demodata…');
    const schema = readFileSync(join(root, 'db/init/001_schema.sql'));
    const seed = readFileSync(join(root, 'db/init/002_seed.sql'));
    if (!mysql(['-u', 'clockit', '-pclockit', 'clockit'], schema) || !mysql(['-u', 'clockit', '-pclockit', 'clockit'], seed)) {
      fail('Kon db/init niet uitvoeren. Bekijk de MySQL-melding hierboven.');
    }
  }
  ok('Database klaar (clockit / clockit)');
}

async function ensureService(label, url, start) {
  if (await waitFor(url, 2)) {
    ok(`${label} draait al`);
    return;
  }
  start();
  if (!(await waitFor(url, 60))) fail(`${label} reageert niet op ${url}.`);
  ok(`${label} gestart`);
}

async function metroStatus(port) {
  try {
    const res = await fetch(`http://localhost:${port}/status`, { signal: AbortSignal.timeout(1500) });
    return (await res.text()).includes('packager-status:running') ? 'metro' : 'busy';
  } catch (err) {
    return err?.cause?.code === 'ECONNREFUSED' ? 'free' : 'busy';
  }
}

async function printExpoQr(port, ip) {
  const url = `exp://${ip}:${port}`;
  try {
    const QRCode = createRequire(join(mobile, 'package.json'))('qrcode');
    console.log('\n' + (await QRCode.toString(url, { type: 'terminal', small: true })));
  } catch {
    // Geen qrcode-pakket: dan alleen de link.
  }
  console.log(`  ${c.bold}${url}${c.reset}`);
  console.log(`${c.dim}  iPhone: scan met de Camera-app · Android: scan in Expo Go · telefoon op hetzelfde wifi-netwerk${c.reset}\n`);
}

for (const dir of ['frontend', 'backend', 'mobile']) {
  if (!existsSync(join(root, dir, 'node_modules'))) {
    step(`Pakketten installeren (${dir}/)`);
    if (!run('npm', ['install'], join(root, dir))) fail(`npm install in ${dir}/ is mislukt.`);
  }
}

step('1/4  MySQL controleren');
await ensureMysql();

step('2/4  Database controleren');
ensureDatabase();

step('3/4  API en website starten');
await ensureService('API', API, () => spawnDetached('api', 'npm', ['run', 'dev'], backend, dbEnv));
await ensureService('Website', WEB, () =>
  spawnDetached('web', 'npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '8090'], frontend),
);

const ip = lanIp();
console.log(`
${c.bold}Klokit draait (lokaal, zonder Docker)${c.reset}
  Website      ${WEB}
  API          http://localhost:4000/api  (telefoon: http://${ip}:4000/api)
  Database     localhost:3306  (clockit / clockit)
  Inloggen     sanne@dekade.nl / wachtwoord12
${c.dim}  Stoppen: Ctrl+C stopt Expo; "npm run stop:local" stopt API en website.${c.reset}`);

step('4/4  Expo-app starten: scan de QR-code met de camera van je iPhone (Expo Go)');

let port = Number(process.env.KLOKIT_EXPO_PORT) || 8081;
const status = await metroStatus(port);
if (status === 'metro') {
  ok(`De Expo-app draait al (poort ${port}). Scan deze QR-code:`);
  await printExpoQr(port, ip);
  process.exit(0);
}
if (status === 'busy') {
  while ((await metroStatus(port)) !== 'free' && port < 8099) port++;
  console.log(`De poort is bezet door een ander programma, Expo gebruikt poort ${port}.`);
}

const expo = spawn('npx', ['expo', 'start', '--port', String(port)], { cwd: mobile, stdio: 'inherit', shell: isWin });
expo.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => {
  expo.kill('SIGINT');
  for (const { child } of children) child.kill('SIGTERM');
});

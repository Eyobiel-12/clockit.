// Start alles in één keer: database, API en website (Docker) en daarna de Expo-app.
// Gebruik: `npm start` of `.\start` in C:\Users\serha\Develop\klolit
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'mobile');
const isWin = process.platform === 'win32';
const WEB = 'http://localhost:8090';
const API = 'http://localhost:4000/api/health';

const c = { dim: '\x1b[2m', bold: '\x1b[1m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', reset: '\x1b[0m' };
const step = (msg) => console.log(`\n${c.bold}${c.yellow}▶${c.reset} ${c.bold}${msg}${c.reset}`);
const ok = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const fail = (msg) => { console.error(`\n${c.red}✖ ${msg}${c.reset}\n`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, cwd = root) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  return res.status === 0;
}

function dockerRunning() {
  return spawnSync('docker', ['info'], { stdio: 'ignore', shell: isWin }).status === 0;
}

async function ensureDocker() {
  if (dockerRunning()) return ok('Docker draait');
  const desktop = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
  if (isWin && existsSync(desktop)) {
    console.log('Docker Desktop starten…');
    spawn(desktop, [], { detached: true, stdio: 'ignore' }).unref();
  } else {
    fail('Docker draait niet. Start Docker Desktop en probeer opnieuw.');
  }
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    if (dockerRunning()) return ok('Docker draait');
  }
  fail('Docker is na 2 minuten nog niet gestart. Open Docker Desktop zelf en probeer opnieuw.');
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

step('1/4  Docker controleren');
await ensureDocker();

step('2/4  Database, API en website starten');
if (!run('docker', ['compose', 'up', '-d', '--build'])) fail('docker compose up is mislukt (zie de melding hierboven).');

step('3/4  Wachten tot de API klaar is');
if (!(await waitFor(API, 120))) fail(`De API reageert niet op ${API}. Bekijk de logs met: docker compose logs api`);
ok('API is bereikbaar');

if (!existsSync(join(mobile, 'node_modules'))) {
  console.log('Eerste keer: pakketten voor de app installeren…');
  if (!run('npm', ['install'], mobile)) fail('npm install in mobile/ is mislukt.');
}

const ip = lanIp();
console.log(`
${c.bold}Klokit draait${c.reset}
  Website      ${WEB}
  API          http://localhost:4000/api  (telefoon: http://${ip}:4000/api)
  Database     localhost:3307  (clockit / clockit)
  Inloggen     sanne@dekade.nl / wachtwoord12
${c.dim}  Stoppen: Ctrl+C stopt de app-server; "npm run stop" stopt ook Docker.${c.reset}`);

// Website openen in de browser (overslaan met KLOKIT_NO_BROWSER=1).
if (isWin && !process.env.KLOKIT_NO_BROWSER) spawn('cmd', ['/c', 'start', '', WEB], { stdio: 'ignore', detached: true }).unref();

step('4/4  Expo-app starten: scan de QR-code met de camera van je iPhone (Expo Go)');

/** Draait er al een Expo/Metro-server op deze poort? Metro antwoordt op /status. */
async function metroStatus(port) {
  try {
    const res = await fetch(`http://localhost:${port}/status`, { signal: AbortSignal.timeout(1500) });
    return (await res.text()).includes('packager-status:running') ? 'metro' : 'busy';
  } catch (err) {
    return err?.cause?.code === 'ECONNREFUSED' ? 'free' : 'busy';
  }
}

/**
 * QR-code voor Expo Go in de terminal. Gebruikt het qrcode-pakket van de app (mobile/node_modules).
 * iPhone: scan met de Camera-app. Android: scan in Expo Go.
 */
async function printExpoQr(port) {
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

let port = Number(process.env.KLOKIT_EXPO_PORT) || 8081;
const status = await metroStatus(port);
if (status === 'metro') {
  ok(`De Expo-app draait al (poort ${port}), in een ander venster. Scan deze QR-code:`);
  await printExpoQr(port);
  console.log(`${c.dim}  Nieuwe pakketten of instellingen? Stop dat venster (Ctrl+C) en start opnieuw met npm start.${c.reset}`);
  process.exit(0);
}
if (status === 'busy') {
  while ((await metroStatus(port)) !== 'free' && port < 8099) port++;
  console.log(`De poort is bezet door een ander programma, Expo gebruikt poort ${port}.`);
}

// Expo toont zelf een QR-code als de uitvoer naar een terminal gaat. Anders (bv. uitvoer omgeleid)
// tekenen we hem zelf zodra de server klaar is.
if (!process.stdout.isTTY) {
  (async () => {
    for (let i = 0; i < 120; i++) {
      await sleep(1000);
      if ((await metroStatus(port)) === 'metro') return printExpoQr(port);
    }
  })();
}

const expo = spawn('npx', ['expo', 'start', '--port', String(port)], { cwd: mobile, stdio: 'inherit', shell: isWin });
expo.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => expo.kill('SIGINT'));

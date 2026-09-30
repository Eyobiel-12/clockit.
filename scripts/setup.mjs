// Eenmalige installatie: controleert Node en Docker en installeert de pakketten van
// de website (frontend), de API (backend) en de app (mobile). Gebruik: `npm run setup`
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const c = { bold: '\x1b[1m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', reset: '\x1b[0m' };

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error(`${c.red}✖ Node.js ${process.versions.node} is te oud. Installeer Node.js 22 (LTS) via https://nodejs.org${c.reset}`);
  process.exit(1);
}
console.log(`${c.green}✔${c.reset} Node.js ${process.versions.node}`);

if (spawnSync('docker', ['--version'], { stdio: 'ignore', shell: isWin }).status !== 0) {
  console.log(`${c.yellow}!${c.reset} Docker niet gevonden. Installeer Docker Desktop via https://www.docker.com/products/docker-desktop/ (nodig voor npm start).`);
} else {
  console.log(`${c.green}✔${c.reset} Docker geïnstalleerd`);
}

for (const [dir, label] of [['frontend', 'website'], ['backend', 'API'], ['mobile', 'app']]) {
  console.log(`\n${c.bold}${c.yellow}▶${c.reset} ${c.bold}Pakketten installeren voor de ${label} (${dir}/)${c.reset}`);
  const res = spawnSync('npm', ['install'], { cwd: join(root, dir), stdio: 'inherit', shell: isWin });
  if (res.status !== 0) {
    console.error(`${c.red}✖ npm install in ${dir}/ is mislukt. Zie de melding hierboven.${c.reset}`);
    process.exit(1);
  }
}

console.log(`\n${c.green}${c.bold}✔ Klaar!${c.reset} Open Docker Desktop en start alles met: ${c.bold}npm start${c.reset}\n`);

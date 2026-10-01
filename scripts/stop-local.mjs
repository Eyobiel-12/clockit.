// Stop lokale devservers (API, website, Expo) op vaste poorten.
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const ports = [4000, 8090, 8081];

for (const port of ports) {
  if (isWin) {
    spawnSync('powershell', ['-Command', `(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore', shell: true });
  } else {
    spawnSync('sh', ['-c', `lsof -ti :${port} | xargs kill -9 2>/dev/null || true`], { stdio: 'ignore' });
  }
}

console.log('Lokale servers gestopt (poorten 4000, 8090, 8081). MySQL blijft draaien.');

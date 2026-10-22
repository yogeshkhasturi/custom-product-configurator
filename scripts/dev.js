const { spawn, execSync } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const rootDir = path.resolve(__dirname, '..');

// Helper to kill any hanging zombie process on a given port before starting
function freePort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = out.split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== `${process.pid}`) {
            try {
              execSync(`taskkill /pid ${pid} /f /t`, { stdio: 'ignore' });
              console.log(`🧹 Cleaned up lingering process (PID ${pid}) on port ${port}`);
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {
    // Port not in use, continue cleanly
  }
}

freePort(5000);
freePort(3000);

console.log('---------------------------------------------------------');
console.log('🚀 Starting Fenchel Shades Unified Development Server');
console.log('   - Backend API:       http://localhost:5000');
console.log('   - Next.js Frontend:  http://localhost:3000');
console.log('   - ngrok Tunnel:      ngrok http 3000 (shares both frontend & backend)');
console.log('---------------------------------------------------------\n');

function runNpm(args) {
  if (isWin) {
    return spawn('cmd.exe', ['/c', 'npm', ...args], {
      cwd: rootDir,
      stdio: 'inherit',
    });
  }
  return spawn('npm', args, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

// Start Express Backend
const server = runNpm(['--prefix', 'server', 'run', 'dev']);

// Start Next.js Frontend
const client = runNpm(['--prefix', 'client', 'run', 'dev']);

function shutdown() {
  console.log('\n🛑 Shutting down dev servers...');
  if (isWin) {
    if (server.pid) {
      try { spawn('taskkill', ['/pid', server.pid, '/f', '/t']); } catch (e) {}
    }
    if (client.pid) {
      try { spawn('taskkill', ['/pid', client.pid, '/f', '/t']); } catch (e) {}
    }
  } else {
    try { server.kill('SIGINT'); } catch (e) {}
    try { client.kill('SIGINT'); } catch (e) {}
  }
  process.exit(0);
}

server.on('error', (err) => console.error('Server error:', err));
client.on('error', (err) => console.error('Client error:', err));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌟 Starting AI-Based Assignment Validation 2.0 System...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Server
const server = spawn('node', ['server/index.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// 2. Start Client (Vite)
const client = spawn(npmCmd, ['run', 'dev', '--prefix', 'client'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n🛑 Shutting down development servers...');
  server.kill();
  client.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const viteEntry = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const serverEntry = join(projectRoot, 'server', 'index.js');
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env.local', '--watch', '--watch-preserve-output', serverEntry], { cwd: projectRoot, stdio: 'inherit' }),
  spawn(process.execPath, [viteEntry], { cwd: projectRoot, stdio: 'inherit' })
];

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
};

children.forEach((child) => child.on('error', (error) => {
  console.error(`開發程序無法啟動：${error.message}`);
  process.exitCode = 1;
  stop();
}));

children.forEach((child) => child.on('exit', (code, signal) => {
  if (!stopping && code !== 0 && signal == null) process.exitCode = code || 1;
  if (!stopping) stop();
}));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

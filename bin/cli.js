#!/usr/bin/env node
import { fork, exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '../server/index.js');

console.log('\x1b[36m%s\x1b[0m', '📡 Запуск локального диагностического агента "Сетевой Радар"...');

// Start Express server in a child process
const serverProcess = fork(serverPath, [], {
  env: { ...process.env, PORT: 3001 }
});

// Wait 1.5 seconds for Express to bind to port, then open the browser
setTimeout(() => {
  const url = 'http://localhost:3001';
  console.log('\x1b[32m%s\x1b[0m', `🚀 Сетевой Радар запущен!`);
  console.log(`Пожалуйста, откройте в браузере: \x1b[4m${url}\x1b[0m`);

  // Detect OS and run appropriate browser launch command
  let command;
  if (process.platform === 'darwin') {
    command = `open "${url}"`;
  } else if (process.platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.log('\x1b[33m%s\x1b[0m', '⚠️  Не удалось автоматически открыть браузер. Пожалуйста, откройте ссылку вручную.');
    }
  });
}, 1500);

// Ensure the child process is terminated when the CLI wrapper is killed
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  serverProcess.kill();
  process.exit();
});

process.on('exit', () => {
  serverProcess.kill();
});

const path = require('node:path');
const { spawn } = require('node:child_process');
const { server, port } = require('./serve-site.cjs');

server.listen(port, '127.0.0.1', () => {
  const cli = path.resolve(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js');
  const runner = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  runner.on('error', error => {
    console.error(error);
    server.close();
    process.exitCode = 1;
  });
  runner.on('exit', (code, signal) => {
    server.closeAllConnections();
    server.close();
    process.exitCode = code ?? (signal ? 1 : 0);
  });
});

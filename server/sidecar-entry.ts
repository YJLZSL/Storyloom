/**
 * Storyloom Sidecar Entry Point
 *
 * Tauri sidecar 专用入口。由 Rust 父进程通过 `Command::new_sidecar` 启动。
 *
 * 环境变量（由 Rust 父进程传入）：
 *   DATA_DIR         – 绝对路径，数据目录
 *   MIGRATIONS_DIR   – 绝对路径，drizzle 迁移目录
 *   NODE_ENV         – 'production' | 'development'
 *   SERVER_PORT      – 可选，指定绑定端口
 *
 * 输出：
 *   stdout – 仅输出一行 JSON：{"type":"ready","port":3001}
 *   stderr – 日志与诊断信息
 */

import net from 'net';
import path from 'path';
import fs from 'fs';

// ── 1. 默认值（Rust 父进程传入的值会覆盖这些） ──
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.STORYLOOM_SIDECAR = '1';

const DEFAULT_PORT = 3001;
const MAX_PORT = 3050;
const PORT_HOST = '127.0.0.1';

// ── 2. 日志重定向到 DATA_DIR/app.log ──
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const logPath = path.join(dataDir, 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);

process.stdout.write = function (chunk: string | Buffer, encoding?: BufferEncoding, cb?: (err?: Error | null) => void): boolean {
  const result = origStdoutWrite(chunk, encoding, cb);
  if (encoding) {
    logStream.write(chunk, encoding);
  } else {
    logStream.write(chunk);
  }
  return result;
} as NodeJS.WriteStream['write'];

process.stderr.write = function (chunk: string | Buffer, encoding?: BufferEncoding, cb?: (err?: Error | null) => void): boolean {
  const result = origStderrWrite(chunk, encoding, cb);
  if (encoding) {
    logStream.write(chunk, encoding);
  } else {
    logStream.write(chunk);
  }
  return result;
} as NodeJS.WriteStream['write'];

function log(level: string, msg: string) {
  process.stderr.write(`[sidecar][${level}] ${msg}\n`);
}

// ── 3. 端口发现 ──
function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err: NodeJS.ErrnoException) => {
      resolve(err.code !== 'EADDRINUSE');
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, host);
  });
}

async function findAvailablePort(): Promise<number> {
  const startPort = process.env.SERVER_PORT
    ? parseInt(process.env.SERVER_PORT, 10)
    : DEFAULT_PORT;
  const endPort = Math.max(startPort, MAX_PORT);
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port, PORT_HOST)) {
      return port;
    }
  }
  throw new Error(`No available port found between ${startPort} and ${endPort}`);
}

// ── 4. 主流程 ──
async function main() {
  log('INFO', 'Storyloom sidecar starting...');
  log('INFO', `DATA_DIR: ${dataDir}`);
  log('INFO', `MIGRATIONS_DIR: ${process.env.MIGRATIONS_DIR || '(not set)'}`);
  log('INFO', `NODE_ENV: ${process.env.NODE_ENV}`);

  const port = await findAvailablePort();
  log('INFO', `Selected port: ${port}`);

  // 动态导入，确保 env 变量已设置
  const { startServer } = await import('./index.js');
  await startServer(port);

  // 向 Rust 父进程发送就绪信号（stdout 唯一用途）
  const readyMessage = JSON.stringify({ type: 'ready', port });
  origStdoutWrite(readyMessage + '\n');

  log('INFO', `Server ready on port ${port}`);

  // 保持进程存活；startServer 内部已注册 SIGTERM/SIGINT 优雅关闭
}

main().catch((err) => {
  log('FATAL', String(err));
  process.exit(1);
});

#!/usr/bin/env node
// 零依赖本地静态服务器 —— 只为了让"双击打开"之外的 HTTP 形态也能验一遍
// （GitHub Pages 就是纯静态托管，本地用这个先把 Pages 的路径行为跑通）。
//
//   node tools/serve.js                 # http://127.0.0.1:5173/
//   node tools/serve.js 8080            # 指定端口
//   PORT=8080 node tools/serve.js       # 同上（Linux/macOS）；PowerShell: $env:PORT=8080
//   npm start
//
// 只监听 127.0.0.1，不对外暴露；不写日志到磁盘；不做任何目录列表。
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || process.argv[2] || 5173);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, headers) {
  const h = Object.assign({ 'Cache-Control': 'no-store' }, headers || {});
  res.writeHead(status, h);
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'Bad Request\n', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  // 路径穿越防护：解析后必须仍在 ROOT 之内
  const target = path.resolve(ROOT, '.' + urlPath);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden\n', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  const log = (status) => console.log(String(status) + '  ' + req.method + '  ' + urlPath);

  fs.stat(target, (err, st) => {
    if (err) { log(404); return send(res, 404, 'Not Found: ' + urlPath + '\n', { 'Content-Type': 'text/plain; charset=utf-8' }); }

    // 目录 → index.html（GitHub Pages 的默认行为）
    if (st.isDirectory()) {
      const index = path.join(target, 'index.html');
      return fs.stat(index, (e2, st2) => {
        if (e2 || !st2.isFile()) { log(403); return send(res, 403, 'Directory listing is disabled.\n', { 'Content-Type': 'text/plain; charset=utf-8' }); }
        serveFile(index, st2);
      });
    }
    serveFile(target, st);
  });

  function serveFile(file, st) {
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') { res.end(); log(200); return; }
    const stream = fs.createReadStream(file);
    stream.on('error', () => { res.destroy(); });
    stream.on('end', () => log(200));
    stream.pipe(res);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('端口 ' + PORT + ' 已被占用，换一个：node tools/serve.js 8080');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log('交火 · 本地预览   http://' + HOST + ':' + PORT + '/');
  console.log('  根目录: ' + ROOT);
  console.log('  入口:   /index.html  ·  /game/hub.html  ·  /game/breach.html  ·  /game/street.html');
  console.log('  Ctrl+C 停止');
});

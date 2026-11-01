const fs = require('fs');
const ROOT = 'W:/AI Code DSH/';
const target = process.argv[2];
const styleSrc = process.argv[3];
const bodySrc = process.argv[4];
const marks = process.argv.slice(5); // expected trimmed lines, 1-based line numbers given as "N:text"

const raw = fs.readFileSync(target, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

const pairs = [];
for (const m of marks) {
  const i = m.indexOf(':');
  pairs.push([parseInt(m.slice(0, i), 10), m.slice(i + 1)]);
}
for (const [n, expect] of pairs) {
  const got = lines[n - 1].trim();
  if (got !== expect.trim()) throw new Error(`line ${n}: expected "${expect}", got "${got}"`);
}
const sliceOf = f => fs.readFileSync(f, 'utf8').replace(/(\r?\n)+$/, '').split(/\r?\n/);

if (styleSrc !== '-' || bodySrc !== '-') {
  // simple two-range splice: [styleStart..styleEnd] replaced, [bodyStart..bodyEnd] replaced
  const styleStart = pairs[0][0], styleEnd = pairs[1][0];
  const bodyStart = pairs[2][0], bodyEnd = pairs[3][0];
  const css = sliceOf(styleSrc);
  const body = sliceOf(bodySrc);
  const out = [
    ...lines.slice(0, styleStart - 1),
    ...css,
    ...lines.slice(styleEnd),
  ];
  // recompute body positions after style replacement
  const shift = css.length - (styleEnd - styleStart + 1);
  const bs = bodyStart - 1 + shift;
  const be = bodyEnd - 1 + shift;
  const out2 = [...out.slice(0, bs), ...body, ...out.slice(be + 1)];
  fs.writeFileSync(target, out2.join(eol));
  console.log(`ok ${target}: ${lines.length} -> ${out2.length} lines (eol=${eol === '\r\n' ? 'CRLF' : 'LF'})`);
}

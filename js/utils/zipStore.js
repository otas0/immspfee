/**
 * 无压缩 ZIP（store），浏览器端课堂包导出，零依赖。
 */

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u16(n) {
  const b = new Uint8Array(2);
  b[0] = n & 255; b[1] = (n >>> 8) & 255;
  return b;
}
function u32(n) {
  const b = new Uint8Array(4);
  b[0] = n & 255; b[1] = (n >>> 8) & 255; b[2] = (n >>> 16) & 255; b[3] = (n >>> 24) & 255;
  return b;
}

function concat(chunks) {
  const n = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * @param {{ name: string, data: string|Uint8Array }[]} files
 * @returns {Blob}
 */
export function buildZipStore(files) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    let data;
    if (typeof f.data === 'string') data = enc.encode(f.data);
    else if (f.data instanceof Uint8Array) data = f.data;
    else data = new Uint8Array(f.data || []);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
      name, data,
    ]);
    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralDir.length), u32(offset), u16(0),
  ]);
  return new Blob([concat([...locals, centralDir, end])], { type: 'application/zip' });
}

/** 解析 store-only ZIP（导入课堂包） */
export async function readZipStore(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const files = [];
  let i = 0;
  while (i + 30 <= buf.length) {
    const sig = view.getUint32(i, true);
    if (sig !== 0x04034b50) break;
    const method = view.getUint16(i + 8, true);
    const comp = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const name = new TextDecoder().decode(buf.subarray(i + 30, i + 30 + nameLen));
    const start = i + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + comp);
    if (method !== 0) throw new Error(`unsupported zip method ${method} for ${name}`);
    files.push({ name, data: new TextDecoder().decode(data) });
    i = start + comp;
  }
  return files;
}

/**
 * 只含四则、幂、比较和白名单函数的表达式。
 * 给主题方程表用，不执行任意代码。
 */

const CONST = {
  pi: Math.PI,
  g: 9.81,
  qe: 1.602176634e-19,
  kC: 8.9875517923e9,
  hP: 6.62607015e-34,
  hbar: 1.054571817e-34,
  c0: 2.99792458e8,
  Rgas: 8.314462618,
  kB: 1.380649e-23,
  eps0: 8.8541878128e-12,
  mu0: 1.25663706212e-6,
  sigmaSB: 5.670374419e-8,
  Ggrav: 6.6743e-11,
  NA: 6.02214076e23,
  ln2: Math.LN2,
};

const FUN = {
  sqrt: (a) => Math.sqrt(Math.max(0, a)),
  ln: (a) => Math.log(Math.max(1e-12, a)),
  log2: (a) => Math.log2(Math.max(1e-12, a)),
  log10: (a) => Math.log10(Math.max(1e-12, a)),
  exp: (a) => {
    if (!Number.isFinite(a)) return NaN;
    if (a > 709.78) return Number.MAX_VALUE;
    if (a < -745) return 0;
    return Math.exp(a);
  },
  tanh: (a) => Math.tanh(a),
  sin: (a) => Math.sin(a),
  cos: (a) => Math.cos(a),
  tan: (a) => Math.tan(a),
  asin: (a) => Math.asin(Math.max(-1, Math.min(1, a))),
  acos: (a) => Math.acos(Math.max(-1, Math.min(1, a))),
  atan: (a) => Math.atan(a),
  abs: (a) => Math.abs(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
  step: (a) => (a >= 0.5 ? 1 : 0),
  ge: (a, b) => (a >= b ? 1 : 0),
  le: (a, b) => (a <= b ? 1 : 0),
  and2: (a, b) => ((a >= 0.5 ? 1 : 0) & (b >= 0.5 ? 1 : 0)),
  or2: (a, b) => ((a >= 0.5 ? 1 : 0) | (b >= 0.5 ? 1 : 0)),
  xor2: (a, b) => (a >= 0.5 ? 1 : 0) ^ (b >= 0.5 ? 1 : 0),
  nand2: (a, b) => 1 - ((a >= 0.5 ? 1 : 0) & (b >= 0.5 ? 1 : 0)),
  nor2: (a, b) => 1 - ((a >= 0.5 ? 1 : 0) | (b >= 0.5 ? 1 : 0)),
  xnor2: (a, b) => ((a >= 0.5 ? 1 : 0) === (b >= 0.5 ? 1 : 0) ? 1 : 0),
  not1: (a) => (a >= 0.5 ? 0 : 1),
  mod: (a, b) => {
    const m = Math.abs(b) < 1e-9 ? 1 : b;
    return ((a % m) + m) % m;
  },
};

function tokenize(src) {
  const s = String(src).replace(/\s+/g, '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if ('+-*/^(),'.includes(c)) {
      out.push({ t: c });
      i += 1;
      continue;
    }
    if (c === '>' || c === '<' || c === '=') {
      const two = s.slice(i, i + 2);
      if (two === '>=' || two === '<=' || two === '==') {
        out.push({ t: two });
        i += 2;
        continue;
      }
      out.push({ t: c });
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.eE+-]/.test(s[j])) {
        if ((s[j] === '+' || s[j] === '-') && s[j - 1] !== 'e' && s[j - 1] !== 'E') break;
        j += 1;
      }
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`bad number ${s.slice(i, j)}`);
      out.push({ t: 'n', v: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j += 1;
      out.push({ t: 'id', v: s.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`bad token at ${i}: ${s[i]}`);
  }
  return out;
}

function parse(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const eat = (t) => {
    if (!peek() || peek().t !== t) throw new Error(`expected ${t}`);
    i += 1;
  };
  function primary() {
    const tok = peek();
    if (!tok) throw new Error('eof');
    if (tok.t === 'n') {
      i += 1;
      return tok.v;
    }
    if (tok.t === 'id') {
      i += 1;
      if (peek() && peek().t === '(') {
        eat('(');
        const args = [];
        if (!peek() || peek().t !== ')') {
          args.push(expr());
          while (peek() && peek().t === ',') {
            eat(',');
            args.push(expr());
          }
        }
        eat(')');
        return { f: tok.v, args };
      }
      return { id: tok.v };
    }
    if (tok.t === '(') {
      eat('(');
      const v = expr();
      eat(')');
      return v;
    }
    throw new Error(`primary ${tok.t}`);
  }
  function unary() {
    if (peek() && peek().t === '-') {
      eat('-');
      return { op: 'neg', a: unary() };
    }
    return power();
  }
  function power() {
    let left = primary();
    if (peek() && peek().t === '^') {
      eat('^');
      left = { op: '^', a: left, b: unary() };
    }
    return left;
  }
  function mul() {
    let left = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = peek().t;
      i += 1;
      left = { op, a: left, b: unary() };
    }
    return left;
  }
  function add() {
    let left = mul();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = peek().t;
      i += 1;
      left = { op, a: left, b: mul() };
    }
    return left;
  }
  function expr() {
    let left = add();
    while (peek() && ['>', '<', '>=', '<=', '=='].includes(peek().t)) {
      const op = peek().t;
      i += 1;
      left = { op, a: left, b: add() };
    }
    return left;
  }
  const tree = expr();
  if (i !== tokens.length) throw new Error('trailing');
  return tree;
}

function evalTree(node, env) {
  if (typeof node === 'number') return node;
  if (node.id) {
    if (!Object.prototype.hasOwnProperty.call(env, node.id)) throw new Error(`unknown ${node.id}`);
    return Number(env[node.id]);
  }
  if (node.f) {
    const fn = FUN[node.f];
    if (!fn) throw new Error(`fn ${node.f}`);
    return fn(...node.args.map((a) => evalTree(a, env)));
  }
  const a = evalTree(node.a, env);
  if (node.op === 'neg') return -a;
  const b = evalTree(node.b, env);
  switch (node.op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / (Math.abs(b) < 1e-12 ? (b < 0 ? -1e-12 : 1e-12) : b);
    case '^': return a ** b;
    case '>': return a > b ? 1 : 0;
    case '<': return a < b ? 1 : 0;
    case '>=': return a >= b ? 1 : 0;
    case '<=': return a <= b ? 1 : 0;
    case '==': return Math.abs(a - b) < 1e-9 ? 1 : 0;
    default: throw new Error(node.op);
  }
}

const cache = new Map();

export function evalExpr(src, env) {
  let tree = cache.get(src);
  if (!tree) {
    tree = parse(tokenize(src));
    cache.set(src, tree);
  }
  return evalTree(tree, { ...CONST, ...env });
}

export function parseParamLine(line) {
  const params = {};
  const schema = {};
  if (!line || !String(line).trim()) return { params, schema };
  for (const part of String(line).split(',')) {
    const [id, rest] = part.split('=');
    const bits = rest.split(':');
    const def = Number(bits[0]);
    const min = Number(bits[1]);
    const max = Number(bits[2]);
    const unit = bits.slice(3).join(':') || '—';
    params[id] = def;
    schema[id] = { label: id, group: 'dynamics', unit, min, max };
  }
  return { params, schema };
}

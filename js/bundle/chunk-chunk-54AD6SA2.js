// js/lab/expr.js
var CONST = {
  pi: Math.PI,
  g: 9.81,
  qe: 1602176634e-28,
  kC: 89875517923e-1,
  hP: 662607015e-42,
  hbar: 1054571817e-43,
  c0: 299792458,
  Rgas: 8.314462618,
  kB: 1380649e-29,
  eps0: 88541878128e-22,
  mu0: 125663706212e-17,
  sigmaSB: 5670374419e-17,
  Ggrav: 66743e-15,
  NA: 602214076e15,
  ln2: Math.LN2
};
var FUN = {
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
  step: (a) => a >= 0.5 ? 1 : 0,
  ge: (a, b) => a >= b ? 1 : 0,
  le: (a, b) => a <= b ? 1 : 0,
  and2: (a, b) => (a >= 0.5 ? 1 : 0) & (b >= 0.5 ? 1 : 0),
  or2: (a, b) => (a >= 0.5 ? 1 : 0) | (b >= 0.5 ? 1 : 0),
  xor2: (a, b) => (a >= 0.5 ? 1 : 0) ^ (b >= 0.5 ? 1 : 0),
  nand2: (a, b) => 1 - ((a >= 0.5 ? 1 : 0) & (b >= 0.5 ? 1 : 0)),
  nor2: (a, b) => 1 - ((a >= 0.5 ? 1 : 0) | (b >= 0.5 ? 1 : 0)),
  xnor2: (a, b) => (a >= 0.5 ? 1 : 0) === (b >= 0.5 ? 1 : 0) ? 1 : 0,
  not1: (a) => a >= 0.5 ? 0 : 1,
  mod: (a, b) => {
    const m = Math.abs(b) < 1e-9 ? 1 : b;
    return (a % m + m) % m;
  }
};
function tokenize(src) {
  const s = String(src).replace(/\s+/g, "");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if ("+-*/^(),".includes(c)) {
      out.push({ t: c });
      i += 1;
      continue;
    }
    if (c === ">" || c === "<" || c === "=") {
      const two = s.slice(i, i + 2);
      if (two === ">=" || two === "<=" || two === "==") {
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
        if ((s[j] === "+" || s[j] === "-") && s[j - 1] !== "e" && s[j - 1] !== "E") break;
        j += 1;
      }
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`bad number ${s.slice(i, j)}`);
      out.push({ t: "n", v: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j += 1;
      out.push({ t: "id", v: s.slice(i, j) });
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
    if (!tok) throw new Error("eof");
    if (tok.t === "n") {
      i += 1;
      return tok.v;
    }
    if (tok.t === "id") {
      i += 1;
      if (peek() && peek().t === "(") {
        eat("(");
        const args = [];
        if (!peek() || peek().t !== ")") {
          args.push(expr());
          while (peek() && peek().t === ",") {
            eat(",");
            args.push(expr());
          }
        }
        eat(")");
        return { f: tok.v, args };
      }
      return { id: tok.v };
    }
    if (tok.t === "(") {
      eat("(");
      const v = expr();
      eat(")");
      return v;
    }
    throw new Error(`primary ${tok.t}`);
  }
  function unary() {
    if (peek() && peek().t === "-") {
      eat("-");
      return { op: "neg", a: unary() };
    }
    return power();
  }
  function power() {
    let left = primary();
    if (peek() && peek().t === "^") {
      eat("^");
      left = { op: "^", a: left, b: unary() };
    }
    return left;
  }
  function mul() {
    let left = unary();
    while (peek() && (peek().t === "*" || peek().t === "/")) {
      const op = peek().t;
      i += 1;
      left = { op, a: left, b: unary() };
    }
    return left;
  }
  function add() {
    let left = mul();
    while (peek() && (peek().t === "+" || peek().t === "-")) {
      const op = peek().t;
      i += 1;
      left = { op, a: left, b: mul() };
    }
    return left;
  }
  function expr() {
    let left = add();
    while (peek() && [">", "<", ">=", "<=", "=="].includes(peek().t)) {
      const op = peek().t;
      i += 1;
      left = { op, a: left, b: add() };
    }
    return left;
  }
  const tree = expr();
  if (i !== tokens.length) throw new Error("trailing");
  return tree;
}
function evalTree(node, env) {
  if (typeof node === "number") return node;
  if (node.id) {
    if (!Object.prototype.hasOwnProperty.call(env, node.id)) throw new Error(`unknown ${node.id}`);
    return Number(env[node.id]);
  }
  if (node.f) {
    const fn = FUN[node.f];
    if (!fn) throw new Error(`fn ${node.f}`);
    return fn(...node.args.map((a2) => evalTree(a2, env)));
  }
  const a = evalTree(node.a, env);
  if (node.op === "neg") return -a;
  const b = evalTree(node.b, env);
  switch (node.op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / (Math.abs(b) < 1e-12 ? b < 0 ? -1e-12 : 1e-12 : b);
    case "^":
      return a ** b;
    case ">":
      return a > b ? 1 : 0;
    case "<":
      return a < b ? 1 : 0;
    case ">=":
      return a >= b ? 1 : 0;
    case "<=":
      return a <= b ? 1 : 0;
    case "==":
      return Math.abs(a - b) < 1e-9 ? 1 : 0;
    default:
      throw new Error(node.op);
  }
}
var cache = /* @__PURE__ */ new Map();
function evalExpr(src, env) {
  let tree = cache.get(src);
  if (!tree) {
    tree = parse(tokenize(src));
    cache.set(src, tree);
  }
  return evalTree(tree, { ...CONST, ...env });
}
function parseParamLine(line) {
  const params = {};
  const schema = {};
  if (!line || !String(line).trim()) return { params, schema };
  for (const part of String(line).split(",")) {
    const [id, rest] = part.split("=");
    const bits = rest.split(":");
    const def = Number(bits[0]);
    const min = Number(bits[1]);
    const max = Number(bits[2]);
    const unit = bits.slice(3).join(":") || "\u2014";
    params[id] = def;
    schema[id] = { label: id, group: "dynamics", unit, min, max };
  }
  return { params, schema };
}

// js/lab/rows/mech.js
var r = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var MECH = [
  r("\u78B0\u649E\xB7\u4E8C\u7EF4\u659C\u78B0", "\u6CD5\u5411\u7528\u6062\u590D\u7CFB\u6570\uFF0C\u5207\u5411\u901F\u5EA6\u4E0D\u53D8", "Hibbeler, Dynamics, \u659C\u78B0", "\u5149\u6ED1\u63A5\u89E6\u9762\uFF0C\u53EA\u6539\u6CD5\u5411\u5206\u91CF", "un=3:-20:20:m/s,ut=2:-20:20:m/s,e=0.8:0:1:\u2014", "-e*un", "v_n", "m/s", "engineering"),
  r("\u78B0\u649E\xB7\u5C0F\u7403\u649E\u5899", "\u649E\u56FA\u5B9A\u5899\uFF1Av\u2032=\u2212e v", "Hibbeler, Dynamics, \u5BF9\u56FA\u5B9A\u9762\u7684\u6062\u590D\u7CFB\u6570", "\u5899\u8D28\u91CF\u89C6\u4E3A\u65E0\u7A77", "v=5:-20:20:m/s,e=0.9:0:1:\u2014", "-e*v", "v\u2032", "m/s", "engineering"),
  r("\u78B0\u649E\xB7\u591A\u7403\u78B0\u649E", "\u7B49\u8D28\u91CF\u5F39\u6027\u4E00\u5217\uFF1A\u672B\u7AEF\u7403\u901F\u5EA6\u7B49\u4E8E\u5165\u5C04\u901F\u5EA6", "Halliday, \u725B\u987F\u6446\u5728\u4E00\u7EF4\u5F39\u6027\u6781\u9650", "\u7403\u8D28\u91CF\u76F8\u7B49\u3001e=1\u3001\u540C\u65F6\u53EA\u4F20\u4E00\u5BF9\u63A5\u89E6", "u=3:-10:10:m/s", "u", "v_end", "m/s", "principle"),
  r("\u78B0\u649E\xB7\u52A8\u91CF\u5B88\u6052", "p=m1 u1+m2 u2", "\u52A8\u91CF\u5B88\u6052\uFF0C\u5B64\u7ACB\u7CFB", "\u78B0\u649E\u524D\u540E\u5916\u529B\u51B2\u91CF\u53EF\u5FFD\u7565", "m1=2:0.1:20:kg,m2=1:0.1:20:kg,u1=4:-20:20:m/s,u2=-1:-20:20:m/s", "m1*u1+m2*u2", "p", "kg\xB7m/s", "engineering"),
  r("\u78B0\u649E\xB7\u6062\u590D\u7CFB\u6570", "e=(v2\u2212v1)/(u1\u2212u2)", "\u6062\u590D\u7CFB\u6570\u5B9A\u4E49", "u1\u2260u2\uFF0C\u4E00\u7EF4\u5BF9\u5FC3", "v2=2:-20:20:m/s,v1=-1:-20:20:m/s,u1=4:-20:20:m/s,u2=0:-20:20:m/s", "(v2-v1)/(u1-u2)", "e", "\u2014", "engineering"),
  r("\u78B0\u649E\xB7\u78B0\u649E\u51B2\u91CF", "J=m1(v1\u2212u1)\uFF0Cv1 \u7531 e \u516C\u5F0F\u7ED9\u51FA", "\u51B2\u91CF\u2013\u52A8\u91CF\u5B9A\u7406", "\u4E00\u7EF4\uFF0Ce \u7ED9\u5B9A", "m1=2:0.1:20:kg,m2=1:0.1:20:kg,u1=4:-20:20:m/s,u2=0:-20:20:m/s,e=0.6:0:1:\u2014", "m1*((((m1-e*m2)*u1+(1+e)*m2*u2)/(m1+m2))-u1)", "J", "N\xB7s", "engineering"),
  r("\u78B0\u649E\xB7\u7206\u70B8\u53CD\u51B2", "\u521D\u59CB\u9759\u6B62\uFF1Am1 v1+m2 v2=0", "\u52A8\u91CF\u5B88\u6052", "\u7206\u70B8\u524D\u9759\u6B62\uFF0C\u5FFD\u7565\u5916\u529B\uFF1B\u4E0D\u662F\u70B8\u836F\u914D\u65B9", "m1=2:0.1:20:kg,m2=1:0.1:20:kg,v2=4:-20:20:m/s", "-m2*v2/m1", "v1", "m/s", "engineering"),
  r("\u521A\u4F53\xB7\u5B9A\u8F74\u8F6C\u52A8", "\u03B8=\u03C90 t+\xBD \u03B1 t\xB2", "Hibbeler, Dynamics, \u5B9A\u8F74\u8F6C\u52A8", "\u8F6C\u8F74\u56FA\u5B9A\u3001\u03B1 \u5E38\u91CF", "w0=0:-20:20:rad/s,alpha=2:-10:10:rad/s2", "w0*t+0.5*alpha*t*t", "\u03B8", "rad", "engineering"),
  r("\u521A\u4F53\xB7\u521A\u4F53\u5E73\u9762\u8FD0\u52A8", "a_G \u4E0E \u03B1 \u7531 \u03A3F=m a_G\u3001\u03A3M_G=I_G \u03B1", "Hibbeler, \u5E73\u9762\u8FD0\u52A8", "\u5E73\u9762\u8FD0\u52A8\uFF0C\u6B64\u5904\u7ED9\u51FA\u7EAF\u6EDA\u52A8 a=\u03B1 R", "a=2:0:20:m/s2,R=0.2:0.05:1:m", "a/R", "\u03B1", "rad/s\xB2", "engineering"),
  r("\u521A\u4F53\xB7\u9640\u87BA", "\u8FDB\u52A8 \u03A9=M/(I \u03C9)", "Goldstein, \u5FEB\u901F\u9640\u87BA\u7A33\u6001\u8FDB\u52A8", "\u03C9 \u5F88\u5927\u3001\u7AE0\u52A8\u53EF\u5FFD\u7565", "M=0.2:0:5:N\xB7m,I=0.01:0.001:0.2:kg\xB7m2,w=40:5:200:rad/s", "M/(I*w)", "\u03A9", "rad/s", "principle"),
  r("\u521A\u4F53\xB7\u6B27\u62C9\u65B9\u7A0B", "\u03C4=I \u03B1\uFF08\u4E3B\u8F74\u3001\u03C9 \u6CBF\u4E3B\u8F74\uFF09", "Hibbeler, \u4E3B\u8F74\u6B27\u62C9\u65B9\u7A0B\u7684\u7B80\u5316", "\u89D2\u901F\u5EA6\u6CBF\u60EF\u91CF\u4E3B\u8F74\uFF0C\u5FFD\u7565 \u03C9\xD7I\u03C9", "I=0.02:0.001:1:kg\xB7m2,tau=0.1:0:5:N\xB7m", "tau/I", "\u03B1", "rad/s\xB2", "principle"),
  r("\u521A\u4F53\xB7\u89D2\u52A8\u91CF\u5B88\u6052", "I1 \u03C91=I2 \u03C92", "\u89D2\u52A8\u91CF\u5B88\u6052", "\u5916\u529B\u77E9\u4E3A\u96F6", "I1=0.05:0.001:1:kg\xB7m2,w1=4:0:40:rad/s,I2=0.02:0.001:1:kg\xB7m2", "I1*w1/I2", "\u03C92", "rad/s", "engineering"),
  r("\u521A\u4F53\xB7\u8F6C\u52A8\u60EF\u91CF", "\u7EC6\u6746\u7ED5\u7AEF\u70B9 I=(1/3) M L\xB2", "Hibbeler, \u8F6C\u52A8\u60EF\u91CF\u8868", "\u5747\u5300\u7EC6\u6746\u3001\u8F74\u5782\u76F4\u4E8E\u6746", "M=1:0.1:20:kg,L=0.8:0.1:3:m", "(1/3)*M*L*L", "I", "kg\xB7m\xB2", "engineering"),
  r("\u521A\u4F53\xB7\u521A\u4F53\u78B0\u649E", "\u5B9A\u8F74\u78B0\u649E\uFF1A\u6062\u590D\u7CFB\u6570\u4E0E\u89D2\u51B2\u91CF I(\u03C9\u2032\u2212\u03C9)=J d", "Hibbeler, \u504F\u5FC3\u78B0\u649E", "\u8F6C\u8F74\u56FA\u5B9A\uFF0C\u51B2\u91CF\u81C2 d", "I=0.05:0.001:1:kg\xB7m2,w=2:-20:20:rad/s,e=0.5:0:1:\u2014,d=0.2:0.01:1:m,m=0.5:0.05:5:kg,u=3:-10:10:m/s", "-(e*u)/(d)", "\u03C9\u2032\u793A\u610F", "rad/s", "principle"),
  r("\u632F\u52A8\xB7\u7B80\u8C10\u632F\u52A8", "x=A cos(\u03C9 t+\u03C6)", "Thornton & Marion, \u7B80\u8C10\u8FD0\u52A8", "\u65E0\u963B\u5C3C\u3001\u5E38 \u03C9", "A=1:0:3:m,w=2:0.2:8:rad/s,phi=0:-3.14:3.14:rad", "A*cos(w*t+phi)", "x", "m", "engineering"),
  r("\u632F\u52A8\xB7\u5F39\u7C27\u632F\u5B50", "\u03C9=\u221A(k/m)", "\u80E1\u514B\u5B9A\u5F8B\u7B80\u8C10\u632F\u5B50", "\u7EBF\u6027\u5F39\u7C27\u3001\u65E0\u963B\u5C3C", "k=16:0.1:200:N/m,m=1:0.05:10:kg", "sqrt(k/m)", "\u03C9", "rad/s", "engineering"),
  r("\u632F\u52A8\xB7\u626D\u6446", "\u03C9=\u221A(\u03BA/I)", "\u626D\u6446\u89D2\u9891\u7387", "\u7EBF\u6027\u6062\u590D\u529B\u77E9 \u2212\u03BA \u03B8", "kappa=0.4:0.01:5:N\xB7m/rad,I=0.02:0.001:0.5:kg\xB7m2", "sqrt(kappa/I)", "\u03C9", "rad/s", "engineering"),
  r("\u632F\u52A8\xB7\u8026\u5408\u632F\u5B50", "\u03C9\xB1=\u221A(k/m) \u4E0E \u221A((k+2\u03BA)/m)", "\u5BF9\u79F0/\u53CD\u5BF9\u79F0\u6A21", "\u4E24\u7B49\u8D28\u91CF\u3001\u6700\u8FD1\u90BB\u5F39\u7C27", "k=8:0.1:40:N/m,kappa=2:0:20:N/m,m=1:0.05:5:kg", "sqrt((k+2*kappa)/m)", "\u03C9+", "rad/s", "engineering"),
  r("\u632F\u52A8\xB7\u975E\u7EBF\u6027\u632F\u52A8", "\u8F6F\u5F39\u7C27\uFF1A\u03C9\xB2=k/m+\u03B2 A\xB2\uFF08\u4E00\u9636\uFF09", "Nayfeh, \u5F31\u975E\u7EBF\u6027\u9891\u7387\u4FEE\u6B63", "\u03B2 A\xB2 \u8FDC\u5C0F\u4E8E k/m", "k=8:0.1:40:N/m,m=1:0.05:5:kg,beta=0.4:-2:2:N/m3,A=0.3:0:1:m", "sqrt(max(0.01,k/m+beta*A*A))", "\u03C9", "rad/s", "principle"),
  r("\u6CE2\xB7\u6A2A\u6CE2", "y=A sin(kx\u2212\u03C9 t)", "\u884C\u6CE2\uFF0C\u6A2A\u6CE2\u4F4D\u79FB\u5782\u76F4\u4E8E\u4F20\u64AD\u65B9\u5411", "\u65E0\u963B\u5C3C\u3001\u5355\u4E00\u9891\u7387", "A=0.02:0:0.2:m,k=2:0.1:20:1/m,w=6:0.2:40:rad/s", "A*sin(k*1-w*t)", "y", "m", "engineering"),
  r("\u6CE2\xB7\u7EB5\u6CE2", "\u758F\u5BC6\u6CE2\u540C\u4E00\u884C\u6CE2\u5F0F\uFF0C\u4F4D\u79FB\u6CBF\u4F20\u64AD\u65B9\u5411", "Halliday, \u7EB5\u6CE2", "\u5C0F\u632F\u5E45\u3001\u5747\u5300\u4ECB\u8D28", "A=0.001:0:0.02:m,k=4:0.1:40:1/m,w=8:0.2:40:rad/s", "A*sin(k*1-w*t)", "s", "m", "engineering"),
  r("\u6CE2\xB7\u9A7B\u6CE2", "y=2A sin(kx) cos(\u03C9 t)", "\u4E24\u7AEF\u7EA6\u675F\u9A7B\u6CE2", "\u5165\u5C04\u4E0E\u53CD\u5C04\u7B49\u5E45", "A=0.01:0:0.1:m,k=3.1416:0.2:20:1/m,w=6:0.2:40:rad/s", "2*A*sin(k*0.5)*cos(w*t)", "y", "m", "engineering"),
  r("\u6CE2\xB7\u884C\u6CE2", "v=\u03C9/k=f \u03BB", "\u884C\u6CE2\u76F8\u901F\u5EA6", "\u65E0\u8272\u6563", "f=20:0.1:2000:Hz,lambda=0.5:0.01:10:m", "f*lambda", "v", "m/s", "engineering"),
  r("\u6CE2\xB7\u6CE2\u7684\u53E0\u52A0", "\u540C\u9891\u540C\u5411\uFF1AA=\u221A(A1\xB2+A2\xB2+2 A1 A2 cos \u03B4)", "\u76F8\u5E72\u53E0\u52A0", "\u540C\u4E00\u76F4\u7EBF\u3001\u540C\u4E00\u9891\u7387", "A1=1:0:3:\u2014,A2=1:0:3:\u2014,delta=1.047:0:3.1416:rad", "sqrt(A1*A1+A2*A2+2*A1*A2*cos(delta))", "A", "\u2014", "engineering"),
  r("\u6CE2\xB7\u5E72\u6D89", "\u53CC\u7F1D\u6761\u7EB9\u95F4\u8DDD \u0394y=\u03BB L/d", "Hecht, \u6768\u6C0F\u5E72\u6D89", "\u8FDC\u573A\u5C0F\u89D2", "lambda=5.5e-7:4e-7:7e-7:m,L=1:0.2:3:m,d=0.0002:0.00005:0.001:m", "lambda*L/d", "\u0394y", "m", "engineering"),
  r("\u6CE2\xB7\u884D\u5C04", "\u5355\u7F1D\u7B2C\u4E00\u6781\u5C0F a sin\u03B8=\u03BB", "Hecht, \u5355\u7F1D", "\u592B\u7405\u79BE\u8D39", "a=0.0001:0.00002:0.001:m,lambda=5.5e-7:4e-7:7e-7:m", "asin(min(1,lambda/a))", "\u03B8", "rad", "engineering"),
  r("\u6CE2\xB7\u591A\u666E\u52D2", "f\u2032=f (v+vo)/(v+vs)", "\u591A\u666E\u52D2\u516C\u5F0F\uFF0C\u89C2\u5BDF\u8005\u4E0E\u6E90\u6CBF\u8FDE\u7EBF", "v>|vs|\uFF0C\u4ECB\u8D28\u9759\u6B62", "f=440:20:4000:Hz,v=340:200:400:m/s,vo=0:-50:50:m/s,vs=20:-50:80:m/s", "f*(v+vo)/(v+vs)", "f\u2032", "Hz", "engineering"),
  r("\u6CE2\xB7\u6CE2\u5305", "\u7FA4\u901F\u5EA6 vg=d\u03C9/dk\u2248\u0394\u03C9/\u0394k", "\u6CE2\u5305\u7FA4\u901F\u5EA6\u5B9A\u4E49", "\u7A84\u8C31", "dw=2:0.01:20:rad/s,dk=0.4:0.01:5:1/m", "dw/dk", "vg", "m/s", "engineering"),
  r("\u6CE2\xB7\u8272\u6563", "v_phase=\u03C9/k\uFF0C\u4E0E vg \u53EF\u4E0D\u540C", "\u8272\u6563\u4ECB\u8D28\u76F8\u901F\u5EA6", "\u7ED9\u5B9A \u03C9(k) \u7684\u5C40\u90E8\u659C\u7387\u53E6\u7B97", "w=10:0.1:100:rad/s,k=2:0.05:20:1/m", "w/k", "vp", "m/s", "principle"),
  r("\u58F0\u5B66\xB7\u58F0\u6CE2\u4F20\u64AD", "c=\u221A(\u03B3 P/\u03C1)", "\u7406\u60F3\u6C14\u4F53\u58F0\u901F", "\u7EDD\u70ED\u3001\u5C0F\u632F\u5E45", "gamma=1.4:1.01:1.67:\u2014,P=101325:50000:200000:Pa,rho=1.2:0.5:2:kg/m3", "sqrt(gamma*P/rho)", "c", "m/s", "engineering"),
  r("\u58F0\u5B66\xB7\u58F0\u538B\u7EA7", "L=20 log10(p/p_ref)", "\u58F0\u538B\u7EA7\u5B9A\u4E49\uFF0Cp_ref=20 \u03BCPa", "\u7A7A\u6C14\u4E2D\u81EA\u7531\u573A\u5B9A\u4E49", "p=0.02:1e-5:20:Pa", "20*log10(p/0.00002)", "L", "dB", "engineering"),
  r("\u58F0\u5B66\xB7\u5171\u9E23\u7BA1", "\u4E00\u7AEF\u95ED\u7BA1 L=(2n\u22121) \u03BB/4", "\u6C14\u67F1\u5171\u632F", "n=1 \u57FA\u9891", "c=340:300:360:m/s,L=0.4:0.05:2:m", "c/(4*L)", "f", "Hz", "engineering"),
  r("\u58F0\u5B66\xB7\u8D85\u58F0", "\u03BB=c/f", "\u8D85\u58F0\u6CE2\u957F", "\u5747\u5300\u4ECB\u8D28\u58F0\u901F\u7ED9\u5B9A", "c=1500:300:6000:m/s,f=2e6:2e4:1e7:Hz", "c/f", "\u03BB", "m", "engineering"),
  r("\u58F0\u5B66\xB7\u566A\u58F0\u62B5\u6D88", "\u53CD\u76F8\u53E0\u52A0\u540E\u5269\u4F59 p(1\u2212\u03B1)", "\u4E3B\u52A8\u964D\u566A\u7684\u7406\u60F3\u76F8\u6D88", "\u53EA\u5728\u8BEF\u5DEE\u70B9\u3001\u03B1 \u4E3A\u62B5\u6D88\u6BD4", "p=1:0:10:Pa,alpha=0.9:0:1:\u2014", "p*(1-alpha)", "p_res", "Pa", "principle"),
  r("\u58F0\u5B66\xB7\u58F0\u805A\u7126", "\u7403\u9762\u6CE2\u632F\u5E45 \u221D 1/r", "\u51E0\u4F55\u58F0\u5B66\u80FD\u6D41", "\u65E0\u5438\u6536\u3001\u7403\u5BF9\u79F0", "p1=1:0.01:10:Pa,r=2:0.1:20:m", "p1/r", "p", "Pa", "principle"),
  r("\u70ED\u529B\u5B66\xB7\u7B49\u6E29\u8FC7\u7A0B", "\u7406\u60F3\u6C14\u4F53\u7B49\u6E29\uFF1AW=nRT ln(V2/V1)", "Cengel, Thermodynamics", "\u51C6\u9759\u6001\u3001\u7406\u60F3\u6C14\u4F53", "n=1:0.01:5:mol,T=300:200:800:K,V2=2:0.2:10:m3,V1=1:0.1:5:m3", "n*Rgas*T*ln(V2/V1)", "W", "J", "engineering"),
  r("\u70ED\u529B\u5B66\xB7\u7B49\u538B\u8FC7\u7A0B", "W=P(V2\u2212V1)", "\u7B49\u538B\u529F", "\u51C6\u9759\u6001", "P=1e5:1e4:5e5:Pa,V2=2:0.2:10:m3,V1=1:0.1:5:m3", "P*(V2-V1)", "W", "J", "engineering"),
  r("\u70ED\u529B\u5B66\xB7\u7B49\u5BB9\u8FC7\u7A0B", "\u7B49\u5BB9 W=0\uFF0C\u0394U=n Cv \u0394T", "\u70ED\u529B\u5B66\u7B2C\u4E00\u5B9A\u5F8B", "\u7406\u60F3\u6C14\u4F53\u3001\u4F53\u79EF\u4E0D\u53D8", "n=1:0.01:5:mol,Cv=20.8:10:40:J/molK,dT=50:-200:400:K", "n*Cv*dT", "\u0394U", "J", "engineering"),
  r("\u70ED\u529B\u5B66\xB7\u7EDD\u70ED\u8FC7\u7A0B", "T V^{\u03B3\u22121}=\u5E38\u6570\uFF0CT2=T1 (V1/V2)^{\u03B3\u22121}", "\u53EF\u9006\u7EDD\u70ED", "\u7406\u60F3\u6C14\u4F53\u3001\u51C6\u9759\u6001\u7EDD\u70ED", "T1=300:200:800:K,V1=1:0.1:5:m3,V2=2:0.2:8:m3,gamma=1.4:1.1:1.67:\u2014", "T1*(V1/V2)^(gamma-1)", "T2", "K", "engineering"),
  r("\u70ED\u529B\u5B66\xB7\u5361\u8BFA\u5FAA\u73AF", "\u03B7=1\u2212Tc/Th", "Carnot \u5B9A\u7406", "\u53EF\u9006\u70ED\u673A\u3001\u4E24\u6052\u6E29\u70ED\u6E90", "Th=600:300:1500:K,Tc=300:200:800:K", "1-Tc/Th", "\u03B7", "\u2014", "engineering"),
  r("\u70ED\u529B\u5B66\xB7\u70ED\u673A", "\u03B7=W/Qh", "\u70ED\u673A\u6548\u7387\u5B9A\u4E49", "Qh>0", "W=40:0:500:kJ,Qh=100:1:1000:kJ", "W/Qh", "\u03B7", "\u2014", "engineering"),
  r("\u70ED\u529B\u5B66\xB7\u71B5\u53D8", "\u53EF\u9006\u7B49\u6E29\uFF1A\u0394S=Q/T=nR ln(V2/V1)", "\u71B5\u7684\u5B9A\u4E49", "\u53EF\u9006\u7B49\u6E29\u7406\u60F3\u6C14\u4F53", "n=1:0.01:5:mol,V2=2:0.2:10:m3,V1=1:0.1:5:m3", "n*Rgas*ln(V2/V1)", "\u0394S", "J/K", "engineering"),
  r("\u7EDF\u8BA1\u7269\u7406\xB7\u9EA6\u514B\u65AF\u97E6\u901F\u7387\u5206\u5E03", "\u6700\u6982\u7136\u901F\u7387 vp=\u221A(2kT/m)", "Maxwell \u5206\u5E03", "\u7ECF\u5178\u7406\u60F3\u6C14\u4F53", "T=300:50:2000:K,m=4.65e-26:1e-27:1e-24:kg", "sqrt(2*kB*T/m)", "vp", "m/s", "engineering"),
  r("\u7EDF\u8BA1\u7269\u7406\xB7\u73BB\u5C14\u5179\u66FC\u5206\u5E03", "n2/n1=exp(\u2212\u0394E/kT)", "\u73BB\u5C14\u5179\u66FC\u56E0\u5B50", "\u70ED\u5E73\u8861\u3001\u975E\u7B80\u5E76", "dE=1.6e-20:1e-22:1e-18:J,T=300:50:2000:K", "exp(-dE/(kB*T))", "n2/n1", "\u2014", "engineering"),
  r("\u7EDF\u8BA1\u7269\u7406\xB7\u5E03\u6717\u8FD0\u52A8", "\u27E8x\xB2\u27E9=2 D t", "\u4E00\u7EF4\u7231\u56E0\u65AF\u5766\u5173\u7CFB", "\u957F\u65F6\u95F4\u3001\u72EC\u7ACB\u589E\u91CF", "D=1e-10:1e-14:1e-6:m2/s", "2*D*t", "msd", "m\xB2", "engineering"),
  r("\u7EDF\u8BA1\u7269\u7406\xB7\u70ED\u4F20\u5BFC", "\u5085\u91CC\u53F6\u5B9A\u5F8B q=\u2212\u03BA dT/dx", "Fourier \u70ED\u4F20\u5BFC", "\u7A33\u6001\u3001\u4E00\u7EF4", "kappa=200:0.1:400:W/mK,dT=20:-100:200:K,dx=0.01:0.001:0.2:m", "-kappa*dT/dx", "q", "W/m\xB2", "engineering"),
  r("\u7EDF\u8BA1\u7269\u7406\xB7\u9ECF\u6EDE", "\u725B\u987F\u9ECF\u6027 \u03C4=\u03BC du/dy", "\u725B\u987F\u6D41\u4F53\u672C\u6784", "\u5C42\u6D41\u3001\u5E38\u9ECF\u5EA6", "mu=0.001:1e-5:1:Pa\xB7s,du=1:-5:5:m/s,dy=0.01:0.0001:0.1:m", "mu*du/dy", "\u03C4", "Pa", "engineering"),
  r("\u7EDF\u8BA1\u7269\u7406\xB7\u70ED\u5143\u80DE\u81EA\u52A8\u673A", "\u4E00\u7EF4\u6269\u6563\u6B65\uFF1A\u65B9\u5DEE\u6309 2 D t \u589E\u957F", "\u683C\u5B50\u6C14\u6269\u6563\u7684\u8FDE\u7EED\u6781\u9650", "\u53EA\u4FDD\u7559\u6269\u6563\u65B9\u7A0B\u6781\u9650\uFF0C\u4E0D\u662F\u5B8C\u6574\u683C\u5B50\u89C4\u5219\u6F14\u793A", "D=0.2:0.01:2:\u683C\xB2/\u6B65", "2*D*t", "\u03C3\xB2", "\u683C\xB2", "principle")
];

// js/lab/rows/fields.js
var r2 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var FIELDS = [
  r2("\u6D41\u4F53\xB7\u4F2F\u52AA\u5229", "P+\xBD\u03C1v\xB2+\u03C1gh=\u5E38\u6570", "White, Fluid Mechanics, \u4F2F\u52AA\u5229", "\u5B9A\u5E38\u3001\u65E0\u7C98\u3001\u6CBF\u6D41\u7EBF\u3001\u4E0D\u53EF\u538B", "P=101325:1e4:5e5:Pa,rho=1000:1:2000:kg/m3,v=2:0:30:m/s,h=1:0:20:m", "P+0.5*rho*v*v+rho*g*h", "H", "Pa", "engineering"),
  r2("\u6D41\u4F53\xB7\u8FDE\u7EED\u6027\u65B9\u7A0B", "\u4E0D\u53EF\u538B\uFF1AA1 v1=A2 v2", "\u8FDE\u7EED\u6027\u65B9\u7A0B", "\u5B9A\u5E38\u4E0D\u53EF\u538B", "A1=0.02:0.0001:1:m2,v1=2:0:20:m/s,A2=0.005:0.0001:1:m2", "A1*v1/A2", "v2", "m/s", "engineering"),
  r2("\u6D41\u4F53\xB7\u6D6E\u529B", "Fb=\u03C1f V g", "\u963F\u57FA\u7C73\u5FB7\u539F\u7406", "\u6D41\u4F53\u9759\u529B\u3001\u7269\u4F53\u5168\u6D78", "rho=1000:1:2000:kg/m3,V=0.002:0.00001:0.2:m3", "rho*V*g", "Fb", "N", "engineering"),
  r2("\u6D41\u4F53\xB7\u5E15\u65AF\u5361", "F2/F1=A2/A1", "\u5E15\u65AF\u5361\u539F\u7406", "\u540C\u4E00\u5BC6\u95ED\u9759\u538B", "F1=20:0:500:N,A2=0.02:0.0001:0.5:m2,A1=0.001:0.00005:0.05:m2", "F1*A2/A1", "F2", "N", "engineering"),
  r2("\u6D41\u4F53\xB7\u8679\u5438", "\u51FA\u53E3\u901F\u5EA6\u7531\u4F2F\u52AA\u5229 v=\u221A(2gh)", "\u4F2F\u52AA\u5229\u7528\u4E8E\u8679\u5438\u51FA\u53E3", "\u65E0\u635F\u5931\u3001\u51FA\u53E3\u901A\u5927\u6C14\u3001h \u4E3A\u6DB2\u9762\u5230\u51FA\u53E3\u843D\u5DEE", "h=1:0.05:8:m", "sqrt(2*g*h)", "v", "m/s", "principle"),
  r2("\u6D41\u4F53\xB7\u6587\u4E18\u91CC", "\u0394P=\xBD\u03C1(v2\xB2\u2212v1\xB2)\uFF0Cv2=A1 v1/A2", "\u6587\u4E18\u91CC\u6D41\u91CF\u8BA1", "\u6C34\u5E73\u3001\u65E0\u635F\u5931", "rho=1000:1:2000:kg/m3,v1=1:0.1:10:m/s,A1=0.01:0.0001:0.2:m2,A2=0.004:0.0001:0.1:m2", "0.5*rho*((A1*v1/A2)^2-v1*v1)", "\u0394P", "Pa", "engineering"),
  r2("\u6D41\u4F53\xB7\u5C42\u6D41", "\u5706\u7BA1 Re=\u03C1vD/\u03BC", "\u96F7\u8BFA\u6570\u5B9A\u4E49", "\u5706\u7BA1\u7279\u5F81\u957F\u5EA6\u53D6\u76F4\u5F84", "rho=1000:1:2000:kg/m3,v=0.1:0:5:m/s,D=0.02:0.001:0.5:m,mu=0.001:1e-5:0.1:Pa\xB7s", "rho*v*D/mu", "Re", "\u2014", "engineering"),
  r2("\u6D41\u4F53\xB7\u6E4D\u6D41", "\u540C\u4E00\u96F7\u8BFA\u6570\uFF0CRe\u226B2300 \u5224\u4E3A\u6E4D\u6D41\u503E\u5411", "\u5706\u7BA1\u8F6C\u6369\u7684\u7ECF\u9A8C\u9608\u503C", "\u4E0D\u662F\u6E4D\u6D41\u6A21\u5F0F\u65B9\u7A0B", "rho=1.2:0.5:2000:kg/m3,v=10:0:80:m/s,D=0.1:0.001:1:m,mu=1.8e-5:1e-6:0.01:Pa\xB7s", "rho*v*D/mu", "Re", "\u2014", "principle"),
  r2("\u6D41\u4F53\xB7\u8FB9\u754C\u5C42", "Blasius\uFF1A\u5E73\u677F \u03B4/x\u22485/\u221ARex", "Schlichting, \u5C42\u6D41\u5E73\u677F\u8FB9\u754C\u5C42", "\u96F6\u538B\u529B\u68AF\u5EA6\u5C42\u6D41", "x=0.5:0.01:5:m,Re=1e5:100:1e7:\u2014", "5*x/sqrt(Re)", "\u03B4", "m", "principle"),
  r2("\u6D41\u4F53\xB7\u6DA1\u65CB", "\u5170\u91D1\u6DA1\u5916\uFF1Av\u03B8=\u0393/(2\u03C0r)", "\u65E0\u7C98\u70B9\u6DA1\u901F\u5EA6", "r \u5728\u6DA1\u6838\u4E4B\u5916", "Gamma=1:0.01:20:m2/s,r=0.2:0.01:2:m", "Gamma/(2*pi*r)", "v\u03B8", "m/s", "principle"),
  r2("\u6D41\u4F532\xB7\u7BA1\u9053\u963B\u529B", "\u8FBE\u897F hf=f (L/D) v\xB2/(2g)", "Darcy\u2013Weisbach", "\u6CBF\u7A0B\u635F\u5931\uFF0Cf \u7ED9\u5B9A", "f=0.02:0.005:0.08:\u2014,L=20:0.1:500:m,D=0.05:0.005:1:m,v=1.5:0:10:m/s", "f*(L/D)*v*v/(2*g)", "hf", "m", "engineering"),
  r2("\u6D41\u4F532\xB7\u5B54\u53E3\u51FA\u6D41", "v=Cd \u221A(2gh)", "\u5B54\u53E3\u51FA\u6D41", "\u5B9A\u5E38\u3001Cd \u7ED9\u5B9A", "Cd=0.62:0.4:0.98:\u2014,h=2:0.05:20:m", "Cd*sqrt(2*g*h)", "v", "m/s", "engineering"),
  r2("\u6D41\u4F532\xB7\u5830\u6D41", "\u77E9\u5F62\u5830 q=Cd \u221A(2g) b h^{3/2}", "\u8584\u58C1\u5830\u6D41\u91CF\u7684\u5E38\u7528\u5F62\u5F0F", "\u81EA\u7531\u51FA\u6D41\u3001Cd \u7ED9\u5B9A\uFF0C\u4E0D\u662F\u7387\u5B9A\u5B9E\u9A8C", "Cd=0.6:0.4:0.8:\u2014,b=1:0.1:10:m,h=0.2:0.01:2:m", "Cd*sqrt(2*g)*b*h^1.5", "Q", "m\xB3/s", "principle"),
  r2("\u6D41\u4F532\xB7\u6C34\u8DC3", "\u5171\u8F6D\u6C34\u6DF1 y2/y1=\xBD(\u22121+\u221A(1+8 Fr1\xB2))", "Chow, Open-Channel Hydraulics", "\u6C34\u5E73\u77E9\u5F62\u6E20\u3001\u5FFD\u7565\u6469\u64E6", "Fr=2:1:10:\u2014", "0.5*(-1+sqrt(1+8*Fr*Fr))", "y2/y1", "\u2014", "engineering"),
  r2("\u6D41\u4F532\xB7\u6CE2\u6D6A", "\u6DF1\u6C34\u8272\u6563 \u03C9\xB2=g k", "\u7EBF\u6027\u91CD\u529B\u6CE2", "\u6C34\u6DF1\u8FDC\u5927\u4E8E\u6CE2\u957F", "k=0.2:0.01:5:1/m", "sqrt(g*k)", "\u03C9", "rad/s", "engineering"),
  r2("\u6D41\u4F532\xB7\u6F6E\u6C50", "\u534A\u65E5\u6F6E\u4E3B\u8981\u5468\u671F\u53D6 12.42 h \u7684\u89D2\u9891\u7387", "\u5E73\u8861\u6F6E\u7684\u4E3B\u592A\u9634\u534A\u65E5\u5206\u6F6E\u5468\u671F", "\u4E0D\u662F\u5177\u4F53\u6D77\u533A\u9884\u62A5", "T=44712:3600:90000:s", "2*pi/T", "\u03C9", "rad/s", "principle"),
  r2("\u6D41\u4F532\xB7\u6C14\u6CE1\u4E0A\u5347", "\u65AF\u6258\u514B\u65AF\u672B\u901F v= (2/9) (\u03C1\u2212\u03C1b) g R\xB2/\u03BC", "\u4F4E\u96F7\u8BFA\u6570\u5706\u7403\u963B\u529B", "Re\u226A1\uFF0C\u6C14\u6CE1\u5BC6\u5EA6\u53EF\u5FFD\u7565\u65F6 \u03C1b\u22480", "R=0.001:1e-5:0.02:m,mu=0.001:1e-4:0.1:Pa\xB7s,rho=1000:500:1200:kg/m3", "(2/9)*rho*g*R*R/mu", "v", "m/s", "principle"),
  r2("\u6D41\u4F532\xB7\u6DB2\u6EF4\u649E\u51FB", "\u97E6\u4F2F\u6570 We=\u03C1 v\xB2 D/\u03C3", "We \u5B9A\u4E49", "\u7528\u6765\u6BD4\u8F83\u60EF\u6027\u4E0E\u8868\u9762\u5F20\u529B\uFF0C\u4E0D\u662F\u649E\u51FB\u6A21\u62DF", "rho=1000:1:1200:kg/m3,v=2:0:20:m/s,D=0.002:1e-5:0.02:m,sigma=0.072:0.02:0.1:N/m", "rho*v*v*D/sigma", "We", "\u2014", "engineering"),
  r2("\u6D41\u4F532\xB7\u591A\u76F8\u6D41", "\u7A7A\u9699\u7387\u4E0E\u6ED1\u901F\uFF1Aj=\u03B1 v_g+(1\u2212\u03B1) v_l \u7684\u6C14\u76F8\u4EFD\u989D\u793A\u610F", "\u4E00\u7EF4\u4E24\u76F8\u6F02\u79FB\u7684\u5B9A\u4E49", "\u7ED9\u5B9A\u4E24\u76F8\u901F\u5EA6\uFF0C\u4E0D\u662F\u6D41\u578B\u5224\u522B\u56FE", "vg=2:0:20:m/s,vl=0.5:0:10:m/s,alpha=0.3:0:1:\u2014", "alpha*vg+(1-alpha)*vl", "j", "m/s", "principle"),
  r2("\u6D41\u4F532\xB7SPH", "\u4E09\u6B21\u6837\u6761\u6838\u5728 r=0 \u7684\u4E09\u7EF4\u5F52\u4E00\uFF1AW=1/(\u03C0 h\xB3)", "Monaghan \u4E09\u6B21\u6837\u6761\u6838\u7684\u4E2D\u5FC3\u503C\u91CF\u7EA7", "\u53EA\u7ED9\u6838\u51FD\u6570\u4E2D\u5FC3\u503C\uFF0C\u4E0D\u662F\u5B8C\u6574 SPH \u6C42\u89E3\u5668", "h=0.05:0.005:0.5:m", "1/(pi*h*h*h)", "W", "1/m\xB3", "principle"),
  r2("\u9759\u7535\xB7\u7B49\u52BF\u9762", "\u70B9\u7535\u8377 V=k q/r", "\u5E93\u4ED1\u52BF", "\u771F\u7A7A\u3001\u70B9\u7535\u8377", "q=1e-9:-1e-6:1e-6:C,r=0.2:0.01:5:m", "kC*q/r", "V", "V", "engineering"),
  r2("\u9759\u7535\xB7\u9759\u7535\u5C4F\u853D", "\u5BFC\u4F53\u7A7A\u8154\u5185\u90E8\u70B9\u7535\u8377\u5728\u8154\u5185\uFF0C\u5BFC\u4F53\u5916\u573A\u7531\u5916\u8868\u9762\u603B\u7535\u8377\u51B3\u5B9A\uFF1AE=k Q/r\xB2", "\u9AD8\u65AF\u5B9A\u7406\u7528\u4E8E\u5BFC\u4F53", "\u9759\u7535\u5E73\u8861\u3001\u7403\u5BF9\u79F0\u5916\u58F3", "Q=1e-9:-1e-6:1e-6:C,r=0.3:0.05:3:m", "kC*abs(Q)/(r*r)", "E", "N/C", "principle"),
  r2("\u9759\u7535\xB7\u5E26\u7535\u7C92\u5B50", "\u5747\u5300\u7535\u573A a=qE/m", "\u725B\u987F\u7B2C\u4E8C\u5B9A\u5F8B", "\u975E\u76F8\u5BF9\u8BBA\u3001\u5FFD\u7565\u91CD\u529B\u4E0E\u78C1\u573A", "q=1.6e-19:-1e-17:1e-17:C,E=1000:0:1e6:N/C,m=9.1e-31:1e-31:1e-25:kg", "q*E/m", "a", "m/s\xB2", "engineering"),
  r2("\u9759\u7535\xB7\u9759\u7535\u9664\u5C18", "\u5E26\u7535\u7C92\u5B50\u6F02\u79FB\u901F\u5EA6 v=q E b\uFF0Cb \u4E3A\u8FC1\u79FB\u7387", "\u8FC1\u79FB\u7387\u5B9A\u4E49 v=\u03BC E", "\u7ED9\u5B9A\u8FC1\u79FB\u7387\uFF0C\u4E0D\u662F\u9664\u5C18\u5668\u8BBE\u8BA1", "mu=1e-4:1e-6:0.01:m2/Vs,E=1e5:0:1e6:V/m", "mu*E", "v", "m/s", "principle"),
  r2("\u9759\u7535\xB7\u8303\u5FB7\u683C\u62C9\u592B", "\u5B64\u7ACB\u5BFC\u4F53\u7403 V=k Q/R", "\u5BFC\u4F53\u7403\u7535\u52BF", "\u9759\u7535\u5E73\u8861", "Q=1e-6:1e-9:1e-4:C,R=0.15:0.02:1:m", "kC*Q/R", "V", "V", "engineering"),
  r2("\u7535\u8DEF\xB7\u4E32\u5E76\u8054", "\u4E24\u7535\u963B\u5E76\u8054 Req=R1 R2/(R1+R2)", "\u7535\u963B\u4E32\u5E76\u8054", "\u76F4\u6D41\u3001\u7EBF\u6027\u7535\u963B", "R1=100:0.1:1e6:ohm,R2=100:0.1:1e6:ohm", "R1*R2/(R1+R2)", "Req", "\u03A9", "engineering"),
  r2("\u7535\u8DEF\xB7\u57FA\u5C14\u970D\u592B", "\u5355\u56DE\u8DEF\uFF1AI=(E1\u2212E2)/(R1+R2)", "KVL", "\u76F4\u6D41\u3001\u4E24\u7535\u6E90\u4E32\u8054", "E1=12:0:48:V,E2=3:-24:24:V,R1=10:0.1:1e4:ohm,R2=5:0.1:1e4:ohm", "(E1-E2)/(R1+R2)", "I", "A", "engineering"),
  r2("\u7535\u8DEF\xB7RC", "vC=V(1\u2212e^{\u2212t/RC})", "\u4E00\u9636 RC \u5145\u7535", "\u96F6\u521D\u59CB\u3001\u6052\u538B\u6E90\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4\u4E00\u4E2A\u65F6\u95F4\u5E38\u6570 RC", "V=5:0:24:V,R=1000:1:1e6:ohm,C=1e-4:1e-7:0.01:F,t0=0.1:0:60:s", "V*(1-exp(-t/(R*C)))", "vC", "V", "engineering"),
  r2("\u7535\u8DEF\xB7\u4EA4\u6D41\u7535\u8DEF", "\u4E32\u8054 RL\uFF1AZ=\u221A(R\xB2+(\u03C9L)\xB2)", "\u963B\u6297", "\u6B63\u5F26\u7A33\u6001", "R=10:0.1:1e4:ohm,w=314:1:1e5:rad/s,L=0.01:1e-5:1:H", "sqrt(R*R+(w*L)^2)", "Z", "\u03A9", "engineering"),
  r2("\u7535\u8DEF\xB7\u8C10\u632F", "\u4E32\u8054 RLC\uFF1A\u03C90=1/\u221A(LC)", "\u8C10\u632F\u89D2\u9891\u7387", "\u7406\u60F3 L\u3001C", "L=0.01:1e-6:1:H,C=1e-6:1e-9:0.001:F", "1/sqrt(L*C)", "\u03C90", "rad/s", "engineering"),
  r2("\u7535\u8DEF\xB7\u6EE4\u6CE2\u5668", "\u4E00\u9636\u4F4E\u901A fc=1/(2\u03C0RC)", "\u622A\u6B62\u9891\u7387", "RC \u4F4E\u901A", "R=1000:1:1e6:ohm,C=1e-7:1e-10:0.001:F", "1/(2*pi*R*C)", "fc", "Hz", "engineering"),
  r2("\u7535\u8DEF\xB7\u7535\u6865", "\u5E73\u8861\uFF1AR1/R2=R3/R4\uFF0C\u6C42 Rx=R2 R3/R1", "\u60E0\u65AF\u901A\u7535\u6865", "\u76F4\u6D41\u5E73\u8861\u6761\u4EF6", "R1=100:0.1:1e5:ohm,R2=200:0.1:1e5:ohm,R3=150:0.1:1e5:ohm", "R2*R3/R1", "Rx", "\u03A9", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u5E73\u9762\u6CE2", "c=1/\u221A(\u03BC0 \u03B50 \u03B5r)\uFF0C\u4ECB\u8D28\u4E2D\u7684\u76F8\u901F", "\u9EA6\u514B\u65AF\u97E6\u65B9\u7A0B\u7EC4\u7684\u5E73\u9762\u6CE2", "\u7EBF\u6027\u5404\u5411\u540C\u6027\u4ECB\u8D28", "epsr=1:1:16:\u2014", "1/sqrt(mu0*eps0*epsr)", "c", "m/s", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u6781\u5316", "Malus\uFF1AI=I0 cos\xB2\u03B8", "Malus \u5B9A\u5F8B", "\u7EBF\u504F\u632F\u3001\u7406\u60F3\u504F\u632F\u7247", "I0=2:0:10:\u2014,theta=0.785:0:1.571:rad", "I0*cos(theta)^2", "I", "\u2014", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u53CD\u5C04\u6298\u5C04", "\u6B63\u5165\u5C04\u529F\u7387\u53CD\u5C04\u7387 R=((n1\u2212n2)/(n1+n2))\xB2", "\u83F2\u6D85\u8033\u516C\u5F0F\u6B63\u5165\u5C04", "\u975E\u78C1\u6027\u4ECB\u8D28\u3001\u6B63\u5165\u5C04", "n1=1:1:2.5:\u2014,n2=1.5:1:3:\u2014", "((n1-n2)/(n1+n2))^2", "R", "\u2014", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u6CE2\u5BFC", "\u77E9\u5F62\u6CE2\u5BFC\u622A\u6B62 fc=c/(2a)", "TE10 \u622A\u6B62", "\u7406\u60F3\u5BFC\u4F53\u58C1\u3001\u7A7A\u6C14\u586B\u5145", "a=0.02:0.002:0.2:m", "c0/(2*a)", "fc", "Hz", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u5929\u7EBF", "\u534A\u6CE2\u5076\u6781\u5B50\u8F90\u5C04\u7535\u963B\u7EA6 73 \u03A9\uFF0C\u793A\u610F Rr\u224873\xB7\u03B7\uFF08\u4ECB\u8D28\u4FEE\u6B63\u56E0\u5B50\uFF09", "Balanis, Antenna Theory", "\u81EA\u7531\u7A7A\u95F4\u7EC6\u534A\u6CE2\u5076\u6781\u5B50\uFF0C\u4E0D\u662F\u9635\u5217\u8BBE\u8BA1", "eta=1:0.5:2:\u2014", "73*eta", "Rr", "\u03A9", "principle"),
  r2("\u7535\u78C1\u6CE2\xB7\u7535\u78C1\u9891\u8C31", "E=h f", "\u5149\u5B50\u80FD\u91CF", "\u771F\u7A7A\u4E2D\u7684\u9891\u7387", "f=5e14:1e6:1e18:Hz", "hP*f/qe", "E", "eV", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u5FAE\u6CE2", "\u81EA\u7531\u7A7A\u95F4\u6CE2\u957F \u03BB=c/f", "\u03BB f=c", "\u771F\u7A7A", "f=2.45e9:1e8:1e11:Hz", "c0/f", "\u03BB", "m", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u5C04\u9891", "\u96C6\u603B\u6761\u4EF6\u5C3A\u5BF8 \u2113\u226A\u03BB\uFF0C\u03BB=c/f", "\u51C6\u9759\u6001\u5224\u636E\u7528\u6CE2\u957F", "\u7ED9\u51FA\u6CE2\u957F\u4F9B\u6BD4\u8F83\uFF0C\u4E0D\u662F\u7535\u8DEF\u7EFC\u5408", "f=1e8:1e5:1e10:Hz", "c0/f", "\u03BB", "m", "principle"),
  r2("\u7535\u78C1\u6CE2\xB7\u8D8B\u80A4\u6548\u5E94", "\u03B4=\u221A(2/(\u03C9 \u03BC \u03C3))", "\u826F\u5BFC\u4F53\u8D8B\u80A4\u6DF1\u5EA6", "\u03BC=\u03BC0\u3001\u975E\u78C1\u6027", "f=50:1:1e9:Hz,sigma=5.8e7:1e5:1e8:S/m", "sqrt(2/(2*pi*f*mu0*sigma))", "\u03B4", "m", "engineering"),
  r2("\u7535\u78C1\u6CE2\xB7\u7535\u78C1\u517C\u5BB9", "\u5C4F\u853D\u6548\u80FD\u7684\u826F\u5BFC\u4F53\u5438\u6536\u9879\u8FD1\u4F3C SE\u22488.686 thick/\u03B4", "\u5C4F\u853D\u7684\u6307\u6570\u8870\u51CF\u56E0\u5B50 e^{\u2212t/\u03B4} \u53D6 dB", "\u53EA\u7B97\u5438\u6536\u9879\uFF0C\u4E0D\u662F\u673A\u7BB1\u8BBE\u8BA1\u3002\u539A\u5EA6\u7528 thick\uFF0C\u907F\u514D\u88AB\u4EFF\u771F\u65F6\u949F t \u8986\u76D6", "thick=0.001:1e-5:0.01:m,delta=2e-4:1e-6:0.01:m", "8.686*thick/delta", "SE", "dB", "principle"),
  r2("\u5149\u5B66\xB7\u53CD\u5C04", "\u955C\u9762\u53CD\u5C04\uFF1A\u03B8r=\u03B8i", "\u53CD\u5C04\u5B9A\u5F8B", "\u955C\u9762", "thi=30:0:89:deg", "thi", "\u03B8r", "\xB0", "engineering"),
  r2("\u5149\u5B66\xB7\u6298\u5C04", "n1 sin\u03B81=n2 sin\u03B82", "\u65AF\u6D85\u8033\u5B9A\u5F8B", "\u5404\u5411\u540C\u6027\u3001\u754C\u9762\u5E73\u9762", "n1=1:1:2.5:\u2014,th1=30:0:80:deg,n2=1.5:1:3:\u2014", "asin(min(1,n1*sin(th1*pi/180)/n2))*180/pi", "\u03B82", "\xB0", "engineering"),
  r2("\u5149\u5B66\xB7\u5168\u53CD\u5C04", "\u4E34\u754C\u89D2 \u03B8c=arcsin(n2/n1)", "\u5168\u53CD\u5C04", "n1>n2", "n1=1.5:1.01:2.5:\u2014,n2=1:1:1.5:\u2014", "asin(min(1,n2/n1))*180/pi", "\u03B8c", "\xB0", "engineering"),
  r2("\u5149\u5B66\xB7\u68F1\u955C", "\u6700\u5C0F\u504F\u5411\u8FD1\u4F3C n=sin((A+\u03B4m)/2)/sin(A/2)", "\u68F1\u955C\u6298\u5C04\u7387", "\u5BF9\u79F0\u7A7F\u8FC7", "A=60:20:80:deg,dm=40:0:70:deg", "sin((A+dm)*pi/360)/sin(A*pi/360)", "n", "\u2014", "engineering"),
  r2("\u5149\u5B66\xB7\u663E\u5FAE\u955C", "\u89D2\u653E\u5927\u7387\u8FD1\u4F3C M=\u2212L/f_obj \xB7 25cm/f_eye", "\u8FD1\u8F74\u663E\u5FAE\u955C\u653E\u5927\u7387", "\u660E\u89C6\u8DDD\u79BB 25 cm\uFF0CL \u4E3A\u5149\u5B66\u7B52\u957F\u3002L\u3001f_obj\u3001f_eye \u4E0E\u624B\u5199\u88C5\u914D\u7684 10\xD7/10\xD7 \u9ED8\u8BA4\u76F8\u540C", "L=0.16:0.05:0.3:m,fo=0.016:0.001:0.05:m,fe=0.025:0.005:0.06:m", "-(L/fo)*(0.25/fe)", "M", "\u2014", "principle"),
  r2("\u5149\u5B66\xB7\u671B\u8FDC\u955C", "M=\u2212f_obj/f_eye", "\u5F00\u666E\u52D2\u671B\u8FDC\u955C\u89D2\u653E\u5927\u7387", "\u8FD1\u8F74\u3001\u65E0\u7A77\u8FDC\u7269\u4F53", "fo=1:0.1:3:m,fe=0.02:0.005:0.1:m", "-fo/fe", "M", "\u2014", "engineering"),
  r2("\u5149\u5B66\xB7\u773C\u775B\u6A21\u578B", "\u7B80\u5316\u773C\u5C48\u5149 1/f=1/v\u22121/u\uFF0Cu \u4E3A\u7269\u8DDD", "\u8584\u900F\u955C\u516C\u5F0F", "\u5355\u900F\u955C\u773C\u775B\u6A21\u578B\uFF0C\u4E0D\u662F\u4E34\u5E8A\u9A8C\u5149", "u=-0.25:-5:-0.1:m,f=0.017:0.01:0.03:m", "1/(1/f+1/u)", "v", "m", "principle"),
  r2("\u5149\u5B66\xB7\u50CF\u5DEE", "\u7403\u5DEE\u7684\u8D5B\u5FB7\u5C14\u9879\u968F\u5B54\u5F84\u89D2\u56DB\u6B21\u53D8\u5316\u7684\u793A\u610F\u7CFB\u6570", "\u521D\u7EA7\u50CF\u5DEE\u4E0E\u5B54\u5F84\u7684\u5E42\u6B21", "\u53EA\u4FDD\u7559 \u03C3\u221D\u03C1\u2074 \u7684\u6BD4\u4F8B\uFF0C\u4E0D\u662F\u955C\u5934\u8BBE\u8BA1", "rho=0.5:0:1:\u2014,k=1:0:5:\u2014", "k*rho^4", "\u03C3", "\u2014", "principle"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u53CC\u7F1D", "\u0394y=\u03BB L/d", "Hecht, \u6768\u6C0F\u53CC\u7F1D", "\u8FDC\u573A\u5C0F\u89D2", "lambda=5.5e-7:4e-7:7e-7:m,L=1:0.2:3:m,d=0.0002:5e-5:0.001:m", "lambda*L/d", "\u0394y", "m", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u5355\u7F1D", "\u7B2C\u4E00\u6781\u5C0F a sin\u03B8=\u03BB", "\u5355\u7F1D\u884D\u5C04", "\u592B\u7405\u79BE\u8D39", "a=1e-4:2e-5:0.001:m,lambda=5.5e-7:4e-7:7e-7:m", "asin(min(1,lambda/a))*180/pi", "\u03B8", "\xB0", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u5149\u6805", "d sin\u03B8=m \u03BB\uFF0C\u53D6 m=1", "\u5149\u6805\u65B9\u7A0B", "\u6B63\u5165\u5C04", "d=1e-6:2e-7:1e-4:m,lambda=5.5e-7:4e-7:7e-7:m", "asin(min(1,lambda/d))*180/pi", "\u03B8", "\xB0", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u8584\u819C\u5E72\u6D89", "\u6B63\u5165\u5C04\u76F8\u957F\uFF1A2 n d=(m+\xBD)\u03BB\uFF08\u6709\u534A\u6CE2\u635F\u5931\u65F6\uFF09", "\u8584\u819C\u5E72\u6D89", "\u6B63\u5165\u5C04\u3001\u4E00\u7AEF\u534A\u6CE2\u635F\u5931", "n=1.33:1:2.5:\u2014,lambda=5.5e-7:4e-7:7e-7:m,m=0:0:5:\u2014", "(m+0.5)*lambda/(2*n)", "d", "m", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u725B\u987F\u73AF", "\u6697\u73AF\u534A\u5F84 r=\u221A(m \u03BB R)", "\u725B\u987F\u73AF", "\u7A7A\u6C14\u819C\u3001\u53CD\u5C04\u6697\u73AF", "m=5:1:40:\u2014,lambda=5.5e-7:4e-7:7e-7:m,R=1:0.1:5:m", "sqrt(m*lambda*R)", "r", "m", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u8FC8\u514B\u8033\u5B59", "\u79FB\u52A8\u8DDD\u79BB d=N \u03BB/2", "\u8FC8\u514B\u8033\u5B59\u8BA1\u6570", "\u6B63\u5165\u5C04\u3001\u7A7A\u6C14", "N=100:0:1e5:\u2014,lambda=6.328e-7:4e-7:7e-7:m", "N*lambda/2", "d", "m", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u6CD5\u5E03\u91CC-\u73C0\u7F57", "\u81EA\u7531\u5149\u8C31\u533A FSR=c/(2 n L)", "\u6CD5\u5E03\u91CC-\u73C0\u7F57", "\u7A7A\u6C14\u9699 n\u22481 \u53EF\u6539", "n=1:1:2:\u2014,L=0.01:1e-4:0.5:m", "c0/(2*n*L)", "FSR", "Hz", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u884D\u5C04\u6781\u9650", "\u745E\u5229\u5224\u636E \u03B8=1.22 \u03BB/D", "\u5706\u5B54\u5206\u8FA8\u7387", "\u8FDC\u573A", "lambda=5.5e-7:4e-7:7e-7:m,D=0.1:0.001:2:m", "1.22*lambda/D", "\u03B8", "rad", "engineering"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u76F8\u5E72\u6027", "\u76F8\u5E72\u957F\u5EA6 lc\u2248\u03BB\xB2/\u0394\u03BB", "\u51C6\u5355\u8272\u5149\u76F8\u5E72\u957F\u5EA6", "\u0394\u03BB\u226A\u03BB", "lambda=5.5e-7:4e-7:7e-7:m,dlam=1e-9:1e-12:1e-7:m", "lambda*lambda/dlam", "lc", "m", "principle"),
  r2("\u6CE2\u52A8\u5149\u5B66\xB7\u504F\u632F", "I=I0 cos\xB2\u03B8", "Malus", "\u7EBF\u504F\u632F", "I0=1:0:5:\u2014,theta=1.047:0:1.571:rad", "I0*cos(theta)^2", "I", "\u2014", "engineering")
];

// js/lab/rows/modern.js
var r3 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var MODERN = [
  r3("\u91CF\u5B50\xB7\u6CE2\u5305\u6F14\u5316", "\u81EA\u7531\u7C92\u5B50\u7FA4\u901F\u5EA6 vg=\u210F k/m", "\u81EA\u7531\u7C92\u5B50\u8272\u6563 E=\u210F\xB2k\xB2/2m", "\u4E00\u7EF4\u3001\u65E0\u52BF", "k=5e9:1e8:1e11:1/m,m=9.1e-31:1e-31:1e-27:kg", "hbar*k/m", "vg", "m/s", "engineering"),
  r3("\u91CF\u5B50\xB7\u859B\u5B9A\u8C14\u65B9\u7A0B", "\u5B9A\u6001\uFF1AE=\u210F\xB2 k\xB2/2m\uFF08\u81EA\u7531\u7C92\u5B50\uFF09", "\u4E0E\u65F6\u95F4\u65E0\u5173\u7684\u81EA\u7531\u7C92\u5B50\u89E3", "V=0", "k=5e9:1e8:1e11:1/m,m=9.1e-31:1e-31:1e-27:kg", "(hbar*k)^2/(2*m)/qe", "E", "eV", "principle"),
  r3("\u91CF\u5B50\xB7\u65E0\u9650\u6DF1\u52BF\u9631", "E_n=n\xB2 \u03C0\xB2 \u210F\xB2/(2 m L\xB2)", "Griffiths, \u65E0\u9650\u6DF1\u65B9\u52BF\u9631", "\u4E00\u7EF4\u65E0\u9650\u58C1", "n=1:1:8:\u2014,L=1e-9:1e-10:1e-8:m,m=9.1e-31:1e-31:1e-27:kg", "(n*pi*hbar)^2/(2*m*L*L)/qe", "E", "eV", "engineering"),
  r3("\u91CF\u5B50\xB7\u7EA0\u7F20", "\u7406\u60F3\u5355\u91CD\u6001 \u27E8ZZ\u27E9=\u2212C\uFF0CC\u2208[0,1] \u4E3A\u53EF\u89C1\u5EA6", "\u4E24\u91CF\u5B50\u6BD4\u7279\u5355\u91CD\u6001\u7684\u81EA\u65CB\u5173\u8054", "\u53EA\u6F14\u793A\u53CD\u5173\u8054\u53EF\u89C1\u5EA6\uFF0C\u4E0D\u662F\u91CF\u5B50\u95E8\u5B9E\u9A8C\u88C5\u7F6E", "C=1:0:1:\u2014", "-C", "\u27E8ZZ\u27E9", "\u2014", "principle"),
  r3("\u91CF\u5B50\xB7\u91CF\u5B50\u95E8", "Hadamard \u4F5C\u7528\u5728 |0\u27E9 \u4E0A\u6D4B\u91CF\u5230 1 \u7684\u6982\u7387\u4E3A 1/2", "Nielsen & Chuang, \u5355\u91CF\u5B50\u6BD4\u7279\u95E8", "\u7406\u60F3\u95E8\u3001\u8BA1\u7B97\u57FA\u6D4B\u91CF", "p=0.5:0:1:\u2014", "p", "P(1)", "\u2014", "principle"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u65F6\u95F4\u81A8\u80C0", "\u0394t=\u03B3 \u0394\u03C4\uFF0C\u03B3=1/\u221A(1\u2212\u03B2\xB2)", "\u72ED\u4E49\u76F8\u5BF9\u8BBA\u65F6\u95F4\u81A8\u80C0", "\u60EF\u6027\u7CFB\u3001\u03B2<1", "beta=0.6:0:0.99:\u2014,tau=1:0:10:s", "tau/sqrt(1-beta*beta)", "\u0394t", "s", "engineering"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u6D1B\u4F26\u5179\u53D8\u6362", "x\u2032=\u03B3(x\u2212v t)", "\u6D1B\u4F26\u5179\u53D8\u6362", "\u6807\u51C6\u4F4D\u5F62\u3001t \u4E3A\u5B9E\u9A8C\u5BA4\u65F6\u95F4", "beta=0.6:0:0.99:\u2014,x=1:-10:10:m", "(1/sqrt(1-beta*beta))*(x-beta*c0*t)", "x\u2032", "m", "engineering"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u53CC\u751F\u5B50", "\u65C5\u884C\u8005\u56FA\u6709\u65F6 \u03C4=T/\u03B3\uFF0CT \u4E3A\u5730\u7403\u5750\u6807\u65F6", "\u65F6\u95F4\u81A8\u80C0\u5E94\u7528\u4E8E\u4E00\u6B21\u60EF\u6027\u51FA\u822A", "\u5FFD\u7565\u52A0\u901F\u6BB5\uFF0C\u53EA\u6BD4\u8F83\u60EF\u6027\u6BB5", "beta=0.8:0:0.99:\u2014,T=10:0.1:100:y", "T*sqrt(1-beta*beta)", "\u03C4", "y", "principle"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u76F8\u5BF9\u8BBA\u591A\u666E\u52D2", "\u8FCE\u9762\uFF1Af\u2032=f \u221A((1+\u03B2)/(1\u2212\u03B2))", "\u76F8\u5BF9\u8BBA\u591A\u666E\u52D2", "\u5149\u6E90\u4E0E\u89C2\u5BDF\u8005\u6CBF\u8FDE\u7EBF\u63A5\u8FD1", "f=5e14:1e12:1e16:Hz,beta=0.2:0:0.9:\u2014", "f*sqrt((1+beta)/(1-beta))", "f\u2032", "Hz", "engineering"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u76F8\u5BF9\u8BBA\u52A8\u91CF", "p=\u03B3 m v", "\u76F8\u5BF9\u8BBA\u52A8\u91CF", "\u03B2<1", "m=9.1e-31:1e-31:1e-27:kg,beta=0.6:0:0.99:\u2014", "m*beta*c0/sqrt(1-beta*beta)", "p", "kg\xB7m/s", "engineering"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u5149\u9525", "\u95F4\u9694 ds\xB2=c\xB2dt\xB2\u2212dx\xB2 \u7684\u7B26\u53F7\uFF1A\u7C7B\u65F6\u4E3A\u8D1F\u53F7\u7EA6\u5B9A\u4E0B c\xB2dt\xB2>dx\xB2", "\u95F5\u53EF\u592B\u65AF\u57FA\u95F4\u9694", "1+1 \u7EF4", "dt=2:0:10:s,dx=1e8:0:1e9:m", "c0*c0*dt*dt-dx*dx", "s\xB2", "m\xB2", "engineering"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u5F15\u529B\u900F\u955C", "\u70B9\u8D28\u91CF\u7231\u56E0\u65AF\u5766\u89D2 \u03B8E=\u221A(4GM D_ls/(c\xB2 D_l D_s)) \u7684\u91CF\u7EA7", "Schneider, \u8584\u900F\u955C\u7231\u56E0\u65AF\u5766\u534A\u5F84", "\u70B9\u8D28\u91CF\u3001\u5C0F\u89D2\uFF0C\u8DDD\u79BB\u7ED9\u5B9A\u800C\u4E0D\u662F\u5DE1\u5929\u62DF\u5408", "M=2e30:1e20:1e36:kg,Dl=1e25:1e22:1e27:m,Ds=2e25:1e22:1e27:m", "sqrt(4*Ggrav*M*max(0,Ds-Dl)/(c0*c0*Dl*Ds))", "\u03B8E", "rad", "principle"),
  r3("\u76F8\u5BF9\u8BBA\xB7\u9ED1\u6D1E", "\u53F2\u74E6\u897F\u534A\u5F84 Rs=2GM/c\xB2", "Schwarzschild \u534A\u5F84", "\u7403\u5BF9\u79F0\u771F\u7A7A\u89E3\u7684\u89C6\u754C\u534A\u5F84\uFF0C\u4E0D\u662F\u5929\u4F53\u5DE5\u7A0B", "M=2e30:1e20:1e36:kg", "2*Ggrav*M/(c0*c0)", "Rs", "m", "engineering"),
  r3("\u5929\u4F53\xB7\u5F00\u666E\u52D2\u8F68\u9053", "T\xB2=a\xB3\uFF08\u5E74\u4E0E AU\u3001\u592A\u9633\u8D28\u91CF\uFF09", "\u5F00\u666E\u52D2\u7B2C\u4E09\u5B9A\u5F8B", "\u4E24\u4F53\u3001\u4E3B\u661F\u4E3A\u592A\u9633\u8D28\u91CF", "a=1:0.1:40:AU", "sqrt(a*a*a)", "T", "\u5E74", "engineering"),
  r3("\u5929\u4F53\xB7\u53CC\u661F", "\u76F8\u5BF9\u8F68\u9053 T\xB2=4\u03C0\xB2 a\xB3/(G(m1+m2))", "\u4E24\u4F53\u5F00\u666E\u52D2", "\u70B9\u8D28\u91CF", "a=1.5e11:1e9:1e13:m,m1=2e30:1e28:1e32:kg,m2=2e30:1e28:1e32:kg", "sqrt(4*pi*pi*a*a*a/(Ggrav*(m1+m2)))/3.15576e7", "T", "\u5E74", "engineering"),
  r3("\u5929\u4F53\xB7\u4E09\u4F53", "\u9650\u5236\u6027\u4E09\u4F53\u6CA1\u6709\u4E00\u822C\u95ED\u5408\u89E3\uFF1B\u5E0C\u5C14\u534A\u5F84 r_H=a (m/3M)^{1/3}", "Hill \u7403", "\u5706\u578B\u9650\u5236\u6027\u4E09\u4F53\u7684\u7A33\u5B9A\u8303\u56F4\u4F30\u8BA1\uFF0C\u4E0D\u662F\u4E09\u4F53\u79EF\u5206\u5668", "a=1.5e11:1e9:1e13:m,m=6e24:1e20:1e28:kg,M=2e30:1e28:1e32:kg", "a*(m/(3*M))^(1/3)", "rH", "m", "principle"),
  r3("\u5929\u4F53\xB7N\u4F53", "\u4E24\u4F53\u80FD\u91CF E=\xBD\u03BCv\xB2\u2212G m1 m2/r \u7684\u7B26\u53F7\u5224\u65AD\u675F\u7F1A", "\u4E24\u4F53\u95EE\u9898", "\u53EA\u5224\u65AD\u4E00\u5BF9\uFF0C\u4E0D\u662F N \u4F53\u79EF\u5206", "mu=1e24:1e18:1e30:kg,v=3000:0:1e5:m/s,m1=2e30:1e20:1e32:kg,m2=6e24:1e18:1e28:kg,r=1.5e11:1e7:1e13:m", "0.5*mu*v*v-Ggrav*m1*m2/r", "E", "J", "principle"),
  r3("\u5929\u4F53\xB7\u6F6E\u6C50", "\u6F6E\u6C50\u52A0\u901F\u5EA6\u5DEE \u0394a\u22482 G M R / d\xB3", "\u6F6E\u6C50\u573A\u7684\u5076\u6781\u5DEE", "d\u226BR", "M=2e30:1e22:1e32:kg,R=6.4e6:1e5:1e8:m,d=1.5e11:1e8:1e13:m", "2*Ggrav*M*R/(d*d*d)", "\u0394a", "m/s\xB2", "engineering"),
  r3("\u5929\u4F53\xB7\u884C\u661F\u73AF", "\u6D1B\u5E0C\u6781\u9650 d\u22482.44 R (\u03C1p/\u03C1s)^{1/3}", "\u6D41\u4F53\u6D1B\u5E0C\u6781\u9650\u7684\u5E38\u7528\u7CFB\u6570", "\u6D41\u4F53\u536B\u661F\u3001\u4E3B\u661F\u81EA\u8F6C\u5FFD\u7565", "R=7e7:1e6:1e9:m,rhop=1000:100:10000:kg/m3,rhos=500:50:5000:kg/m3", "2.44*R*(rhop/rhos)^(1/3)", "d", "m", "principle"),
  r3("\u5929\u4F53\xB7\u65E5\u98DF\u6708\u98DF", "\u672C\u5F71\u957F\u5EA6\u8FD1\u4F3C L=R_s D/(R_sun\u2212R_s) \u5728 R_sun>R_s \u65F6", "\u76F8\u4F3C\u4E09\u89D2\u5F62\u672C\u5F71", "\u70B9\u5149\u6E90\u9525\uFF0C\u4E0D\u662F\u5177\u4F53\u5386\u4E66", "Rs=6.4e6:1e6:1e8:m,D=1.5e11:1e9:1e12:m,Rsun=7e8:1e8:2e9:m", "Rs*D/max(1,Rsun-Rs)", "L", "m", "principle"),
  r3("\u5929\u4F53\xB7\u6052\u661F\u6F14\u5316", "\u4E3B\u5E8F\u8D28\u91CF-\u5149\u5EA6\u7684\u7ECF\u9A8C\u5E42\u5F8B L/Lsun\u2248(M/Msun)^3.5", "\u4E3B\u5E8F\u7ECF\u9A8C\u8D28\u5149\u5173\u7CFB", "\u7ECF\u9A8C\u62DF\u5408\uFF0C\u4E0D\u662F\u6052\u661F\u7ED3\u6784\u65B9\u7A0B", "M=2:0.2:20:\u2014", "M^3.5", "L/Lsun", "\u2014", "principle"),
  r3("\u5929\u4F53\xB7\u8D85\u65B0\u661F", "Ia \u578B\u5CF0\u503C\u7EDD\u5BF9\u661F\u7B49\u7ECF\u9A8C\u503C\u7EA6 \u221219.3 \u7684\u8DDD\u79BB\u6A21\u6570 m\u2212M=5 log10(d/10pc)", "\u8DDD\u79BB\u6A21\u6570", "\u6807\u51C6\u70DB\u5149\u53EA\u4F5C\u8DDD\u79BB\u5B9A\u4E49\uFF0C\u4E0D\u662F\u7206\u53D1\u673A\u5236\u8BBE\u8BA1", "d=1e7:1:1e9:pc", "5*log10(d/10)-19.3", "m", "mag", "principle"),
  r3("\u5929\u4F53\xB7\u661F\u7CFB\u65CB\u8F6C", "\u89C2\u6D4B\u901F\u5EA6\u9AD8\u4E8E\u53EF\u89C1\u8D28\u91CF\u7684\u5F00\u666E\u52D2\u901F\u5EA6\u65F6\u5DEE\u989D \u0394v\xB2=v_obs\xB2\u2212GM/r", "\u65CB\u8F6C\u66F2\u7EBF\u4E0E\u5F00\u666E\u52D2\u9884\u671F\u4E4B\u5DEE", "\u7403\u5BF9\u79F0\u53EF\u89C1\u8D28\u91CF\uFF0C\u5DEE\u989D\u4E0D\u662F\u6697\u7269\u8D28\u7C92\u5B50\u6A21\u578B", "v=2e5:1e4:4e5:m/s,M=1e41:1e38:1e43:kg,r=1e20:1e18:1e22:m", "v*v-Ggrav*M/r", "\u0394v\xB2", "m\xB2/s\xB2", "principle"),
  r3("\u5B87\u5B99\xB7\u5927\u7206\u70B8", "\u8F90\u5C04\u4E3B\u5BFC a\u221Dage^{1/2} \u7684\u6BD4\u4F8B", "Friedmann \u65B9\u7A0B\u8F90\u5C04\u4E3B\u5BFC\u89E3", "\u5E73\u5766\u3001\u53EA\u542B\u8F90\u5C04\uFF0C\u4E0D\u662F\u5B87\u5B99\u5B66\u53C2\u6570\u62DF\u5408\u3002age \u662F\u5B87\u5B99\u65F6\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "age=1:0.01:100:\u2014", "sqrt(age)", "a/a1", "\u2014", "principle"),
  r3("\u5B87\u5B99\xB7\u81A8\u80C0", "\u54C8\u52C3\u5B9A\u5F8B v=H0 d", "\u54C8\u52C3-\u52D2\u6885\u7279\u5B9A\u5F8B", "\u4F4E\u7EA2\u79FB", "H0=70:50:90:km/s/Mpc,d=100:0.1:5000:Mpc", "H0*d", "v", "km/s", "engineering"),
  r3("\u5B87\u5B99\xB7\u7EA2\u79FB", "z=v/c\uFF08\u4F4E\u7EA2\u79FB\uFF09", "\u7EA2\u79FB\u5B9A\u4E49\u7684\u4F4E\u901F\u8FD1\u4F3C", "v\u226Ac", "v=3000:0:1e5:km/s", "v/(c0/1000)", "z", "\u2014", "principle"),
  r3("\u5B87\u5B99\xB7\u5B87\u5B99\u5FAE\u6CE2\u80CC\u666F", "\u7EF4\u6069 \u03BBmax T=2.897e\u22123", "\u7EF4\u6069\u4F4D\u79FB\u5B9A\u5F8B", "\u9ED1\u4F53", "T=2.725:1:10:K", "0.002897/T", "\u03BBmax", "m", "engineering"),
  r3("\u5B87\u5B99\xB7\u6697\u7269\u8D28", "\u65CB\u8F6C\u66F2\u7EBF\u5DEE\u989D\u5DF2\u5728\u661F\u7CFB\u65CB\u8F6C\uFF1B\u6B64\u5904\u7ED9\u5BC6\u5EA6\u53C2\u6570\u5B9A\u4E49 \u03A9=\u03C1/\u03C1c\uFF0C\u03C1c=3H\xB2/8\u03C0G", "\u4E34\u754C\u5BC6\u5EA6", "\u4E0D\u662F\u7C92\u5B50\u5019\u9009\u6A21\u578B", "H=2.2e-18:1e-18:5e-18:1/s", "3*H*H/(8*pi*Ggrav)", "\u03C1c", "kg/m\xB3", "engineering"),
  r3("\u5B87\u5B99\xB7\u6697\u80FD\u91CF", "\u5FB7\u897F\u7279\u6307\u6570 a\u221Dexp(H t)\uFF0CH=\u221A(\u039B/3)", "\u771F\u7A7A\u80FD\u4E3B\u5BFC\u7684 Friedmann \u65B9\u7A0B", "\u5E38\u6570 \u039B\uFF0C\u4E0D\u662F\u89C2\u6D4B\u62DF\u5408\u6D41\u7A0B", "Lam=1e-35:1e-40:1e-33:1/s2", "sqrt(Lam/3)", "H", "1/s", "principle"),
  r3("\u5B87\u5B99\xB7\u7ED3\u6784\u5F62\u6210", "\u91D1\u65AF\u957F\u5EA6 \u03BBJ=cs \u221A(\u03C0/(G \u03C1))", "Jeans \u957F\u5EA6", "\u5747\u5300\u9759\u6001\u80CC\u666F\u7684\u7ECF\u5178\u5224\u636E", "cs=1e4:100:1e6:m/s,rho=1e-20:1e-26:1e-15:kg/m3", "cs*sqrt(pi/(Ggrav*rho))", "\u03BBJ", "m", "principle"),
  r3("\u5B87\u5B99\xB7\u66B4\u80C0", "\u6162\u6EDA\u53C2\u6570 \u03B5=(Mpl\xB2/2)(V\u2032/V)\xB2 \u7684\u793A\u610F\uFF0CV\u2032/V \u7ED9\u5B9A", "\u6162\u6EDA\u5B9A\u4E49", "\u4E0D\u662F\u66B4\u80C0\u6A21\u578B\u6784\u9020", "Vp=1e-6:1e-10:0.01:\u2014,Mpl=1:0.1:10:\u2014", "0.5*Mpl*Mpl*Vp*Vp", "\u03B5", "\u2014", "principle"),
  r3("\u5B87\u5B99\xB7\u5F15\u529B\u6CE2", "\u5E94\u53D8 h\u223C(G/c\u2074) (E_kin / r) \u7684\u91CF\u7EA7\u4F30\u8BA1", "\u56DB\u6781\u8F90\u5C04\u7684\u91CF\u7EA7", "\u4E0D\u662F\u6CE2\u5F62\u6A21\u677F\u6216\u63A2\u6D4B\u5668\u8BBE\u8BA1", "E=1e44:1e30:1e48:J,r=1e24:1e20:1e26:m", "(Ggrav/(c0^4))*E/r", "h", "\u2014", "principle"),
  r3("\u7C92\u5B50\xB7\u6807\u51C6\u6A21\u578B", "\u7CBE\u7EC6\u7ED3\u6784 \u03B1=e\xB2/(4\u03C0 \u03B50 \u210F c)\uFF1B\u793A\u610F\u6807\u5EA6 \u03B1_eff=\u03B1\xB7scale", "\u7CBE\u7EC6\u7ED3\u6784\u5E38\u6570", "\u4F4E\u80FD\u5B9A\u4E49\u503C\u7684\u6807\u5EA6\u793A\u610F\uFF0C\u4E0D\u662F\u65B0\u7C92\u5B50", "scale=1:0.1:10:\u2014", "scale*(qe*qe)/(4*pi*eps0*hbar*c0)", "\u03B1_eff", "\u2014", "engineering"),
  r3("\u7C92\u5B50\xB7\u8870\u53D8", "N=N0 e^{\u2212\u03BB t}", "\u6307\u6570\u8870\u53D8", "\u5355\u4E00\u6838\u7D20\u3001\u5E38\u6570 \u03BB\u3002e^{\u2212\u03BBt} \u6309\u53CC\u7CBE\u5EA6\u8BA1\u7B97\uFF0C\u4E0D\u5728 \xB140 \u5904\u622A\u65AD", "N0=1000:1:1e9:\u2014,lam=0.1:0.001:5:1/s", "N0*exp(-lam*t)", "N", "\u2014", "engineering"),
  r3("\u7C92\u5B50\xB7\u6563\u5C04", "\u5362\u745F\u798F\u5FAE\u5206\u622A\u9762 d\u03C3/d\u03A9=(1/(4\u03C0\u03B50) z1 z2 e\xB2/(4E))\xB2 / sin\u2074(\u03B8/2)", "\u5362\u745F\u798F\u6563\u5C04", "\u70B9\u7535\u8377\u5E93\u4ED1\u6563\u5C04\u3001\u56FA\u5B9A\u9776", "E=1e-12:1e-15:1e-10:J,theta=0.5:0.05:3:rad", "((1/(4*pi*eps0))*qe*qe/(4*E))^2/(sin(theta/2)^4)", "d\u03C3", "m\xB2/sr", "principle"),
  r3("\u7C92\u5B50\xB7\u5BF9\u649E", "\u8D28\u5FC3\u80FD\u91CF \u221As\u22482 E\uFF08\u7B49\u80FD\u91CF\u5BF9\u5934\u78B0\u3001\u9AD8\u80FD\uFF09", "\u9AD8\u80FD\u5BF9\u649E\u7684\u8D28\u5FC3\u80FD\u91CF", "\u7B49\u80FD\u91CF\u3001\u5FFD\u7565\u8D28\u91CF", "E=7000:1:20000:GeV", "2*E", "\u221As", "GeV", "principle"),
  r3("\u7C92\u5B50\xB7\u8D39\u66FC\u56FE", "\u6811\u56FE\u9636\u6570\u4E0E\u8026\u5408\u5E42\uFF1A\u632F\u5E45\u91CF\u7EA7 \u221D \u03B1^{n/2}\uFF0Cn \u4E3A\u9876\u70B9\u793A\u610F", "\u5FAE\u6270\u8BBA\u7684\u8026\u5408\u8BA1\u6570", "\u4E0D\u662F\u622A\u9762\u8BA1\u7B97\uFF0C\u4E5F\u4E0D\u662F\u65B0\u56FE\u751F\u6210", "n=2:2:8:\u2014,alpha=0.007297:0.001:0.1:\u2014", "alpha^(n/2)", "M", "\u2014", "principle"),
  r3("\u7C92\u5B50\xB7\u4E2D\u5FAE\u5B50\u632F\u8361", "\u771F\u7A7A\u632F\u8361\u957F\u5EA6 L=4\u03C0 E / \u0394m\xB2 \u7684\u4E24\u5473\u516C\u5F0F\u76F8\u4F4D \u0394m\xB2 L/(4E)", "\u4E24\u5473\u771F\u7A7A\u632F\u8361", "\u516C\u5F00\u7684\u632F\u8361\u76F8\u4F4D\uFF0C\u4E0D\u662F\u5B9E\u9A8C\u88C5\u7F6E", "dm2=7.5e-5:1e-6:0.003:eV2,L=1000:1:1e5:km,E=2:0.1:20:GeV", "1.267*dm2*L/E", "\u0394m\xB2L/4E", "rad", "principle"),
  r3("\u7C92\u5B50\xB7\u5E0C\u683C\u65AF", "\u771F\u7A7A\u671F\u671B\u4E0E\u8D28\u91CF\u5173\u7CFB\u7684\u6559\u5B66\u5F0F m=y v/\u221A2\uFF0Cv\u2248246 GeV", "\u7535\u5F31\u5BF9\u79F0\u7834\u7F3A\u540E\u7684\u8D39\u7C73\u5B50\u8D28\u91CF\u5F0F", "\u7ED9\u5B9A\u6C64\u5DDD\u8026\u5408\uFF0C\u4E0D\u662F\u5BF9\u649E\u673A\u5206\u6790", "y=0.01:0.0001:1:\u2014", "y*246/sqrt(2)", "m", "GeV", "principle"),
  r3("\u7C92\u5B50\xB7\u5938\u514B\u7981\u95ED", "\u7EBF\u6027\u52BF V=\u03C3 r \u7684\u5F26\u5F20\u529B\u7ECF\u9A8C\u91CF\u7EA7", "\u91CD\u5938\u514B\u52BF\u7684\u7EBF\u6027\u9879", "\u552F\u8C61\u5F26\u5F20\u529B\uFF0C\u4E0D\u662F\u683C\u70B9 QCD \u8BA1\u7B97\u6D41\u7A0B", "sigma=0.18:0.05:0.4:GeV2,r=1:0.1:5:GeV-1", "sigma*r", "V", "GeV", "principle"),
  r3("\u7C92\u5B50\xB7CP\u7834\u574F", "\u8870\u53D8\u4E0D\u5BF9\u79F0 A=(N\u2212N\u0304)/(N+N\u0304)", "CP \u4E0D\u5BF9\u79F0\u7684\u8BA1\u6570\u5B9A\u4E49", "\u53EA\u505A\u8BA1\u6570\u5B9A\u4E49", "Np=120:0:1e6:\u2014,Nm=100:0:1e6:\u2014", "(Np-Nm)/(Np+Nm)", "A", "\u2014", "engineering"),
  r3("\u7C92\u5B50\xB7\u5B87\u5B99\u7EBF", "\u5927\u6C14\u6DF1\u5EA6\u6307\u6570\u8870\u51CF I=I0 e^{\u2212X/\u039B}", "\u5B87\u5B99\u7EBF\u7C07\u5C04\u7684\u6307\u6570\u5438\u6536\u552F\u8C61", "\u4E0D\u662F\u7EA7\u8054\u6A21\u62DF", "I0=1:0:10:\u2014,X=500:0:2000:g/cm2,Lam=120:20:300:g/cm2", "I0*exp(-X/Lam)", "I", "\u2014", "principle"),
  r3("\u51DD\u805A\u6001\xB7\u6676\u4F53\u7ED3\u6784", "\u7ACB\u65B9\u6676\u80DE\u539F\u5B50\u6570\u4E0E\u5BC6\u5EA6 \u03C1=n M/(NA a\xB3)", "\u6676\u4F53\u5BC6\u5EA6", "\u4E00\u79CD\u539F\u5B50\u3001\u7ACB\u65B9\u6676\u80DE", "n=4:1:8:\u2014,M=0.056:0.001:0.3:kg/mol,a=4e-10:1e-10:1e-9:m", "n*M/(NA*a*a*a)", "\u03C1", "kg/m\xB3", "engineering"),
  r3("\u51DD\u805A\u6001\xB7\u58F0\u5B50", "\u5FB7\u62DC\u9891\u7387\u91CF\u7EA7 \u03C9D=kB \u0398D/\u210F", "\u5FB7\u62DC\u6E29\u5EA6\u5B9A\u4E49", "\u7ED9\u5B9A \u0398D", "TD=300:10:2000:K", "kB*TD/hbar", "\u03C9D", "rad/s", "engineering"),
  r3("\u51DD\u805A\u6001\xB7\u80FD\u5E26", "\u8FD1\u81EA\u7531\u7535\u5B50\u5E26\u9699 2|U_G|", "\u4E00\u7EF4\u8FD1\u81EA\u7531\u7535\u5B50", "\u5F31\u5468\u671F\u52BF", "U=0.5:0:5:eV", "2*abs(U)", "Eg", "eV", "principle"),
  r3("\u51DD\u805A\u6001\xB7\u8D39\u7C73\u9762", "\u81EA\u7531\u7535\u5B50 kF=(3\u03C0\xB2 n)^{1/3}", "\u81EA\u7531\u7535\u5B50\u8D39\u7C73\u6CE2\u77E2", "\u4E09\u7EF4\u81EA\u7531\u7535\u5B50\u6C14", "n=1e28:1e26:1e30:1/m3", "(3*pi*pi*n)^(1/3)", "kF", "1/m", "engineering"),
  r3("\u51DD\u805A\u6001\xB7\u78C1\u6027", "\u5C45\u91CC\u5B9A\u5F8B \u03C7=C/T", "\u987A\u78C1\u5C45\u91CC\u5B9A\u5F8B", "\u9AD8\u6E29\u3001\u65E0\u76F8\u4E92\u4F5C\u7528\u8FD1\u4F3C", "C=1:0.01:10:K,T=300:1:1000:K", "C/T", "\u03C7", "\u2014", "principle"),
  r3("\u51DD\u805A\u6001\xB7\u94C1\u7535", "\u7535\u4F4D\u79FB D=\u03B50 E+P", "\u7535\u4ECB\u8D28\u672C\u6784", "\u7EBF\u6027\u3001P \u7ED9\u5B9A", "E=1e5:0:1e7:V/m,P=0.01:0:0.5:C/m2", "eps0*E+P", "D", "C/m\xB2", "engineering"),
  r3("\u51DD\u805A\u6001\xB7\u62D3\u6251\u7EDD\u7F18\u4F53", "\u4E8C\u7EF4\u62D3\u6251\u4E0D\u53D8\u91CF\u53EA\u80FD\u53D6\u6574\u6570\uFF1B\u6B64\u5904\u5C55\u793A\u8FB9\u7F18\u6001\u6570\u76EE\u7B49\u4E8E |C| \u7684\u4F53\u8FB9\u5BF9\u5E94\u8BA1\u6570", "TKNN / \u4F53\u8FB9\u5BF9\u5E94", "\u53EA\u505A\u6574\u6570\u8BA1\u6570\uFF0C\u4E0D\u662F\u6750\u6599\u641C\u7D22", "C=1:-3:3:\u2014", "abs(C)", "n_edge", "\u2014", "principle"),
  r3("\u975E\u7EBF\u6027\xB7\u5355\u6446\u5927\u89D2\u5EA6", "\u5468\u671F T=4 \u221A(L/g) K(sin\xB2(\u03B80/2)) \u7684\u5C0F\u89D2\u4FEE\u6B63 T\u2248T0(1+\u03B80\xB2/16)", "\u692D\u5706\u79EF\u5206\u7684\u5C0F\u89D2\u5C55\u5F00", "\u03B80 \u4EE5\u5F27\u5EA6\u3001\u4E2D\u7B49\u89D2\u5EA6", "L=1:0.1:3:m,th=1:0.1:2.5:rad", "2*pi*sqrt(L/g)*(1+th*th/16)", "T", "s", "principle"),
  r3("\u975E\u7EBF\u6027\xB7\u675C\u82AC\u632F\u5B50", "\u5F31\u975E\u7EBF\u6027\u9891\u7387 \u03C9\xB2=\u03C90\xB2+(3/4)\u03B2 A\xB2", "Duffing \u9AA8\u67B6\u66F2\u7EBF", "\u65E0\u963B\u5C3C\u3001\u5F31\u975E\u7EBF\u6027", "w0=2:0.2:8:rad/s,beta=1:-5:5:1/m2s2,A=0.4:0:1.5:m", "sqrt(max(0.01,w0*w0+0.75*beta*A*A))", "\u03C9", "rad/s", "principle"),
  r3("\u975E\u7EBF\u6027\xB7\u6D1B\u4F26\u8328", "\u03C3\u3001\u03C1\u3001\u03B2 \u7684\u7ECF\u5178\u53C2\u6570\u4E0B\u6563\u5EA6 \u2212(\u03C3+1+\u03B2)<0", "Lorenz 1963 \u7684\u76F8\u4F53\u79EF\u6536\u7F29", "\u53C2\u6570\u53EF\u8C03\uFF0C\u8FD9\u91CC\u7ED9\u51FA\u6536\u7F29\u7387\u800C\u4E0D\u662F\u8F68\u8FF9\u79EF\u5206", "sigma=10:0:30:\u2014,rho=28:0:80:\u2014,beta=2.667:0:10:\u2014", "-(sigma+1+beta)", "div", "1/s", "principle"),
  r3("\u975E\u7EBF\u6027\xB7Rossler", "R\xF6ssler \u53C2\u6570 a,b,c \u4E0B\u7684\u4E00\u4E2A\u5E73\u8861 z=c\u2212\u221A(c\xB2\u22124ab) \u5F53 c\xB2>4ab", "R\xF6ssler \u7CFB\u7EDF\u5E73\u8861\u70B9", "\u53EA\u6C42\u5E73\u8861\uFF0C\u4E0D\u79EF\u5206\u6DF7\u6C8C\u8F68\u8FF9", "a=0.2:0:1:\u2014,b=0.2:0:2:\u2014,c=5.7:0:20:\u2014", "c-sqrt(max(0,c*c-4*a*b))", "z*", "\u2014", "principle"),
  r3("\u975E\u7EBF\u6027\xB7\u8521\u6C0F\u7535\u8DEF", "\u5206\u6BB5\u7EBF\u6027\u8D1F\u963B\u7684\u659C\u7387\u5DEE\u51B3\u5B9A\u5C40\u90E8\u4E0D\u7A33\u5B9A\uFF1B\u793A\u610F \u03B1\u3001\u03B2 \u7684\u7279\u5F81\u53C2\u6570\u4E58\u79EF", "Chua \u7535\u8DEF\u65E0\u91CF\u7EB2\u53C2\u6570", "\u4E0D\u662F\u7535\u8DEF\u5236\u4F5C\u6B65\u9AA4", "alpha=9:0:20:\u2014,beta=14:0:40:\u2014", "alpha*beta", "\u03B1\u03B2", "\u2014", "principle"),
  r3("\u975E\u7EBF\u6027\xB7\u5206\u5C94", "\u903B\u8F91\u65AF\u8C1B\u6620\u5C04 r=3 \u5904\u7531\u5B9A\u6001\u5931\u7A33\uFF0C\u500D\u5468\u671F\u8D77\u70B9", "May \u903B\u8F91\u65AF\u8C1B\u6620\u5C04", "\u4E00\u7EF4\u6620\u5C04", "r=3.2:0:4:\u2014", "r", "r", "\u2014", "engineering"),
  r3("\u975E\u7EBF\u6027\xB7\u6DF7\u6C8C", "\u903B\u8F91\u65AF\u8C1B r=4 \u7684\u674E\u96C5\u666E\u8BFA\u592B\u6307\u6570 ln2", "r=4 \u7684\u7CBE\u786E\u6307\u6570", "\u8BE5\u53C2\u6570", "r=4:3.6:4:\u2014", "ln2*(r/4)", "\u03BB", "\u2014", "principle"),
  r3("\u975E\u7EBF\u6027\xB7\u5206\u5F62", "\u76D2\u8BA1\u6570\u7EF4 D=ln N/ln(1/\u03B5)", "\u76D2\u8BA1\u6570\u7EF4\u5B9A\u4E49", "\u4E00\u79CD\u8986\u76D6", "N=100:1:1e6:\u2014,eps=0.1:0.001:0.5:\u2014", "ln(N)/ln(1/eps)", "D", "\u2014", "engineering"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u5206\u5B50\u52A8\u529B\u5B66", "Verlet \u4F4D\u7F6E\u8BEF\u5DEE\u4E3B\u9879 O(\u0394t\xB2)\uFF1A\u793A\u610F\u622A\u65AD (1/2) a \u0394t\xB2 \u88AB\u4E22\u6389\u7684\u76F8\u5BF9\u91CF", "Verlet \u7684\u5C40\u90E8\u622A\u65AD", "\u4E0D\u662F\u52BF\u51FD\u6570\u62DF\u5408", "a=1:0:100:\u2014,dt=0.01:1e-4:0.2:\u2014", "0.5*abs(a)*dt*dt", "err", "\u2014", "principle"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u8499\u7279\u5361\u6D1B", "\u6837\u672C\u5747\u503C\u6807\u51C6\u8BEF \u03C3/\u221AN", "\u72EC\u7ACB\u62BD\u6837", "\u6709\u9650\u65B9\u5DEE", "sigma=1:0.01:10:\u2014,N=100:1:1e6:\u2014", "sigma/sqrt(N)", "se", "\u2014", "engineering"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u683C\u5B50\u73BB\u5C14\u5179\u66FC", "D2Q9 \u58F0\u901F cs=1/\u221A3\uFF08\u683C\u5B50\u5355\u4F4D\uFF09", "LBM \u5E73\u8861\u5206\u5E03\u7684\u58F0\u901F", "\u683C\u5B50\u5355\u4F4D", "x=1:0:1:\u2014", "1/sqrt(3)", "cs", "\u683C/\u6B65", "engineering"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u6709\u9650\u5DEE\u5206", "\u4E8C\u9636\u4E2D\u5FC3\u5DEE\u5206\u622A\u65AD O(h\xB2)", "\u6709\u9650\u5DEE\u5206", "\u5149\u6ED1\u51FD\u6570", "h=0.1:0.001:1:\u2014", "h*h", "O(h\xB2)", "\u2014", "principle"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u6709\u9650\u5143", "\u7EBF\u6027\u5143\u7684\u6536\u655B\u9636\u5728\u80FD\u91CF\u8303\u6570\u5E38\u4E3A O(h)", "\u6709\u9650\u5143\u6536\u655B", "\u89C4\u5219\u7F51\u683C\u3001\u89E3\u8DB3\u591F\u5149\u6ED1\u7684\u5178\u578B\u9636", "h=0.1:0.001:1:\u2014", "h", "err", "\u2014", "principle"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u8FB9\u754C\u5143", "\u4E09\u7EF4\u62C9\u666E\u62C9\u65AF\u57FA\u672C\u89E3 1/(4\u03C0r)", "\u81EA\u7531\u7A7A\u95F4\u57FA\u672C\u89E3", "\u65E0\u754C\u57DF", "r=0.2:0.01:5:m", "1/(4*pi*r)", "G", "1/m", "engineering"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u8C31\u65B9\u6CD5", "\u5085\u91CC\u53F6\u8C31\u7684\u6700\u9AD8\u6CE2\u6570 kmax=\u03C0/\u0394x", "\u8C31\u914D\u7F6E\u7684\u5948\u594E\u65AF\u7279\u6CE2\u6570", "\u5468\u671F\u533A\u95F4", "dx=0.05:0.001:1:\u2014", "pi/dx", "kmax", "\u2014", "engineering"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u8F9B\u79EF\u5206", "\u8F9B\u6B27\u62C9\u4FDD\u4E8C\u6B21\u4E0D\u53D8\u91CF\u7684\u793A\u610F\uFF1A\u80FD\u91CF\u6F02\u79FB\u4E0D\u968F\u6B65\u6570\u7EBF\u6027\u79EF\u7D2F\uFF0C\u8FD9\u91CC\u7ED9\u51FA\u4E00\u6B65\u7684\u76F8\u7A7A\u95F4\u96C5\u53EF\u6BD4\u884C\u5217\u5F0F 1", "\u8F9B\u683C\u5F0F\u7684\u4FDD\u4F53\u79EF", "\u7EBF\u6027\u8F9B\u6B27\u62C9\u5BF9\u8C03\u548C\u632F\u5B50\u96C5\u53EF\u6BD4\u4E3A 1", "dt=0.1:0.001:1:\u2014", "1+0*dt", "det", "\u2014", "principle"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u5E76\u884C\u8BA1\u7B97", "Amdahl\uFF1AS=1/((1\u2212p)+p/n)", "Amdahl \u5B9A\u5F8B", "\u56FA\u5B9A\u95EE\u9898\u89C4\u6A21", "p=0.9:0:1:\u2014,n=8:1:1024:\u2014", "1/((1-p)+p/n)", "S", "\u2014", "engineering"),
  r3("\u8BA1\u7B97\u7269\u7406\xB7\u53EF\u89C6\u5316", "\u6570\u636E\u8303\u56F4\u7EBF\u6027\u6620\u5C04\u5230\u50CF\u7D20 y=(v\u2212vmin)/(vmax\u2212vmin)", "\u7EBF\u6027\u8272\u6807", "vmax\u2260vmin", "v=0.3:-10:10:\u2014,vmin=0:-10:10:\u2014,vmax=1:-10:10:\u2014", "(v-vmin)/(vmax-vmin)", "t", "\u2014", "engineering"),
  r3("\u751F\u7269\u7269\u7406\xB7\u5FC3\u808C\u7535\u6D3B\u52A8", "RR \u95F4\u671F\u4E0E\u5FC3\u7387 HR=60/RR", "\u5FC3\u7535\u5468\u671F\u7684\u5B9A\u4E49", "\u4E0D\u662F\u8BCA\u65AD", "RR=0.8:0.3:2:s", "60/RR", "HR", "1/min", "engineering"),
  r3("\u751F\u7269\u7269\u7406\xB7DNA\u62C9\u4F38", "\u866B\u72B6\u94FE\u5C0F\u529B\u6781\u9650 x/L\u22481\u2212\u221A(kT/(4 A F)) \u7684\u529B-\u4F38\u957F", "Marko-Siggia \u5C0F\u529B\u6781\u9650\u7684\u53CD\u89E3\u9700\u8981\u529B\uFF1B\u6B64\u5904\u7ED9 kT/A \u7684\u76F8\u5173\u957F\u5EA6\u80FD\u91CF", "\u53EA\u4FDD\u7559\u76F8\u5173\u957F\u5EA6\u80FD\u91CF\u5C3A\u5EA6\uFF0C\u4E0D\u662F\u5355\u5206\u5B50\u5B9E\u9A8C\u6D41\u7A0B", "A=50e-9:10e-9:200e-9:m,T=300:270:320:K", "kB*T/A", "kT/A", "N", "principle"),
  r3("\u751F\u7269\u7269\u7406\xB7\u5206\u5B50\u9A6C\u8FBE", "\u8D1F\u8F7D\u4E0B\u901F\u5EA6\u7684\u7EBF\u6027\u793A\u610F v=v0(1\u2212F/Fs)", "\u5931\u901F\u529B\u9644\u8FD1\u7684\u7EBF\u6027\u8FD1\u4F3C", "\u4E0D\u662F\u9A6C\u8FBE\u5316\u5B66\u5FAA\u73AF\u8BBE\u8BA1", "v0=1e-6:0:1e-4:m/s,F=1:0:20:pN,Fs=5:0.5:30:pN", "v0*max(0,1-F/Fs)", "v", "m/s", "principle"),
  r3("\u751F\u7269\u7269\u7406\xB7\u7EC6\u80DE\u8FD0\u52A8", "\u4F4E\u96F7\u8BFA\u6570\u963B\u529B F=6\u03C0\u03B7Rv", "\u65AF\u6258\u514B\u65AF\u963B\u529B", "\u5C0F\u7403\u3001Re\u226A1", "eta=0.001:1e-4:0.1:Pa\xB7s,R=5e-6:1e-7:5e-5:m,v=1e-5:0:0.001:m/s", "6*pi*eta*R*v", "F", "N", "engineering"),
  r3("\u751F\u7269\u7269\u7406\xB7\u5149\u9057\u4F20", "\u9608\u503C\u4EE5\u4E0A\u7684\u53D1\u653E\u7528\u9636\u8DC3\u8868\u793A\uFF0C\u7535\u6D41\u8D85\u8FC7 Ith \u5219\u53D1\u653E", "\u9608\u503C\u5355\u5143", "\u4E0D\u662F\u7167\u5149\u65B9\u6848\u6216\u75C5\u6BD2\u8F7D\u4F53", "I=2:0:10:\u2014,Ith=1:0:10:\u2014", "ge(I,Ith)", "spike", "\u2014", "principle"),
  r3("\u751F\u7269\u7269\u7406\xB7\u8111\u7535", "\u4E3B\u8282\u5F8B\u9891\u7387 f", "EEG \u9891\u6BB5\u53EA\u8BB0\u5F55\u4E00\u4E2A\u4E3B\u9891", "\u4E0D\u662F\u4E34\u5E8A\u5224\u8BFB", "f=10:0.5:40:Hz", "f", "f", "Hz", "principle"),
  r3("\u5730\u7403\u7269\u7406\xB7\u5730\u78C1", "\u5076\u6781\u573A B\u221D1/r\xB3\uFF0C\u8D64\u9053 B=B0 (R/r)\xB3", "\u5076\u6781\u5B50\u573A", "\u5730\u78C1\u5076\u6781\u8FD1\u4F3C", "B0=3e-5:1e-6:1e-4:T,R=6.37e6:1e6:1e7:m,r=7e6:6.4e6:2e7:m", "B0*(R/r)^3", "B", "T", "principle"),
  r3("\u5730\u7403\u7269\u7406\xB7\u91CD\u529B\u5F02\u5E38", "\u5E03\u683C\u677F \u0394g=2\u03C0 G \u0394\u03C1 h", "\u65E0\u9650\u5E73\u677F\u5E03\u683C\u6539\u6B63", "\u65E0\u9650\u6C34\u5E73\u677F", "drho=300:-500:2000:kg/m3,h=100:0:5000:m", "2*pi*Ggrav*drho*h", "\u0394g", "m/s\xB2", "engineering"),
  r3("\u5730\u7403\u7269\u7406\xB7\u677F\u5757", "\u677F\u5757\u76F8\u5BF9\u901F\u5EA6\u7684\u5B9A\u4E49 v=d/age", "\u677F\u5757\u8FD0\u52A8\u5B66", "\u521A\u6027\u677F\u5757\u3001\u5E73\u5747\u901F\u5EA6\u3002age \u662F\u5386\u65F6\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "d=1000:0:10000:km,age=10:0.1:200:Ma", "d/age", "v", "km/Ma", "engineering"),
  r3("\u5730\u7403\u7269\u7406\xB7\u706B\u5C71", "\u5CA9\u6D46\u4E0A\u5347\u7684\u6D6E\u529B\u52A0\u901F\u5EA6 (\u0394\u03C1/\u03C1) g", "\u6D6E\u529B", "\u7ED9\u5B9A\u5BC6\u5EA6\u5DEE", "drho=200:0:1000:kg/m3,rho=2700:2000:3300:kg/m3", "(drho/rho)*g", "a", "m/s\xB2", "principle"),
  r3("\u5730\u7403\u7269\u7406\xB7\u6D77\u5578", "\u6D45\u6C34\u6CE2\u901F \u221A(g h)", "\u957F\u6CE2", "\u6C34\u6DF1\u8FDC\u5C0F\u4E8E\u6CE2\u957F", "h=4000:10:8000:m", "sqrt(g*h)", "c", "m/s", "engineering"),
  r3("\u5730\u7403\u7269\u7406\xB7\u5730\u4E0B\u6C34", "\u8FBE\u897F q=\u2212K dh/dl", "\u8FBE\u897F\u5B9A\u5F8B", "\u9971\u548C\u3001\u5C42\u6D41", "K=1e-4:1e-8:0.01:m/s,dh=1:-20:20:m,dl=10:0.1:1000:m", "-K*dh/dl", "q", "m/s", "engineering"),
  r3("\u5730\u7403\u7269\u7406\xB7\u5730\u58F3\u5E94\u529B", "\u5782\u76F4\u5E94\u529B \u03C3v=\u03C1 g z", "\u4E0A\u8986\u5CA9\u5C42\u538B\u529B", "\u5747\u5300\u5BC6\u5EA6", "rho=2700:1800:3300:kg/m3,z=1000:0:20000:m", "rho*g*z", "\u03C3v", "Pa", "engineering"),
  r3("\u5730\u7403\u7269\u7406\xB7\u5730\u7403\u81EA\u7531\u632F\u8361", "\u57FA\u9891\u91CF\u7EA7 f\u223Cv/(2R)", "\u7403\u4F53\u58F0\u5B66\u57FA\u9891\u7684\u91CF\u7EA7", "\u5747\u5300\u7403\u7684\u7C97\u4F30", "v=6000:1000:12000:m/s,R=6371e3:5e6:7e6:m", "v/(2*R)", "f", "Hz", "principle"),
  r3("\u5730\u7403\u7269\u7406\xB7\u677F\u5757\u8FD0\u52A8", "\u540C\u4E00\u5E73\u5747\u901F\u5EA6 v=d/age\uFF0C\u4E0E\u677F\u5757\u6761\u76EE\u5171\u7528\u5B9A\u4E49\u4F46\u5355\u4F4D\u53D6 mm/\u5E74", "\u677F\u5757\u8FD0\u52A8\u901F\u5EA6", "\u521A\u6027\u3002age \u662F\u5386\u65F6\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "d=50:0:500:km,age=1:0.01:20:Ma", "d/age", "v", "km/Ma", "engineering"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u5355\u7C92\u5B50\u8F68\u9053", "R=m v\u22A5/(|q| B)", "\u56DE\u65CB\u534A\u5F84", "\u5747\u5300\u78C1\u573A", "m=1.67e-27:9e-31:3e-26:kg,v=1e5:0:1e7:m/s,q=1.6e-19:1e-20:1e-18:C,B=1:0.01:10:T", "m*v/(q*B)", "R", "m", "engineering"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u78C1\u7EA6\u675F", "\u78C1\u955C\u6BD4 Rm=Bmax/Bmin\uFF0C\u635F\u5931\u9525 sin\xB2\u03B8c=1/Rm", "\u78C1\u955C\u635F\u5931\u9525", "\u7EDD\u70ED\u4E0D\u53D8", "Bmax=2:0.1:20:T,Bmin=0.5:0.05:10:T", "asin(sqrt(min(1,Bmin/Bmax)))*180/pi", "\u03B8c", "\xB0", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u6258\u5361\u9A6C\u514B", "\u5B89\u5168\u56E0\u5B50 q=a B\u03C6/(R B\u03B8) \u7684\u5B9A\u4E49", "\u6258\u5361\u9A6C\u514B\u5B89\u5168\u56E0\u5B50", "\u5706\u622A\u9762\u5927\u73AF\u5F84\u8FD1\u4F3C\uFF0C\u4E0D\u662F\u88C5\u7F6E\u8BBE\u8BA1", "a=1:0.2:3:m,Bphi=5:0.5:15:T,R=3:1:10:m,Bth=0.5:0.05:3:T", "a*Bphi/(R*Bth)", "q", "\u2014", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u7B49\u79BB\u5B50\u4F53\u6CE2", "\u7535\u5B50\u7B49\u79BB\u5B50\u4F53\u9891\u7387 \u03C9p=\u221A(n e\xB2/(\u03B50 m))", "\u51B7\u7B49\u79BB\u5B50\u4F53\u632F\u8361", "\u5747\u5300\u3001\u65E0\u78B0\u649E", "n=1e18:1e14:1e22:1/m3,m=9.1e-31:1e-31:1e-27:kg", "sqrt(n*qe*qe/(eps0*m))", "\u03C9p", "rad/s", "engineering"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u9798\u5C42", "\u73BB\u59C6\u901F\u5EA6 vB=\u221A(kT_e/m_i)", "Bohm \u5224\u636E", "\u51B7\u79BB\u5B50\u3001\u7535\u5B50\u7B49\u6E29", "Te=10:0.1:100:eV,mi=1.67e-27:1e-27:4e-26:kg", "sqrt(Te*qe/mi)", "vB", "m/s", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u7535\u5F27", "\u5F27\u67F1\u7535\u538B\u964D\u8FD1\u4F3C U=E L", "\u5747\u5300\u5F27\u67F1", "E \u7ED9\u5B9A\uFF0C\u4E0D\u662F\u7535\u5F27\u710A\u53C2\u6570\u8BBE\u8BA1", "E=1000:10:1e5:V/m,L=0.01:0.001:0.5:m", "E*L", "U", "V", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u592A\u9633\u98CE", "\u5E15\u514B\u7B49\u6E29\u98CE\u5728\u4E34\u754C\u70B9 vc=\u221A(kT/m) \u91CF\u7EA7", "\u7B49\u6E29\u592A\u9633\u98CE\u58F0\u70B9", "\u7B49\u6E29\u3001\u7403\u5BF9\u79F0\u7684\u4E34\u754C\u901F\u5EA6", "T=1e6:1e4:5e6:K,m=1.67e-27:1e-27:4e-26:kg", "sqrt(kB*T/m)", "vc", "m/s", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u78C1\u5C42", "\u78C1\u5C42\u9876\u538B\u529B\u5E73\u8861 B\xB2/(2\u03BC0)=\u03C1 v\xB2", "\u52A8\u538B\u4E0E\u78C1\u538B\u5E73\u8861", "\u6B63\u5165\u5C04\u505C\u6EDE", "rho=1e-20:1e-22:1e-18:kg/m3,v=4e5:1e4:1e6:m/s", "sqrt(2*mu0*rho*v*v)", "B", "T", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u6781\u5149", "\u6C89\u964D\u7535\u5B50\u80FD\u91CF\u4E0E\u7535\u4F4D e\u03A6", "\u6CBF\u573A\u7535\u4F4D\u964D", "\u7ED9\u5B9A\u7535\u4F4D\uFF0C\u4E0D\u662F\u7A7A\u95F4\u5929\u6C14\u4E1A\u52A1\u6A21\u578B", "Phi=1000:0:2e4:V", "Phi", "E", "eV", "principle"),
  r3("\u7B49\u79BB\u5B50\u4F53\xB7\u7B49\u79BB\u5B50\u4F53\u63A8\u8FDB", "\u7406\u60F3\u63A8\u529B F=\u1E41 ve", "\u53D8\u8D28\u91CF\u63A8\u529B", "\u7ED9\u5B9A\u6392\u6C14\u901F\u5EA6\uFF0C\u4E0D\u662F\u63A8\u8FDB\u5668\u8BBE\u8BA1", "mdot=1e-6:1e-9:0.01:kg/s,ve=2e4:100:1e5:m/s", "mdot*ve", "F", "N", "engineering")
];

// js/lab/rows/cs.js
var r4 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "engineering") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var CS = [
  r4("\u6392\u5E8F\xB7\u5192\u6CE1", "\u6700\u574F\u6BD4\u8F83\u6B21\u6570 n(n\u22121)/2", "CLRS, \u5192\u6CE1\u6392\u5E8F", "\u6700\u574F\u60C5\u51B5\u3001\u76F8\u90BB\u4EA4\u6362", "n=10:1:500:\u2014", "n*(n-1)/2", "C", "\u2014"),
  r4("\u6392\u5E8F\xB7\u9009\u62E9", "\u6BD4\u8F83\u6B21\u6570 n(n\u22121)/2", "CLRS, \u9009\u62E9\u6392\u5E8F", "\u6BCF\u6B21\u5728\u5269\u4F59\u90E8\u5206\u627E\u6700\u5C0F", "n=10:1:500:\u2014", "n*(n-1)/2", "C", "\u2014"),
  r4("\u6392\u5E8F\xB7\u63D2\u5165", "\u6700\u574F\u6BD4\u8F83 n(n\u22121)/2", "CLRS, \u63D2\u5165\u6392\u5E8F", "\u9006\u5E8F\u8F93\u5165", "n=10:1:500:\u2014", "n*(n-1)/2", "C", "\u2014"),
  r4("\u6392\u5E8F\xB7\u5F52\u5E76", "\u6BD4\u8F83\u4E0A\u754C n\u2308log2 n\u2309\u2212n+1", "CLRS, \u5F52\u5E76\u6392\u5E8F", "n\u22651", "n=16:1:4096:\u2014", "n*ceil(log2(n))-n+1", "C", "\u2014"),
  r4("\u6392\u5E8F\xB7\u5FEB\u901F", "\u6700\u574F\u6BD4\u8F83 n(n\u22121)/2", "CLRS, \u5FEB\u901F\u6392\u5E8F\u6700\u574F", "\u5212\u5206\u6781\u5EA6\u4E0D\u5E73\u8861", "n=10:1:500:\u2014", "n*(n-1)/2", "C", "\u2014"),
  r4("\u6392\u5E8F\xB7\u5806", "\u5806\u6392\u5E8F\u6BD4\u8F83\u91CF\u7EA7 2 n log2 n", "CLRS, heapsort", "\u4E0A\u754C\u91CF\u7EA7", "n=16:1:4096:\u2014", "2*n*log2(n)", "C", "\u2014", "principle"),
  r4("\u6392\u5E8F\xB7\u5E0C\u5C14", "Hibbard \u589E\u91CF\u7684\u6BD4\u8F83\u91CF\u7EA7\u7EA6 n^{3/2}", "Shellsort \u5DF2\u77E5\u589E\u91CF\u7684\u4E0A\u754C\u91CF\u7EA7", "\u4E0D\u662F\u67D0\u4E00\u79CD\u589E\u91CF\u7684\u7CBE\u786E\u8BA1\u6570", "n=16:1:4096:\u2014", "n^1.5", "C", "\u2014", "principle"),
  r4("\u6392\u5E8F\xB7\u8BA1\u6570", "\u8BA1\u6570\u6392\u5E8F\u65F6\u95F4 \u0398(n+k)", "CLRS, counting sort", "\u6574\u6570\u952E 0..k", "n=20:1:1e5:\u2014,k=10:0:1e5:\u2014", "n+k", "T", "\u2014"),
  r4("\u6392\u5E8F\xB7\u57FA\u6570", "\u57FA\u6570\u6392\u5E8F \u0398(d(n+k))", "CLRS, radix sort", "d \u4F4D\u3001\u6BCF\u4F4D k \u79CD", "d=4:1:16:\u2014,n=20:1:1e5:\u2014,k=10:2:256:\u2014", "d*(n+k)", "T", "\u2014"),
  r4("\u6392\u5E8F\xB7\u6876", "\u671F\u671B\u7EBF\u6027\u7684\u6876\u6392\u5E8F\u5728\u5747\u5300\u5047\u8BBE\u4E0B \u0398(n)", "CLRS, bucket sort", "\u8F93\u5165\u5747\u5300\u5206\u5E03\u5728 [0,1)", "n=20:1:1e5:\u2014", "n", "T", "\u2014", "principle"),
  r4("\u67E5\u627E\xB7\u7EBF\u6027", "\u6700\u574F\u6BD4\u8F83 n", "\u7EBF\u6027\u67E5\u627E", "\u65E0\u5E8F\u8868", "n=20:1:1e6:\u2014", "n", "C", "\u2014"),
  r4("\u67E5\u627E\xB7\u4E8C\u5206", "\u6700\u574F\u6BD4\u8F83 \u230Alog2 n\u230B+1", "CLRS, \u4E8C\u5206\u67E5\u627E", "\u5DF2\u6392\u5E8F", "n=16:1:1e6:\u2014", "floor(log2(n))+1", "C", "\u2014"),
  r4("\u67E5\u627E\xB7\u63D2\u503C", "\u5747\u5300\u5206\u5E03\u671F\u671B\u6BD4\u8F83\u7EA6 log2 log2 n", "\u63D2\u503C\u67E5\u627E", "\u952E\u5747\u5300\u5206\u5E03", "n=65536:4:1e7:\u2014", "log2(log2(n))", "C", "\u2014", "principle"),
  r4("\u67E5\u627E\xB7\u6590\u6CE2\u90A3\u5951", "\u6590\u6CE2\u90A3\u5951\u67E5\u627E\u6700\u574F\u6BD4\u8F83\u4ECD\u662F O(log n)", "Knuth, \u6590\u6CE2\u90A3\u5951\u67E5\u627E", "\u7528 log2 n \u4F5C\u4E3A\u540C\u9636\u4E0A\u754C", "n=16:1:1e6:\u2014", "floor(log2(n))+1", "C", "\u2014", "principle"),
  r4("\u67E5\u627E\xB7\u54C8\u5E0C", "\u88C5\u8F7D\u56E0\u5B50 \u03B1=n/m", "CLRS, \u94FE\u5F0F\u54C8\u5E0C", "\u7B80\u5355\u5747\u5300\u54C8\u5E0C", "n=100:1:1e6:\u2014,m=64:1:1e6:\u2014", "n/m", "\u03B1", "\u2014"),
  r4("\u67E5\u627E\xB7\u4E8C\u53C9\u641C\u7D22\u6811", "\u968F\u673A BST \u671F\u671B\u6DF1\u5EA6\u7EA6 2 ln n", "CLRS, \u968F\u673A\u6784\u5EFA BST", "\u968F\u673A\u63D2\u5165\u987A\u5E8F", "n=16:1:1e5:\u2014", "2*ln(n)", "depth", "\u2014", "principle"),
  r4("\u67E5\u627E\xB7B\u6811", "\u6700\u5C0F\u5EA6\u6570 ord \u65F6\u9AD8\u5EA6 \u2264 log_ord ((n+1)/2)", "CLRS, B \u6811\u9AD8\u5EA6", "n\u22651\u3002ord \u662F\u6700\u5C0F\u5EA6\u6570\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "n=1000:1:1e7:\u2014,ord=3:2:16:\u2014", "log2((n+1)/2)/log2(ord)", "h", "\u2014"),
  r4("\u67E5\u627E\xB7\u8DF3\u8868", "\u671F\u671B\u67E5\u627E O(log n)", "Pugh, \u8DF3\u8868", "\u968F\u673A\u5C42\u9AD8", "n=16:1:1e6:\u2014", "log2(n)", "C", "\u2014", "principle"),
  r4("\u67E5\u627E\xB7Trie", "\u67E5\u627E\u4EE3\u4EF7\u7B49\u4E8E\u952E\u957F L", "\u5355\u8BCD\u67E5\u627E\u6811", "\u4E00\u6B21\u6210\u529F\u67E5\u627E", "L=8:1:256:\u2014", "L", "C", "\u2014"),
  r4("\u67E5\u627E\xB7\u5E03\u9686\u8FC7\u6EE4\u5668", "\u5047\u9633\u6027 \u2248 (1\u2212e^{\u2212kn/m})^k", "Bloom 1970", "\u72EC\u7ACB\u54C8\u5E0C\u3001\u4F4D\u6570\u7EC4", "k=3:1:16:\u2014,n=100:1:1e6:\u2014,m=1000:8:1e7:\u2014", "(1-exp(-k*n/m))^k", "p", "\u2014", "principle"),
  r4("\u56FE\u7B97\u6CD5\xB7BFS", "\u65E0\u6743\u56FE BFS \u65F6\u95F4 \u0398(V+E)", "CLRS, BFS", "\u90BB\u63A5\u8868", "V=10:1:1e5:\u2014,E=20:0:1e6:\u2014", "V+E", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7DFS", "DFS \u65F6\u95F4 \u0398(V+E)", "CLRS, DFS", "\u90BB\u63A5\u8868", "V=10:1:1e5:\u2014,E=20:0:1e6:\u2014", "V+E", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7Dijkstra", "\u4E8C\u53C9\u5806 Dijkstra \u0398((V+E) log V)", "CLRS", "\u975E\u8D1F\u6743", "V=10:1:1e5:\u2014,E=20:0:1e6:\u2014", "(V+E)*log2(max(2,V))", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7Bellman-Ford", "\u65F6\u95F4 \u0398(V E)", "CLRS, Bellman-Ford", "\u53EF\u6709\u8D1F\u6743\u3001\u65E0\u8D1F\u73AF\u65F6\u6B63\u786E", "V=10:1:5000:\u2014,E=20:0:1e5:\u2014", "V*E", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7Floyd", "\u65F6\u95F4 \u0398(V\xB3)", "Floyd\u2013Warshall", "\u7A20\u5BC6\u5168\u6E90\u6700\u77ED\u8DEF", "V=10:1:400:\u2014", "V*V*V", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7Prim", "\u4E8C\u53C9\u5806 Prim \u0398((V+E) log V)", "CLRS, Prim", "\u65E0\u5411\u8FDE\u901A", "V=10:1:1e5:\u2014,E=20:0:1e6:\u2014", "(V+E)*log2(max(2,V))", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7Kruskal", "\u6392\u5E8F\u652F\u914D\u65F6 \u0398(E log E)", "CLRS, Kruskal", "\u65E0\u5411", "E=20:1:1e6:\u2014", "E*log2(max(2,E))", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7\u62D3\u6251\u6392\u5E8F", "DAG \u62D3\u6251\u6392\u5E8F \u0398(V+E)", "CLRS", "\u6709\u5411\u65E0\u73AF", "V=10:1:1e5:\u2014,E=20:0:1e6:\u2014", "V+E", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7\u5F3A\u8FDE\u901A", "Kosaraju/Tarjan \u0398(V+E)", "CLRS, \u5F3A\u8FDE\u901A\u5206\u91CF", "\u6709\u5411\u56FE", "V=10:1:1e5:\u2014,E=20:0:1e6:\u2014", "V+E", "T", "\u2014"),
  r4("\u56FE\u7B97\u6CD5\xB7\u6700\u5927\u6D41", "Edmonds\u2013Karp \u589E\u5E7F\u6B21\u6570 O(V E)\uFF0C\u65F6\u95F4 O(V E\xB2)", "CLRS, Edmonds\u2013Karp", "\u6574\u6570\u5BB9\u91CF\u7684\u590D\u6742\u5EA6\u4E0A\u754C", "V=8:2:200:\u2014,E=16:1:2000:\u2014", "V*E*E", "T", "\u2014", "principle"),
  r4("\u5B57\u7B26\u4E32\xB7KMP", "KMP \u5339\u914D\u65F6\u95F4 \u0398(n)", "CLRS, KMP", "\u6587\u672C\u957F\u5EA6 n\uFF0C\u6A21\u5F0F\u5DF2\u9884\u5904\u7406", "n=100:1:1e6:\u2014", "n", "T", "\u2014"),
  r4("\u5B57\u7B26\u4E32\xB7Rabin-Karp", "\u671F\u671B\u6BD4\u8F83 \u0398(n+m)", "Rabin\u2013Karp", "\u6EDA\u52A8\u54C8\u5E0C\u671F\u671B", "n=100:1:1e6:\u2014,m=5:1:1000:\u2014", "n+m", "T", "\u2014", "principle"),
  r4("\u5B57\u7B26\u4E32\xB7BM", "\u574F\u5B57\u7B26\u89C4\u5219\u7684\u6700\u574F\u4ECD\u53EF\u80FD O(n m)", "Boyer\u2013Moore \u6700\u574F", "\u6700\u574F\u754C", "n=100:1:5000:\u2014,m=5:1:200:\u2014", "n*m", "T", "\u2014", "principle"),
  r4("\u5B57\u7B26\u4E32\xB7AC\u81EA\u52A8\u673A", "\u591A\u6A21\u5F0F\u5339\u914D \u0398(n+\u603B\u6A21\u5F0F\u957F+\u5339\u914D\u6570)", "Aho\u2013Corasick", "\u81EA\u52A8\u673A\u5DF2\u5EFA\u597D\u65F6\u626B\u63CF\u6587\u672C\u4E3A \u0398(n)", "n=100:1:1e6:\u2014", "n", "T", "\u2014", "principle"),
  r4("\u5B57\u7B26\u4E32\xB7\u540E\u7F00\u6570\u7EC4", "\u6BD4\u8F83\u6784\u9020\u7684\u7ECF\u5178\u4E0A\u754C O(n log n)", "\u540E\u7F00\u6570\u7EC4", "\u6BD4\u8F83\u6A21\u578B", "n=32:1:1e5:\u2014", "n*log2(max(2,n))", "T", "\u2014", "principle"),
  r4("\u5B57\u7B26\u4E32\xB7\u540E\u7F00\u6811", "\u7EBF\u6027\u65F6\u95F4\u6784\u9020 O(n)\uFF08Ukkonen\uFF09", "Ukkonen \u540E\u7F00\u6811", "\u5E38\u6570\u5B57\u6BCD\u8868", "n=32:1:1e5:\u2014", "n", "T", "\u2014", "principle"),
  r4("\u5B57\u7B26\u4E32\xB7LCS", "LCS \u957F\u5EA6\u7531 DP\uFF0C\u65F6\u95F4 \u0398(n m)", "CLRS, LCS", "\u4E24\u4E32", "n=10:1:500:\u2014,m=10:1:500:\u2014", "n*m", "T", "\u2014"),
  r4("\u5B57\u7B26\u4E32\xB7\u7F16\u8F91\u8DDD\u79BB", "Levenshtein DP \u0398(n m)", "Wagner\u2013Fischer", "\u63D2\u5165\u5220\u9664\u66FF\u6362\u4EE3\u4EF7 1", "n=10:1:400:\u2014,m=8:1:400:\u2014", "n*m", "T", "\u2014"),
  r4("\u5B57\u7B26\u4E32\xB7Manacher", "\u6700\u957F\u56DE\u6587\u5B50\u4E32 O(n)", "Manacher", "\u7EBF\u6027\u626B\u63CF", "n=32:1:1e5:\u2014", "n", "T", "\u2014"),
  r4("\u5B57\u7B26\u4E32\xB7\u6B63\u5219\u5339\u914D", "Thompson NFA \u6A21\u62DF O(n m)", "\u6B63\u5219\u8868\u8FBE\u5F0F\u7684 NFA \u6A21\u62DF", "\u6A21\u5F0F\u957F\u5EA6 m\u3001\u6587\u672C n\uFF0C\u65E0\u56DE\u6EAF\u7206\u70B8\u7684 NFA", "n=20:1:5000:\u2014,m=5:1:200:\u2014", "n*m", "T", "\u2014", "principle"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u80CC\u5305", "0-1 \u80CC\u5305\u65F6\u95F4 \u0398(n W)", "CLRS, 0-1 \u80CC\u5305", "\u6574\u6570\u5BB9\u91CF", "n=8:1:200:\u2014,W=20:0:5000:\u2014", "n*W", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7LCS", "LCS DP \u0398(n m)", "CLRS", "\u4E24\u4E32", "n=10:1:400:\u2014,m=10:1:400:\u2014", "n*m", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7LIS", "\u8010\u5FC3\u6392\u5E8F LIS O(n log n)", "\u6700\u957F\u4E0A\u5347\u5B50\u5E8F\u5217", "\u6BD4\u8F83\u6A21\u578B", "n=16:1:5000:\u2014", "n*log2(max(2,n))", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u77E9\u9635\u94FE", "\u77E9\u9635\u94FE DP \u0398(n\xB3)", "CLRS", "n \u4E2A\u77E9\u9635", "n=6:2:80:\u2014", "n*n*n", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7Floyd-Warshall", "\u0398(V\xB3)", "Floyd\u2013Warshall", "\u7A20\u5BC6\u56FE", "V=8:1:200:\u2014", "V*V*V", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u786C\u5E01\u627E\u96F6", "\u5B8C\u5168\u80CC\u5305\u5F0F\u627E\u96F6 \u0398(n A)", "\u786C\u5E01\u95EE\u9898 DP", "n \u79CD\u786C\u5E01\u3001\u91D1\u989D A", "n=4:1:50:\u2014,A=20:0:5000:\u2014", "n*A", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u7F16\u8F91\u8DDD\u79BB", "\u0398(n m)", "\u7F16\u8F91\u8DDD\u79BB DP", "\u4E24\u4E32", "n=10:1:400:\u2014,m=8:1:400:\u2014", "n*m", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u6700\u4F18BST", "Knuth \u6700\u4F18 BST \u0398(n\xB2) \u6216\u6734\u7D20 \u0398(n\xB3)", "CLRS, \u6700\u4F18 BST", "\u8FD9\u91CC\u53D6\u6734\u7D20\u4E09\u91CD\u5FAA\u73AF", "n=8:1:60:\u2014", "n*n*n", "T", "\u2014", "principle"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u65C5\u884C\u5546", "Held\u2013Karp \u0398(n\xB2 2^n)", "Held\u2013Karp", "n \u8F83\u5C0F", "n=8:2:16:\u2014", "n*n*2^n", "T", "\u2014"),
  r4("\u52A8\u6001\u89C4\u5212\xB7\u533A\u95F4DP", "\u533A\u95F4 DP \u5178\u578B \u0398(n\xB3)", "\u533A\u95F4\u5408\u5E76 DP", "\u94FE\u72B6\u533A\u95F4", "n=8:1:80:\u2014", "n*n*n", "T", "\u2014", "principle"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u6808", "\u6570\u7EC4\u6808 push/pop \u5747\u644A \u0398(1)", "\u6808", "\u987A\u5E8F\u5B58\u50A8", "n=1:1:8:\u2014", "1", "T", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u961F\u5217", "\u5FAA\u73AF\u961F\u5217\u5165\u961F\u51FA\u961F \u0398(1)", "\u961F\u5217", "\u5FAA\u73AF\u6570\u7EC4", "n=1:1:8:\u2014", "1", "T", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u94FE\u8868", "\u94FE\u8868\u6309\u4E0B\u6807\u8BBF\u95EE \u0398(i)", "\u5355\u94FE\u8868", "\u4ECE\u5934\u904D\u5386", "i=5:1:1e5:\u2014", "i", "T", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u5806", "\u4E8C\u53C9\u5806\u4E0A\u6D6E O(log n)", "CLRS, \u5806", "\u5B8C\u5168\u4E8C\u53C9\u6811", "n=16:1:1e6:\u2014", "log2(max(2,n))", "T", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u5E76\u67E5\u96C6", "\u6309\u79E9\u5408\u5E76\u5E26\u8DEF\u5F84\u538B\u7F29\uFF0C\u8FD0\u7B97\u9006\u963F\u514B\u66FC \u03B1(n)", "Tarjan \u5E76\u67E5\u96C6", "\u03B1 \u589E\u957F\u6781\u6162\uFF0C\u8FD9\u91CC\u7528\u8FD1\u4F3C 4", "n=1000:1:1e7:\u2014", "4+0*n", "\u03B1", "\u2014", "principle"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u7EBF\u6BB5\u6811", "\u533A\u95F4\u67E5\u8BE2 O(log n)", "\u7EBF\u6BB5\u6811", "\u70B9\u6570 n", "n=16:1:1e6:\u2014", "log2(max(2,n))", "T", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u6811\u72B6\u6570\u7EC4", "\u524D\u7F00\u548C O(log n)", "Fenwick \u6811", "n \u4E2A\u5143\u7D20", "n=16:1:1e6:\u2014", "log2(max(2,n))", "T", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7AVL", "AVL \u9AD8\u5EA6 \u2264 1.44 log2(n+2)", "AVL \u6811\u9AD8\u5EA6\u754C", "n\u22651", "n=16:1:1e6:\u2014", "1.44*log2(n+2)", "h", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7\u7EA2\u9ED1\u6811", "\u7EA2\u9ED1\u6811\u9AD8\u5EA6 \u2264 2 log2(n+1)", "CLRS, \u7EA2\u9ED1\u6811", "n\u22651", "n=16:1:1e6:\u2014", "2*log2(n+1)", "h", "\u2014"),
  r4("\u6570\u636E\u7ED3\u6784\xB7B+\u6811", "\u9636 ord \u7684\u9AD8\u5EA6 O(log_ord n)", "B+ \u6811", "\u53F6\u5B50\u5B58\u8BB0\u5F55\u3002ord \u662F\u9636\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "n=1000:1:1e7:\u2014,ord=50:2:256:\u2014", "log2(max(2,n))/log2(ord)", "h", "\u2014"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7DFA", "DFA \u626B\u63CF \u0398(n)", "Sipser, DFA", "\u8F93\u5165\u957F\u5EA6 n", "n=10:0:1e5:\u2014", "n", "T", "\u2014"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7NFA", "NFA \u5B50\u96C6\u6784\u9020\u6700\u574F 2^{|Q|}", "Sipser, \u5B50\u96C6\u6784\u9020", "\u72B6\u6001\u6570 |Q|", "q=4:1:12:\u2014", "2^q", "states", "\u2014"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7PDA", "CFG \u5230 Chomsky \u8303\u5F0F\u540E CYK \u4E3A O(n\xB3)", "CYK", "\u4E0A\u4E0B\u6587\u65E0\u5173\u8BC6\u522B\u7684\u4E00\u79CD\u7B97\u6CD5", "n=8:1:200:\u2014", "n*n*n", "T", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u56FE\u7075\u673A", "\u5355\u5E26\u56FE\u7075\u673A\u6A21\u62DF\u6B65\u6570\uFF0C\u8FD9\u91CC\u53EA\u8BA1\u8F93\u5165\u957F\u5EA6 n \u7684\u4E00\u6B21\u626B\u63CF", "Sipser, \u56FE\u7075\u673A", "\u4E0D\u662F\u901A\u7528\u505C\u673A\u6C42\u89E3", "n=10:0:1e4:\u2014", "n", "steps", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u6B63\u5219\u8BED\u8A00", "\u6B63\u5219\u8BED\u8A00\u5BF9\u5E76\u3001\u8FDE\u63A5\u3001\u661F\u53F7\u5C01\u95ED\uFF1B\u6CF5\u957F\u5EA6 p \u6EE1\u8DB3 |w|\u2265p \u53EF\u6CF5", "\u6CF5\u5F15\u7406\u7684\u957F\u5EA6\u6761\u4EF6", "\u53EA\u68C0\u67E5\u957F\u5EA6\u6761\u4EF6 |w|\u2265p", "w=6:0:100:\u2014,p=3:1:40:\u2014", "ge(w,p)", "pumpable", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u4E0A\u4E0B\u6587\u65E0\u5173", "CFG \u6CF5\u5F15\u7406\u957F\u5EA6\u6761\u4EF6 |w|\u2265p", "\u4E0A\u4E0B\u6587\u65E0\u5173\u6CF5\u5F15\u7406", "\u53EA\u68C0\u67E5\u957F\u5EA6", "w=8:0:100:\u2014,p=4:1:40:\u2014", "ge(w,p)", "pumpable", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u53EF\u5224\u5B9A\u6027", "\u82E5\u8BED\u8A00\u4E0E\u5176\u8865\u90FD\u4E3A\u53EF\u8BC6\u522B\uFF0C\u5219\u8BE5\u8BED\u8A00\u53EF\u5224\u5B9A", "Sipser \u5B9A\u7406", "\u793A\u610F\uFF1A\u4E24\u8005\u7686\u53EF\u8BC6\u522B\u65F6\u8F93\u51FA 1", "a=1:0:1:\u2014,b=1:0:1:\u2014", "and2(a,b)", "decidable", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u505C\u673A\u95EE\u9898", "\u505C\u673A\u95EE\u9898\u4E0D\u53EF\u5224\u5B9A\uFF1B\u4E0D\u5B58\u5728\u5BF9\u6240\u6709\u673A\u5668\u505C\u673A\u7684\u603B\u7B97\u6CD5\u3002\u793A\u610F\u8F93\u51FA\u6052\u4E3A\u4E0D\u53EF\u5224\u5B9A", "Turing 1936", "\u8FD9\u91CC\u4E0D\u6784\u9020\u5F52\u7EA6\u6B65\u9AA4", "x=1:0:1:\u2014", "0*x", "decidable", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u590D\u6742\u5EA6\u7C7B", "\u82E5 P=NP \u5219 SAT \u6709\u591A\u9879\u5F0F\u7B97\u6CD5\uFF1B\u6B64\u5904\u53EA\u6BD4\u8F83\u7ED9\u5B9A\u6307\u6570\u662F\u5426\u591A\u9879\u5F0F\uFF1A\u6307\u6570\u2264k", "Cook\u2013Levin \u7684\u80CC\u666F\u5B9A\u4E49", "\u4E0D\u662F\u6C42\u89E3 SAT", "deg=3:0:20:\u2014,k=5:1:20:\u2014", "le(deg,k)", "poly", "\u2014", "principle"),
  r4("\u8BA1\u7B97\u7406\u8BBA\xB7\u5F52\u7EA6", "A\u2264p B \u4E14 B \u5C5E\u4E8E P \u5219 A \u5C5E\u4E8E P", "\u591A\u9879\u5F0F\u5F52\u7EA6", "\u793A\u610F\u5E03\u5C14", "inP=1:0:1:\u2014", "step(inP)", "A_in_P", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7\u51EF\u6492", "c=(p+k) mod 26", "\u51EF\u6492\u5BC6\u7801", "\u6559\u5B66\u5B57\u6BCD\u8868\uFF0C\u4E0D\u662F\u5B89\u5168\u52A0\u5BC6", "p=7:0:25:\u2014,k=3:0:25:\u2014", "mod(p+k,26)", "c", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7\u7EF4\u5409\u5C3C\u4E9A", "c=(p+k_i) mod 26", "\u7EF4\u5409\u5C3C\u4E9A", "\u5355\u5B57\u6BCD\u5BC6\u94A5\u504F\u79FB\uFF0C\u4E0D\u662F\u5B89\u5168\u52A0\u5BC6", "p=7:0:25:\u2014,k=5:0:25:\u2014", "mod(p+k,26)", "c", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7DES", "DES \u516C\u5F00\u53C2\u6570\uFF1A64 \u4F4D\u5206\u7EC4\u300116 \u8F6E", "FIPS 46 \u7684\u516C\u5F00\u5206\u7EC4\u53C2\u6570", "\u53EA\u5217\u516C\u5F00\u8F6E\u6570\uFF0C\u4E0D\u63D0\u4F9B\u5B9E\u73B0\u6216\u653B\u51FB", "rounds=16:1:32:\u2014", "rounds", "rounds", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7AES", "AES-128 \u516C\u5F00\u53C2\u6570\uFF1A128 \u4F4D\u5206\u7EC4\u300110 \u8F6E", "FIPS 197", "\u53EA\u5217\u516C\u5F00\u8F6E\u6570", "rounds=10:10:14:\u2014", "rounds", "rounds", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7DH", "\u6559\u5B66\u5C0F\u6574\u6570\uFF1A\u5171\u4EAB\u5BC6\u94A5 g^{ab} mod p", "Diffie\u2013Hellman 1976 \u7684\u5B9A\u4E49", "\u5C0F\u6574\u6570\u6559\u5B66\uFF0C\u4E0D\u662F\u5B89\u5168\u53C2\u6570", "g=5:2:20:\u2014,a=3:1:8:\u2014,b=4:1:8:\u2014,p=23:5:97:\u2014", "mod(g^(a*b),p)", "s", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7ECC", "Weierstrass \u5224\u522B\u5F0F \u0394=\u221216(4a\xB3+27b\xB2)", "\u692D\u5706\u66F2\u7EBF\u5224\u522B\u5F0F", "\u5B9E\u6570\u57DF\u6559\u5B66\u5F0F\uFF0C\u4E0D\u662F\u66F2\u7EBF\u9009\u53D6\u653B\u51FB", "a=-1:-5:5:\u2014,b=1:-5:5:\u2014", "-16*(4*a*a*a+27*b*b)", "\u0394", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7SHA", "SHA-256 \u6458\u8981\u957F\u5EA6 256 bit", "FIPS 180-4 \u516C\u5F00\u957F\u5EA6", "\u53EA\u7ED9\u6458\u8981\u957F\u5EA6", "bits=256:160:512:\u2014", "bits", "bits", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7\u6570\u5B57\u7B7E\u540D", "\u6559\u5B66 RSA \u9A8C\u8BC1\uFF1Am\u2032=s^e mod n\uFF0C\u4E0E m \u6BD4\u8F83", "RSA \u7B7E\u540D\u9A8C\u8BC1\u5B9A\u4E49", "\u5C0F\u6574\u6570\uFF0C\u4E0D\u662F\u5206\u89E3\u6216\u4F2A\u9020", "s=4:0:30:\u2014,e=3:3:7:\u2014,n=33:5:97:\u2014,m=31:0:96:\u2014", "mod(s^e,n)", "m\u2032", "\u2014", "principle"),
  r4("\u5BC6\u7801\u5B66\xB7\u96F6\u77E5\u8BC6", "\u5B8C\u5907\u6027\uFF1A\u8BDA\u5B9E\u8BC1\u660E\u8005\u88AB\u63A5\u53D7\u7684\u6982\u7387\u4E3A 1", "\u96F6\u77E5\u8BC6\u8BC1\u660E\u7684\u5B8C\u5907\u6027\u5B9A\u4E49", "\u53EA\u5199\u5B9A\u4E49\uFF0C\u4E0D\u6784\u9020\u534F\u8BAE", "honest=1:0:1:\u2014", "step(honest)", "accept", "\u2014", "principle"),
  r4("\u4FE1\u606F\u8BBA\xB7\u71B5", "H=\u2212p log2 p\u2212(1\u2212p)log2(1\u2212p)", "Shannon \u4E8C\u5143\u71B5", "0<p<1", "p=0.3:0.01:0.99:\u2014", "-(p*log2(p)+(1-p)*log2(1-p))", "H", "bit"),
  r4("\u4FE1\u606F\u8BBA\xB7\u4E92\u4FE1\u606F", "I(X;Y)=H(X)\u2212H(X|Y)", "\u4E92\u4FE1\u606F\u5B9A\u4E49", "\u71B5\u4EE5\u6BD4\u7279\u7ED9\u5B9A", "Hx=1:0:8:bit,Hxy=0.4:0:8:bit", "max(0,Hx-Hxy)", "I", "bit"),
  r4("\u4FE1\u606F\u8BBA\xB7\u54C8\u592B\u66FC", "\u54C8\u592B\u66FC\u7801\u5E73\u5747\u7801\u957F L \u6EE1\u8DB3 H\u2264L<H+1", "Shannon \u6E90\u7F16\u7801\u5B9A\u7406\u7684\u6574\u6570\u7801\u957F", "\u4E8C\u5143\u524D\u7F00\u7801", "H=2.3:0:8:bit", "H+1", "L_upper", "bit", "principle"),
  r4("\u4FE1\u606F\u8BBA\xB7\u9999\u519C-\u8303\u8BFA", "\u540C\u6837\u6EE1\u8DB3 H\u2264L<H+1 \u7684\u524D\u7F00\u7801\u754C", "Shannon\u2013Fano \u4E0D\u662F\u6700\u4F18\u4F46\u6EE1\u8DB3\u540C\u4E00\u754C", "\u4E8C\u5143", "H=2.3:0:8:bit", "H+1", "L_upper", "bit", "principle"),
  r4("\u4FE1\u606F\u8BBA\xB7\u7B97\u672F\u7F16\u7801", "\u7B97\u672F\u7801\u7801\u957F\u53EF\u63A5\u8FD1\u71B5\uFF0C\u7406\u60F3\u957F\u5EA6 n H", "\u7B97\u672F\u7F16\u7801", "\u65E0\u4FA7\u4FE1\u606F", "n=100:1:1e5:\u2014,H=1.5:0.01:8:bit", "n*H", "bits", "bit", "principle"),
  r4("\u4FE1\u606F\u8BBA\xB7\u7EA0\u9519\u7801", "\u6C49\u660E\u754C\uFF1A\u7EA0\u6B63 1 \u4F4D\u81F3\u5C11 r\u2265log2(n+1)", "\u6C49\u660E\u754C", "\u4E8C\u8FDB\u5236\u7EA0\u6B63\u5355\u9519", "n=7:3:31:\u2014", "ceil(log2(n+1))", "r", "\u2014"),
  r4("\u4FE1\u606F\u8BBA\xB7\u6C49\u660E\u7801", "\u6C49\u660E\u7801\u53C2\u6570 n=2^r\u22121\uFF0Ck=n\u2212r", "\u6C49\u660E\u7801", "\u7EA0\u6B63\u5355\u9519", "r=3:2:8:\u2014", "(2^r-1)-r", "k", "\u2014"),
  r4("\u4FE1\u606F\u8BBA\xB7CRC", "r \u4F4D CRC \u80FD\u68C0\u6D4B\u957F\u5EA6\u4E0D\u8D85\u8FC7 r \u7684\u7A81\u53D1\u9519\u8BEF", "CRC \u7684\u7A81\u53D1\u68C0\u6D4B\u957F\u5EA6", "\u751F\u6210\u591A\u9879\u5F0F\u6B21\u6570 r", "r=8:1:32:\u2014", "r", "burst", "bit", "principle"),
  r4("\u4FE1\u606F\u8BBA\xB7LDPC", "\u901F\u7387 R=k/n", "\u7EBF\u6027\u7801\u7801\u7387\u5B9A\u4E49", "\u4E0D\u662F\u8BD1\u7801\u5668\u5B9E\u73B0", "k=100:1:10000:\u2014,n=200:1:20000:\u2014", "k/n", "R", "\u2014")
];

// js/lab/rows/sys.js
var r5 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var SYS = [
  r5("\u76D1\u7763\u5B66\u4E60\xB7\u7EBF\u6027\u56DE\u5F52", "\u4E00\u5143\u6700\u5C0F\u4E8C\u4E58\u659C\u7387\uFF0C\u4E24\u70B9\u4E0D\u62DF\u5408\uFF1B\u6B63\u89C4\u65B9\u7A0B\u5BF9 (x\u2212a)\xB2 \u7684\u68AF\u5EA6\u6B65 x\u2190x\u2212\u03B7\xB72(x\u2212a)", "Bishop, PRML, \u6700\u5C0F\u4E8C\u4E58", "\u4E00\u7EF4\u4E8C\u6B21\u635F\u5931", "x=0:-5:5:\u2014,a=2:-5:5:\u2014,eta=0.1:0.001:1:\u2014", "x-eta*2*(x-a)", "x\u2032", "\u2014", "engineering"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7\u903B\u8F91\u56DE\u5F52", "\u03C3(z)=1/(1+e^{\u2212z})", "\u903B\u8F91\u51FD\u6570", "\u4E8C\u5206\u7C7B\u6982\u7387", "z=1:-8:8:\u2014", "1/(1+exp(-z))", "p", "\u2014", "engineering"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7\u51B3\u7B56\u6811", "\u57FA\u5C3C\u4E0D\u7EAF\u5EA6 1\u2212\u03A3 p_i\xB2\uFF0C\u4E24\u7C7B\u4E3A 2p(1\u2212p)", "CART \u57FA\u5C3C", "\u4E24\u7C7B", "p=0.3:0:1:\u2014", "2*p*(1-p)", "G", "\u2014", "engineering"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7\u968F\u673A\u68EE\u6797", "\u65B9\u5DEE\u968F\u72EC\u7ACB\u6811\u6570\u76EE\u4E0B\u964D\uFF1AVar/n", "\u72EC\u7ACB\u5E73\u5747", "\u6811\u8BEF\u5DEE\u72EC\u7ACB\u7684\u7406\u60F3\u5316", "v=1:0:10:\u2014,n=10:1:500:\u2014", "v/n", "var", "\u2014", "principle"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7SVM", "\u786C\u95F4\u9694\u95F4\u9694\u534A\u5BBD 1/||w||", "Cortes & Vapnik, \u95F4\u9694", "\u7EBF\u6027\u53EF\u5206\u3001\u5DF2\u7ED9\u5B9A ||w||", "w=2:0.1:20:\u2014", "1/w", "margin", "\u2014", "engineering"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7KNN", "\u591A\u6570\u7968\uFF0Ck \u4E2A\u90BB\u5C45\u4E2D\u6B63\u7C7B\u6BD4\u4F8B", "k \u8FD1\u90BB", "\u8DDD\u79BB\u5DF2\u7B97\u597D\uFF0C\u53EA\u505A\u6295\u7968", "kp=3:0:50:\u2014,k=5:1:50:\u2014", "kp/k", "p", "\u2014", "engineering"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7\u6734\u7D20\u8D1D\u53F6\u65AF", "P(y|x)\u221D P(y) \u03A0 P(x_i|y)\uFF0C\u4E24\u7C7B\u5BF9\u6570\u6BD4", "\u6734\u7D20\u8D1D\u53F6\u65AF", "\u6761\u4EF6\u72EC\u7ACB", "py=0.4:0.01:0.99:\u2014,lik=2:0.01:20:\u2014", "1/(1+exp(-(ln(py/(1-py))+ln(lik))))", "p", "\u2014", "principle"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7GBDT", "\u52A0\u6CD5\u6A21\u578B\u6B8B\u5DEE\u6B65\uFF1AF\u2190F+\u03BD h", "Friedman, \u68AF\u5EA6\u63D0\u5347", "\u5B66\u4E60\u7387 \u03BD\uFF0C\u5F31\u5B66\u4E60\u5668\u8F93\u51FA h", "F=0:-5:5:\u2014,nu=0.1:0.001:1:\u2014,h=1:-5:5:\u2014", "F+nu*h", "F\u2032", "\u2014", "principle"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7XGBoost", "\u4E8C\u9636\u6CF0\u52D2\u6B65\u957F \u2212g/(h+\u03BB)", "Chen & Guestrin, XGBoost \u53F6\u5B50\u6743\u91CD", "\u5355\u53F6\u5B50\u3001\u4E8C\u9636\u5C55\u5F00", "g=0.5:-5:5:\u2014,h=1:0.01:10:\u2014,lam=1:0:10:\u2014", "-g/(h+lam)", "w", "\u2014", "principle"),
  r5("\u76D1\u7763\u5B66\u4E60\xB7\u611F\u77E5\u673A", "\u8BEF\u5206\u7C7B\u66F4\u65B0 w\u2190w+y x", "Rosenblatt \u611F\u77E5\u673A", "\u4E00\u7EF4", "w=0:-5:5:\u2014,y=1:-1:1:\u2014,x=1:-5:5:\u2014", "w+y*x", "w\u2032", "\u2014", "engineering"),
  r5("\u65E0\u76D1\u7763\xB7DBSCAN", "\u6838\u5FC3\u70B9\uFF1A\u03B5 \u90BB\u57DF\u70B9\u6570 \u2265 minPts", "Ester \u7B49, DBSCAN", "\u90BB\u57DF\u8BA1\u6570\u5DF2\u7ED9\u5B9A", "cnt=5:0:100:\u2014,minPts=4:1:50:\u2014", "ge(cnt,minPts)", "core", "\u2014", "engineering"),
  r5("\u65E0\u76D1\u7763\xB7PCA", "2\xD72 \u534F\u65B9\u5DEE\u6700\u5927\u7279\u5F81\u503C (tr+\u221A(tr\xB2\u22124det))/2", "\u4E3B\u6210\u5206", "\u5B9E\u5BF9\u79F0 2\xD72", "a=2:-5:5:\u2014,b=0.5:-5:5:\u2014,d=1:-5:5:\u2014", "((a+d)+sqrt(max(0,(a+d)^2-4*(a*d-b*b))))/2", "\u03BB", "\u2014", "engineering"),
  r5("\u65E0\u76D1\u7763\xB7t-SNE", "\u9AD8\u7EF4\u9AD8\u65AF\u76F8\u4F3C\u5EA6 \u221D exp(\u2212||x||\xB2/(2\u03C3\xB2))", "van der Maaten, t-SNE \u7684\u9AD8\u7EF4\u6838", "\u53EA\u5199\u76F8\u4F3C\u5EA6\u6838\uFF0C\u4E0D\u662F\u964D\u7EF4\u7A0B\u5E8F", "dist=1:0:10:\u2014,sig=1:0.1:5:\u2014", "exp(-dist*dist/(2*sig*sig))", "p", "\u2014", "principle"),
  r5("\u65E0\u76D1\u7763\xB7LDA", "\u4E24\u7C7B\u6295\u5F71 J=w\xB2 (\u03BC1\u2212\u03BC2)\xB2 / (s1+s2) \u5728\u4E00\u7EF4", "Fisher \u7EBF\u6027\u5224\u522B", "\u4E00\u7EF4", "mu1=1:-5:5:\u2014,mu2=-1:-5:5:\u2014,s=1:0.01:10:\u2014", "(mu1-mu2)^2/s", "J", "\u2014", "principle"),
  r5("\u65E0\u76D1\u7763\xB7GMM", "\u4E00\u5143\u9AD8\u65AF\u5BC6\u5EA6", "\u9AD8\u65AF\u6DF7\u5408\u7684\u5206\u91CF\u5BC6\u5EA6", "\u4E00\u4E2A\u5206\u91CF", "x=0:-5:5:\u2014,mu=0:-5:5:\u2014,sig=1:0.1:5:\u2014", "(1/sqrt(2*pi*sig*sig))*exp(-(x-mu)^2/(2*sig*sig))", "\u03C6", "\u2014", "engineering"),
  r5("\u65E0\u76D1\u7763\xB7\u5B64\u7ACB\u68EE\u6797", "\u8DEF\u5F84\u957F\u5EA6\u671F\u671B\u968F\u5F02\u5E38\u53D8\u77ED\uFF1B\u5747\u5300\u6EE1\u4E8C\u53C9\u6811\u5E73\u5747\u8DEF\u5F84 c(n)\u22482 ln(n\u22121)+\u5E38\u6570", "Isolation Forest \u7684 c(n)", "n>2", "n=32:3:1e4:\u2014", "2*ln(n-1)+0.577", "c", "\u2014", "principle"),
  r5("\u65E0\u76D1\u7763\xB7\u5173\u8054\u89C4\u5219", "\u7F6E\u4FE1\u5EA6 conf=support(A\u222AB)/support(A)", "Agrawal, \u5173\u8054\u89C4\u5219", "\u652F\u6301\u5EA6\u5DF2\u8BA1\u6570", "supAB=20:0:1e5:\u2014,supA=50:1:1e5:\u2014", "supAB/supA", "conf", "\u2014", "engineering"),
  r5("\u65E0\u76D1\u7763\xB7\u81EA\u7F16\u7801\u5668", "\u91CD\u6784\u8BEF\u5DEE ||x\u2212x\u0302||\xB2", "\u81EA\u7F16\u7801\u5668\u635F\u5931", "\u4E00\u7EF4", "x=1:-5:5:\u2014,xh=0.8:-5:5:\u2014", "(x-xh)^2", "L", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7MLP", "\u5355\u9690\u5355\u5143 ReLU\uFF1Amax(0, wx+b)", "ReLU", "\u4E00\u5C42", "w=1:-5:5:\u2014,x=0.5:-5:5:\u2014,b=-0.2:-5:5:\u2014", "max(0,w*x+b)", "y", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7CNN", "\u4E00\u7EF4\u5377\u79EF (x0 k0+x1 k1)", "\u79BB\u6563\u5377\u79EF", "\u957F\u5EA6 2", "x0=1:-5:5:\u2014,x1=0:-5:5:\u2014,k0=0.5:-5:5:\u2014,k1=-0.5:-5:5:\u2014", "x0*k0+x1*k1", "y", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7RNN", "h=tanh(Wh h+Wx x)", "Elman RNN \u4E00\u6B65", "\u6807\u91CF\u9690\u72B6\u6001", "h=0:-2:2:\u2014,Wh=0.5:-2:2:\u2014,x=1:-5:5:\u2014,Wx=0.5:-5:5:\u2014", "tanh(Wh*h+Wx*x)", "h\u2032", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7LSTM", "\u9057\u5FD8\u95E8 \u03C3(wf)", "Hochreiter & Schmidhuber, \u9057\u5FD8\u95E8", "\u53EA\u5199\u4E00\u4E2A\u95E8\uFF0C\u4E0D\u662F\u8BAD\u7EC3\u6D41\u7A0B", "wf=1:-6:6:\u2014", "1/(1+exp(-wf))", "f", "\u2014", "principle"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7GRU", "\u66F4\u65B0\u95E8 z=\u03C3(wz)", "GRU \u66F4\u65B0\u95E8", "\u4E00\u4E2A\u95E8", "wz=0.5:-6:6:\u2014", "1/(1+exp(-wz))", "z", "\u2014", "principle"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7Transformer", "\u7F29\u653E\u70B9\u79EF softmax \u524D\u7684\u5206\u6570 qk/\u221Ad", "Vaswani \u7B49, Attention", "\u4E00\u5BF9\u67E5\u8BE2\u4E0E\u952E", "q=1:-5:5:\u2014,k=1:-5:5:\u2014,d=4:1:64:\u2014", "q*k/sqrt(d)", "score", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7\u6CE8\u610F\u529B", "\u540C\u4E00\u7F29\u653E\u70B9\u79EF", "\u6CE8\u610F\u529B\u5206\u6570", "d \u4E3A\u952E\u7EF4\u5EA6", "q=1:-5:5:\u2014,k=0.5:-5:5:\u2014,d=8:1:128:\u2014", "q*k/sqrt(d)", "score", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7\u6B8B\u5DEE\u7F51\u7EDC", "\u6B8B\u5DEE\u5757 y=x+F", "He \u7B49, ResNet", "\u6807\u91CF", "x=1:-5:5:\u2014,F=0.2:-5:5:\u2014", "x+F", "y", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7\u6279\u5F52\u4E00\u5316", "\u0177=(x\u2212\u03BC)/\u221A(\u03C3\xB2+\u03B5)", "Ioffe & Szegedy, BatchNorm", "\u4E00\u4E2A\u7279\u5F81", "x=2:-10:10:\u2014,mu=1:-10:10:\u2014,v=1:0:10:\u2014", "(x-mu)/sqrt(v+1e-5)", "y", "\u2014", "engineering"),
  r5("\u795E\u7ECF\u7F51\u7EDC\xB7Dropout", "\u8BAD\u7EC3\u65F6\u671F\u671B\u4FDD\u6301\uFF1Ay=x\uFF08\u53CD\u76F8 dropout \u7684\u671F\u671B\uFF09", "Srivastava, Dropout", "\u671F\u671B\u610F\u4E49\u4E0B\u4E0D\u6539\u53D8\u5C3A\u5EA6", "x=1:-5:5:\u2014,p=0.5:0:0.9:\u2014", "x", "E[y]", "\u2014", "principle"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7Q-learning", "Q\u2190Q+\u03B1(r+\u03B3 max Q\u2032\u2212Q)", "Watkins, Q-learning", "\u8868\u683C\u3001\u5355\u6B65", "Q=1:-10:10:\u2014,alpha=0.2:0:1:\u2014,r=1:-5:5:\u2014,gamma=0.9:0:0.99:\u2014,Qp=2:-10:10:\u2014", "Q+alpha*(r+gamma*Qp-Q)", "Q\u2032", "\u2014", "engineering"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7SARSA", "Q\u2190Q+\u03B1(r+\u03B3 Q_next\u2212Q)\uFF0C\u7528\u5B9E\u9645\u4E0B\u4E00\u52A8\u4F5C", "Rummery & Niranjan, SARSA", "\u540C\u7B56\u7565", "Q=1:-10:10:\u2014,alpha=0.2:0:1:\u2014,r=1:-5:5:\u2014,gamma=0.9:0:0.99:\u2014,Qn=1.5:-10:10:\u2014", "Q+alpha*(r+gamma*Qn-Q)", "Q\u2032", "\u2014", "engineering"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7DQN", "\u540C\u4E00 Q \u5B66\u4E60\u76EE\u6807\uFF0C\u76EE\u6807\u7F51\u7EDC\u7ED9\u51FA Q\u2032", "Mnih \u7B49, DQN \u7684\u76EE\u6807", "\u4E0D\u662F\u8BAD\u7EC3\u7A33\u5B9A\u5316\u6E05\u5355", "Q=1:-10:10:\u2014,alpha=1:0:1:\u2014,r=1:-5:5:\u2014,gamma=0.99:0:0.99:\u2014,Qt=2:-10:10:\u2014", "r+gamma*Qt", "y", "\u2014", "principle"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7\u7B56\u7565\u68AF\u5EA6", "REINFORCE \u7684\u6807\u91CF\u68AF\u5EA6\u65B9\u5411 \u221D G \u2207log \u03C0\uFF0C\u8FD9\u91CC G=\u56DE\u62A5", "Williams, REINFORCE", "\u53EA\u663E\u793A\u56DE\u62A5\u6743\u91CD", "G=2:-10:10:\u2014", "G", "G", "\u2014", "principle"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7A2C", "\u4F18\u52BF A=G\u2212V", "\u4F18\u52BF\u51FD\u6570\u5B9A\u4E49", "\u540C\u7B56\u7565\u6F14\u5458-\u8BC4\u8BBA\u5458\u7684\u4F18\u52BF", "G=3:-10:10:\u2014,V=1:-10:10:\u2014", "G-V", "A", "\u2014", "engineering"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7PPO", "\u622A\u65AD\u76EE\u6807 min(\u03C1 A, clip(\u03C1,1\u2212\u03B5,1+\u03B5) A) \u5728 \u03C1>1+\u03B5 \u4E14 A>0 \u65F6\u53D6 (1+\u03B5)A", "Schulman \u7B49, PPO", "\u4E00\u79CD\u60C5\u5F62\u7684\u622A\u65AD\u503C", "eps=0.2:0.01:0.5:\u2014,A=1:-5:5:\u2014", "(1+eps)*A", "L", "\u2014", "principle"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7DDPG", "\u786E\u5B9A\u6027\u7B56\u7565\u68AF\u5EA6\u7684\u8BC4\u8BBA\u5458\u76EE\u6807 y=r+\u03B3 Q\u2032", "Lillicrap \u7B49, DDPG", "\u76EE\u6807\u7F51\u7EDC Q\u2032 \u7ED9\u5B9A", "r=1:-5:5:\u2014,gamma=0.99:0:0.99:\u2014,Qp=2:-10:10:\u2014", "r+gamma*Qp", "y", "\u2014", "principle"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7\u591A\u81C2\u8001\u864E\u673A", "UCB\uFF1A\u5747\u503C + \u221A(2 ln pulls / n)", "Auer, UCB1", "\u6B21\u9AD8\u65AF\u5956\u52B1\u3002pulls \u662F\u5C1D\u8BD5\u6B21\u6570\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "mean=0.5:0:1:\u2014,pulls=100:2:1e6:\u2014,n=10:1:1e5:\u2014", "mean+sqrt(2*ln(pulls)/n)", "UCB", "\u2014", "engineering"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7\u7F51\u683C\u4E16\u754C", "\u8D1D\u5C14\u66FC\uFF1AV=r+\u03B3 V\u2032", "Sutton & Barto", "\u786E\u5B9A\u6027\u5355\u5907\u4EFD", "r=0:-5:5:\u2014,gamma=0.9:0:0.99:\u2014,Vp=1:-10:10:\u2014", "r+gamma*Vp", "V", "\u2014", "engineering"),
  r5("\u5F3A\u5316\u5B66\u4E60\xB7\u5956\u52B1\u5851\u5F62", "Ng \u7B49\uFF1A\u52BF\u51FD\u6570\u5851\u5F62 F=\u03B3 \u03A6\u2032\u2212\u03A6 \u4E0D\u6539\u53D8\u6700\u4F18\u7B56\u7565", "Ng, Harada, Russell 1999", "\u57FA\u4E8E\u52BF\u7684\u5851\u5F62", "gamma=0.9:0:0.99:\u2014,Phi2=2:-10:10:\u2014,Phi=1:-10:10:\u2014", "gamma*Phi2-Phi", "F", "\u2014", "principle"),
  r5("\u4F18\u5316\xB7\u68AF\u5EA6\u4E0B\u964D", "x\u2190x\u2212\u03B7 f\u2032\uFF0Cf=(x\u2212a)\xB2", "\u68AF\u5EA6\u4E0B\u964D", "\u4E00\u7EF4\u4E8C\u6B21", "x=0:-5:5:\u2014,a=2:-5:5:\u2014,eta=0.2:0.001:1:\u2014", "x-eta*2*(x-a)", "x\u2032", "\u2014", "engineering"),
  r5("\u4F18\u5316\xB7\u725B\u987F\u6CD5", "\u725B\u987F\u6B65 x\u2190x\u2212f\u2032/f\u2033\uFF0Cf\u2033=2", "\u725B\u987F\u6CD5", "\u4E00\u7EF4\u4E8C\u6B21\u7CBE\u786E\u4E00\u6B65", "x=0:-5:5:\u2014,a=3:-5:5:\u2014", "x-(2*(x-a))/2", "x\u2032", "\u2014", "engineering"),
  r5("\u4F18\u5316\xB7\u62DF\u725B\u987F", "BFGS \u5728\u4E00\u7EF4\u9000\u5316\u4E3A\u5272\u7EBF\uFF1B\u6B65\u957F \u2212\u03B7 g", "\u62DF\u725B\u987F\u7684\u4E00\u7EF4\u4E0B\u964D", "\u68AF\u5EA6 g \u7ED9\u5B9A", "x=1:-5:5:\u2014,eta=0.2:0.001:1:\u2014,g=2:-10:10:\u2014", "x-eta*g", "x\u2032", "\u2014", "principle"),
  r5("\u4F18\u5316\xB7\u5171\u8F6D\u68AF\u5EA6", "\u4E8C\u6B21\u51FD\u6570\u7CBE\u786E\u7EBF\u641C\u7D22\u6CBF\u5171\u8F6D\u65B9\u5411\uFF0C\u4E00\u6B65\u5230\u4E2D\u5FC3\u7684\u793A\u610F x\u2190a", "\u5171\u8F6D\u68AF\u5EA6\u5BF9\u4E8C\u6B21\u51FD\u6570\u6709\u9650\u7EC8\u6B62", "\u4E00\u7EF4\u65F6\u4E00\u6B65", "a=2:-5:5:\u2014", "a", "x", "\u2014", "principle"),
  r5("\u4F18\u5316\xB7\u6A21\u62DF\u9000\u706B", "Metropolis\uFF1A\u0394E<0 \u5FC5\u63A5\u53D7\uFF0C\u5426\u5219 e^{\u2212\u0394E/T}", "Metropolis \u51C6\u5219", "\u4E00\u4E2A\u63D0\u8BAE", "dE=1:-5:10:\u2014,T=2:0.05:20:\u2014", "exp(-max(0,dE)/T)", "p", "\u2014", "engineering"),
  r5("\u4F18\u5316\xB7\u9057\u4F20\u7B97\u6CD5", "\u6A21\u5F0F\u5B9A\u7406\u4E0D\u5728\u8FD9\u91CC\u5C55\u5F00\uFF1B\u9009\u62E9\u6982\u7387 \u221D \u9002\u5E94\u5EA6", "\u8F6E\u76D8\u8D4C\u9009\u62E9\u6982\u7387", "\u4E24\u4E2A\u4F53", "f1=3:0:20:\u2014,f2=1:0:20:\u2014", "f1/(f1+f2)", "p1", "\u2014", "principle"),
  r5("\u4F18\u5316\xB7\u7C92\u5B50\u7FA4", "\u901F\u5EA6\u66F4\u65B0 v\u2190w v+c1 r1(p\u2212x)+c2 r2(g\u2212x)", "Kennedy & Eberhart, PSO", "\u6807\u91CF\u3001\u968F\u673A\u6570\u7ED9\u5B9A", "w=0.7:0:1.2:\u2014,v=0.2:-5:5:\u2014,c1=1.5:0:3:\u2014,r1=0.5:0:1:\u2014,p=1:-5:5:\u2014,x=0:-5:5:\u2014,c2=1.5:0:3:\u2014,r2=0.5:0:1:\u2014,g=2:-5:5:\u2014", "w*v+c1*r1*(p-x)+c2*r2*(g-x)", "v\u2032", "\u2014", "engineering"),
  r5("\u4F18\u5316\xB7\u8681\u7FA4", "\u4FE1\u606F\u7D20\u66F4\u65B0 \u03C4\u2190(1\u2212\u03C1)\u03C4+\u0394\u03C4", "Dorigo, \u8681\u7FA4", "\u4E00\u6761\u8FB9", "rho=0.1:0:1:\u2014,tau=1:0:10:\u2014,dt=0.5:0:5:\u2014", "(1-rho)*tau+dt", "\u03C4\u2032", "\u2014", "engineering"),
  r5("\u4F18\u5316\xB7\u7EBF\u6027\u89C4\u5212", "\u9876\u70B9\uFF1Amax 3x+2y s.t. x+y\u22641, x,y\u22650\uFF0C\u6700\u4F18 3", "\u7EBF\u6027\u89C4\u5212\u57FA\u672C\u5B9A\u7406", "\u8FD9\u4E00\u53EF\u884C\u57DF", "x=1:0:1:\u2014", "3*max(x,0)/max(x,0.0001)*0+3", "z*", "\u2014", "engineering"),
  r5("\u4F18\u5316\xB7\u6574\u6570\u89C4\u5212", "\u540C\u4E00\u7EA6\u675F\u4E0B\u6574\u6570\u70B9 (1,0) \u76EE\u6807\u4ECD\u4E3A 3", "\u6574\u6570\u53EF\u884C\u70B9", "\u8BE5\u5B9E\u4F8B", "z=3:0:10:\u2014", "z", "z*", "\u2014", "principle"),
  r5("\u56FE\u5F62\u5B66\xB7\u5149\u6805\u5316", "\u626B\u63CF\u7EBF\u8986\u76D6\u50CF\u7D20\u6570\u7EA6\u7B49\u4E8E\u8FB9\u957F", "\u5149\u6805\u5316\u8986\u76D6", "\u6C34\u5E73\u8FB9", "L=10:0:400:px", "L", "n", "px", "principle"),
  r5("\u56FE\u5F62\u5B66\xB7\u5149\u7EBF\u8FFD\u8E2A", "\u4E3B\u5149\u7EBF\u4E0E\u5355\u4F4D\u7403\u6700\u8FD1\u6B63\u4EA4\u8DDD\uFF0C\u672A\u51FB\u4E2D\u65F6 t \u4E3A\u8D1F\u7684\u793A\u610F\uFF1A\u0394=b\xB2\u2212c", "\u5C04\u7EBF-\u7403\u5224\u522B\u5F0F", "\u7403\u5FC3\u5728\u539F\u70B9\u3001\u534A\u5F84 1", "b=0:-5:5:\u2014,c=2:-5:10:\u2014", "b*b-c", "\u0394", "\u2014", "engineering"),
  r5("\u56FE\u5F62\u5B66\xB7BRDF", "Lambert\uFF1AL=(I/\u03C0) max(0, n\xB7l)", "Lambert \u53CD\u5C04", "\u6F2B\u53CD\u5C04", "I=1:0:5:\u2014,nd=0.5:-1:1:\u2014", "(I/pi)*max(0,nd)", "L", "\u2014", "engineering"),
  r5("\u56FE\u5F62\u5B66\xB7\u7EB9\u7406\u6620\u5C04", "\u53CC\u7EBF\u6027\u63D2\u503C u \u65B9\u5411", "\u53CC\u7EBF\u6027", "\u4E00\u7EF4\u9000\u5316", "u=0.3:0:1:\u2014,c0=0:-1:1:\u2014,c1=1:-1:1:\u2014", "(1-u)*c0+u*c1", "c", "\u2014", "engineering"),
  r5("\u56FE\u5F62\u5B66\xB7\u9634\u5F71", "\u786C\u9634\u5F71\uFF1A\u5149\u6E90\u65B9\u5411\u4E0E\u906E\u6321\u5E03\u5C14", "\u9634\u5F71\u5C04\u7EBF", "\u5E73\u884C\u5149\u3001\u5DF2\u7ED9\u51FA\u906E\u6321", "blocked=1:0:1:\u2014", "step(blocked)", "shadow", "\u2014", "principle"),
  r5("\u56FE\u5F62\u5B66\xB7\u6297\u952F\u9F7F", "\u76D2\u6EE4\u6CE2\u5E73\u5747\u4E24\u4E2A\u91C7\u6837", "\u8D85\u91C7\u6837\u5E73\u5747", "\u4E24\u6837\u672C", "s0=0:-1:1:\u2014,s1=1:-1:1:\u2014", "0.5*(s0+s1)", "c", "\u2014", "engineering"),
  r5("\u56FE\u5F62\u5B66\xB7\u66F2\u9762\u7EC6\u5206", "Chaikin \u89D2\u5207\u5272\u4E00\u6B21\uFF1A\u65B0\u70B9 (3p+q)/4", "Chaikin \u7EC6\u5206", "\u6298\u7EBF\u4E00\u8282", "p=0:-5:5:\u2014,q=4:-5:5:\u2014", "(3*p+q)/4", "p\u2032", "\u2014", "principle"),
  r5("\u56FE\u5F62\u5B66\xB7\u9AA8\u9ABC\u52A8\u753B", "\u7EBF\u6027\u6DF7\u5408 q=(1\u2212w) a+w b", "\u7EBF\u6027\u6DF7\u5408\u8499\u76AE\u7684\u6807\u91CF\u5F0F", "\u4E0D\u662F\u56DB\u5143\u6570\u7403\u9762\u63D2\u503C", "w=0.3:0:1:\u2014,a=0:-5:5:\u2014,b=1:-5:5:\u2014", "(1-w)*a+w*b", "x", "\u2014", "principle"),
  r5("\u56FE\u5F62\u5B66\xB7\u7C92\u5B50\u7CFB\u7EDF", "\u5300\u52A0\u901F x=x0+v t+\xBD a t\xB2", "\u7C92\u5B50\u8FD0\u52A8\u5B66", "\u5E38\u52A0\u901F\u5EA6", "x0=0:-5:5:\u2014,v=1:-10:10:\u2014,a=-1:-10:10:\u2014", "x0+v*t+0.5*a*t*t", "x", "\u2014", "engineering"),
  r5("\u56FE\u5F62\u5B66\xB7\u4F53\u79EF\u6E32\u67D3", "\u524D\u5411\u540E\u5408\u6210 C\u2032=C+(1\u2212\u03B1acc) \u03B1 c \u7684\u4E00\u6B65", "\u4F53\u79EF\u6E32\u67D3\u5408\u6210", "\u4E00\u6B65", "C=0:0:1:\u2014,aacc=0.2:0:1:\u2014,alpha=0.3:0:1:\u2014,c=1:0:1:\u2014", "C+(1-aacc)*alpha*c", "C\u2032", "\u2014", "engineering"),
  r5("\u6570\u636E\u5E93\xB7B+\u6811\u7D22\u5F15", "\u9AD8\u5EA6 log_ord n", "B+ \u6811\u7D22\u5F15", "ord \u662F\u9636\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "n=1e5:1:1e8:\u2014,ord=100:2:1000:\u2014", "log2(max(2,n))/log2(ord)", "h", "\u2014", "engineering"),
  r5("\u6570\u636E\u5E93\xB7\u54C8\u5E0C\u7D22\u5F15", "\u7B49\u503C\u67E5\u627E\u671F\u671B\u63A2\u9488 1+\u03B1/2\uFF08\u5F00\u653E\u5BFB\u5740\u7EBF\u6027\u63A2\u6D4B\u7684\u4E00\u6B21\u8FD1\u4F3C\u4E0D\u7528\uFF09\uFF1B\u94FE\u5F0F \u03B1=n/m", "\u54C8\u5E0C\u7D22\u5F15", "\u94FE\u5F0F", "n=1000:1:1e7:\u2014,m=2000:1:1e7:\u2014", "n/m", "\u03B1", "\u2014", "engineering"),
  r5("\u6570\u636E\u5E93\xB7\u67E5\u8BE2\u4F18\u5316", "\u5D4C\u5957\u5FAA\u73AF\u4EE3\u4EF7 \u221D |R|\xB7|S|", "\u9009\u62E9-\u6295\u5F71-\u8FDE\u63A5\u7684\u5D4C\u5957\u5FAA\u73AF", "\u65E0\u7D22\u5F15", "R=100:1:1e6:\u2014,S=50:1:1e6:\u2014", "R*S", "cost", "\u2014", "principle"),
  r5("\u6570\u636E\u5E93\xB7\u4E8B\u52A1ACID", "\u53EF\u4E32\u884C\u5316\u4E0D\u7B49\u4E8E\u4EC5\u6709\u4E24\u9636\u6BB5\u9501\u7684\u5145\u5206\u8BA8\u8BBA\uFF1B\u51B2\u7A81\u53EF\u4E32\u884C\u5316\u8981\u6C42\u65E0\u73AF\u3002\u793A\u610F\uFF1A\u65E0\u73AF\u5219\u4E3A 1", "\u4E8B\u52A1\u7406\u8BBA", "\u56FE\u5DF2\u7ED9\u51FA\u662F\u5426\u6709\u73AF", "cycle=0:0:1:\u2014", "1-step(cycle)", "ok", "\u2014", "principle"),
  r5("\u6570\u636E\u5E93\xB7\u5E76\u53D1\u63A7\u5236", "\u4E24\u9636\u6BB5\u5C01\u9501\u7684\u589E\u957F\u9636\u6BB5\u9501\u6570", "2PL", "\u53EA\u8BA1\u6570\u5DF2\u6301\u6709\u9501", "locks=3:0:64:\u2014", "locks", "locks", "\u2014", "principle"),
  r5("\u6570\u636E\u5E93\xB7MVCC", "\u5FEB\u7167\u8BFB\u770B\u5230\u7684\u7248\u672C\u662F\u5F00\u59CB\u65F6\u5DF2\u63D0\u4EA4\u7684\uFF1B\u53EF\u89C1\u7248\u672C\u6570 \u2264 \u7248\u672C\u94FE\u957F", "MVCC \u5FEB\u7167", "\u7248\u672C\u94FE\u957F\u5EA6\u7ED9\u5B9A", "len=4:1:64:\u2014", "len", "versions", "\u2014", "principle"),
  r5("\u6570\u636E\u5E93\xB7\u65E5\u5FD7\u6062\u590D", "ARIES \u91CD\u505A\u4ECE\u6700\u5C0F\u810F\u9875 LSN \u8D77\u7684\u65E5\u5FD7\u91CF\u793A\u610F", "Mohan, ARIES", "\u53EA\u7ED9\u65E5\u5FD7\u6761\u6570\uFF0C\u4E0D\u662F\u6062\u590D\u6B65\u9AA4", "n=10:0:1e5:\u2014", "n", "records", "\u2014", "principle"),
  r5("\u6570\u636E\u5E93\xB7\u5206\u7247", "\u4E00\u81F4\u6027\u54C8\u5E0C\u7684\u671F\u671B\u8D1F\u8F7D n/k", "\u5206\u7247", "k \u4E2A\u5747\u5300\u5206\u7247", "n=1000:1:1e7:\u2014,k=8:1:256:\u2014", "n/k", "load", "\u2014", "engineering"),
  r5("\u6570\u636E\u5E93\xB7\u590D\u5236", "\u540C\u6B65\u590D\u5236\u5199\u5EF6\u8FDF \u221D \u526F\u672C\u5F80\u8FD4", "\u590D\u5236", "\u4E00\u6B21\u5F80\u8FD4\u65F6\u95F4\u7ED9\u5B9A", "rtt=20:0.1:500:ms,c=3:1:9:\u2014", "rtt*c", "t", "ms", "principle"),
  r5("\u6570\u636E\u5E93\xB7CAP", "\u5206\u533A\u65F6\u4E0D\u80FD\u540C\u65F6\u7ED9\u5168\u90E8\u526F\u672C\u7EBF\u6027\u4E00\u81F4\u4E0E\u53EF\u7528\uFF1B\u591A\u6570\u6D3E\u6CD5\u5B9A\u4EBA\u6570 \u230An/2\u230B+1", "CAP \u4E0E\u591A\u6570\u6D3E", "\u5F02\u6B65\u7F51\u7EDC\u7684\u6CD5\u5B9A\u4EBA\u6570\u5B9A\u4E49", "n=5:1:21:\u2014", "floor(n/2)+1", "q", "\u2014", "principle"),
  r5("\u7F51\u7EDC\xB7\u62E5\u585E\u63A7\u5236", "AIMD\uFF1A\u4E22\u5305\u540E\u7A97\u53E3\u51CF\u534A", "Jacobson, TCP \u62E5\u585E\u63A7\u5236", "\u4E22\u5305\u4E8B\u4EF6", "W=16:1:1e4:MSS", "W/2", "W\u2032", "MSS", "engineering"),
  r5("\u7F51\u7EDC\xB7\u8DEF\u7531", "\u8DDD\u79BB\u5411\u91CF\u4E00\u6B65\u677E\u5F1B d=min(d, d_u+w)", "Bellman-Ford \u677E\u5F1B", "\u975E\u8D1F\u6743", "d=5:0:100:\u2014,du=2:0:100:\u2014,w=2:0:50:\u2014", "min(d,du+w)", "d\u2032", "\u2014", "engineering"),
  r5("\u7F51\u7EDC\xB7NAT", "\u7AEF\u53E3\u6620\u5C04\u8868\u9879\u6570", "NAPT \u8868", "\u4E00\u6761\u6620\u5C04", "n=10:0:1e5:\u2014", "n", "entries", "\u2014", "principle"),
  r5("\u7F51\u7EDC\xB7DNS", "\u9012\u5F52\u89E3\u6790\u6700\u574F\u67E5\u8BE2\u6570\u7B49\u4E8E\u59D4\u6258\u5C42\u6570", "DNS", "\u65E0\u7F13\u5B58", "depth=3:1:12:\u2014", "depth", "queries", "\u2014", "principle"),
  r5("\u7F51\u7EDC\xB7HTTP", "\u6301\u4E45\u8FDE\u63A5\u644A\u9500\u540E\u6BCF\u4E2A\u5BF9\u8C61\u7684\u5F80\u8FD4\u53EF\u964D\u5230\u7EA6 1", "HTTP/1.1 \u6301\u4E45\u8FDE\u63A5", "\u7406\u60F3\u65E0\u961F\u5934\u963B\u585E", "rtt=30:1:500:ms", "rtt", "t", "ms", "principle"),
  r5("\u7F51\u7EDC\xB7TLS", "1.2 \u63E1\u624B\u4E3B\u8DEF\u5F84\u5F80\u8FD4\u6B21\u6570\u53D6 2", "TLS 1.2 \u63E1\u624B\u7684\u516C\u5F00\u5F80\u8FD4", "\u5B8C\u6574\u63E1\u624B\u3001\u65E0\u6062\u590D", "rtt=30:1:500:ms", "2*rtt", "t", "ms", "principle"),
  r5("\u7F51\u7EDC\xB7WebSocket", "\u5E27\u5F00\u9500\u4E4B\u540E\u7684\u6709\u6548\u8F7D\u8377\u6BD4 payload/(payload+hdr)", "WebSocket \u5E27", "\u65E0\u6269\u5C55", "payload=100:1:1e5:B,hdr=6:2:14:B", "payload/(payload+hdr)", "eff", "\u2014", "principle"),
  r5("\u7F51\u7EDC\xB7P2P", "\u7247\u6BB5\u590D\u5236\u7684\u671F\u671B\u8986\u76D6 1\u2212(1\u22121/n)^k", "\u968F\u673A\u63A8\u9001\u8986\u76D6", "\u72EC\u7ACB\u9009\u62E9", "n=10:1:1000:\u2014,k=10:0:5000:\u2014", "1-(1-1/n)^k", "cover", "\u2014", "principle"),
  r5("\u7F51\u7EDC\xB7SDN", "\u96C6\u4E2D\u63A7\u5236\u5668\u4E0B\u7684\u6D41\u8868\u9879\u6570", "OpenFlow \u6D41\u8868", "\u53EA\u8BA1\u6570", "n=100:0:1e6:\u2014", "n", "flows", "\u2014", "principle"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u8FDB\u7A0B\u8C03\u5EA6", "\u65F6\u95F4\u7247\u8F6E\u8F6C\u5468\u8F6C\u65F6\u95F4\u7EA6 (n+1) q/2 \u5BF9 n \u4E2A\u7B49\u957F\u4F5C\u4E1A\u7684\u4E00\u79CD\u5E73\u5747", "\u8F6E\u8F6C\u8C03\u5EA6", "\u4F5C\u4E1A\u957F\u5EA6\u7B49\u4E8E\u82E5\u5E72\u65F6\u95F4\u7247\u7684\u7406\u60F3\u5316", "n=4:1:64:\u2014,q=10:1:200:ms", "(n+1)*q/2", "T", "ms", "principle"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u865A\u62DF\u5185\u5B58", "\u7F3A\u9875\u65F6\u6709\u6548\u8BBF\u95EE\u65F6\u95F4 EAT=(1\u2212p)m+p f", "\u5206\u9875", "\u7F3A\u9875\u7387 p", "p=0.01:0:1:\u2014,m=100:1:1000:ns,f=1e7:1000:1e9:ns", "(1-p)*m+p*f", "EAT", "ns", "engineering"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u6587\u4EF6\u7CFB\u7EDF", "\u7D22\u5F15\u7ED3\u70B9\u76F4\u63A5\u5757\u80FD\u8986\u76D6\u7684\u5B57\u8282 b\xB7n", "Unix inode \u76F4\u63A5\u5757", "\u53EA\u8BA1\u76F4\u63A5\u6307\u9488", "b=4096:512:65536:B,n=12:1:16:\u2014", "b*n", "bytes", "B", "principle"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u6B7B\u9501", "\u94F6\u884C\u5BB6\u5355\u8D44\u6E90 Need=Max\u2212Allocation", "Dijkstra \u94F6\u884C\u5BB6\u7B97\u6CD5", "\u5355\u79CD\u8D44\u6E90", "Max=8:0:64:\u2014,Alloc=3:0:64:\u2014", "max(0,Max-Alloc)", "Need", "\u2014", "engineering"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u751F\u4EA7\u8005\u6D88\u8D39\u8005", "\u6709\u754C\u7F13\u51B2\u533A\u7A7A\u4F4D\u6570 N\u2212count", "\u6709\u754C\u7F13\u51B2", "\u4E92\u65A5\u5DF2\u4FDD\u8BC1\u65F6\u7684\u7A7A\u4F4D", "N=8:1:64:\u2014,count=3:0:64:\u2014", "max(0,N-count)", "empty", "\u2014", "engineering"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u4FE1\u53F7\u91CF", "P \u64CD\u4F5C\u540E\u8BA1\u6570\u503C s\u22121", "Dijkstra \u4FE1\u53F7\u91CF", "\u4E0D\u505A\u963B\u585E\u961F\u5217\u6A21\u62DF", "s=2:0:16:\u2014", "s-1", "s\u2032", "\u2014", "principle"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u4E2D\u65AD", "\u4E2D\u65AD\u54CD\u5E94\u540E\u4FDD\u5B58\u73B0\u573A\u7684\u5BC4\u5B58\u5668\u7EC4\u4EE3\u4EF7\u6309\u6761\u6570\u8BA1", "\u4E2D\u65AD", "\u53EA\u8BA1\u4FDD\u5B58\u6761\u6570", "n=8:1:32:\u2014", "n", "saves", "\u2014", "principle"),
  r5("\u64CD\u4F5C\u7CFB\u7EDF\xB7\u7CFB\u7EDF\u8C03\u7528", "\u7528\u6237\u6001/\u5185\u6838\u6001\u5207\u6362\u81F3\u5C11\u4E24\u6B21\uFF08\u8FDB\u5165\u4E0E\u8FD4\u56DE\uFF09", "\u7CFB\u7EDF\u8C03\u7528", "\u4E00\u6B21\u8C03\u7528", "n=2:1:8:\u2014", "n", "cross", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u8BCD\u6CD5", "\u626B\u63CF \u0398(n)", "\u8BCD\u6CD5\u5206\u6790", "\u5355\u904D", "n=100:1:1e6:\u2014", "n", "T", "\u2014", "engineering"),
  r5("\u7F16\u8BD1\xB7\u8BED\u6CD5", "LL/LR \u5BF9\u65E0\u6B67\u4E49\u6587\u6CD5\u7684\u79FB\u8FDB\u5F52\u7EA6 O(n)", "\u8BED\u6CD5\u5206\u6790", "\u786E\u5B9A\u7684\u81EA\u4E0B\u800C\u4E0A", "n=100:1:1e5:\u2014", "n", "T", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u8BED\u4E49", "\u7B26\u53F7\u8868\u67E5\u627E\u82E5\u7528\u54C8\u5E0C\u671F\u671B O(1)\uFF0C\u8FD9\u91CC\u7528\u6807\u8BC6\u7B26\u4E2A\u6570", "\u8BED\u4E49\u5206\u6790", "\u4E00\u904D", "n=50:1:1e5:\u2014", "n", "ids", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u4E2D\u95F4\u4EE3\u7801", "\u4E09\u5730\u5740\u8BED\u53E5\u6761\u6570", "\u4E2D\u95F4\u8868\u793A", "\u5DF2\u751F\u6210", "n=40:0:1e5:\u2014", "n", "stmts", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u4F18\u5316", "\u5E38\u6570\u6298\u53E0\u540E\u5269\u4F59\u8FD0\u7B97\u6570", "\u5C40\u90E8\u4F18\u5316", "\u4E00\u6761\u8868\u8FBE\u5F0F", "ops=4:0:50:\u2014", "ops", "ops", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u5BC4\u5B58\u5668\u5206\u914D", "\u56FE\u7740\u8272\u4E0B\u6EA2\uFF1A\u6D3B\u8DC3\u6570 > k \u5219\u6EA2\u51FA", "Chaitin \u56FE\u7740\u8272", "k \u4E2A\u5BC4\u5B58\u5668", "live=6:0:64:\u2014,k=4:1:32:\u2014", "ge(live,k+1)", "spill", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u94FE\u63A5", "\u91CD\u5B9A\u4F4D\u9879\u6570", "\u94FE\u63A5", "\u76EE\u6807\u6587\u4EF6", "n=10:0:1e5:\u2014", "n", "relocs", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u89E3\u91CA\u5668", "\u89E3\u91CA\u6267\u884C\u6BCF\u6761\u6307\u4EE4\u4E00\u6B21\u5206\u6D3E", "\u5B57\u8282\u7801\u89E3\u91CA", "\u6307\u4EE4\u6761\u6570", "n=100:1:1e6:\u2014", "n", "ops", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7JIT", "\u70ED\u70B9\u7F16\u8BD1\u9608\u503C\uFF1A\u6267\u884C\u6B21\u6570 \u2265 T \u5219\u7F16\u8BD1", "JIT \u70ED\u70B9", "\u4E00\u4E2A\u8BA1\u6570\u5668", "count=100:0:1e6:\u2014,T=50:1:1e5:\u2014", "ge(count,T)", "compile", "\u2014", "principle"),
  r5("\u7F16\u8BD1\xB7\u5783\u573E\u56DE\u6536", "\u6807\u8BB0-\u6E05\u9664\u5B58\u6D3B\u6BD4\u4F8B", "\u8FFD\u8E2A\u5F0F GC", "\u5806\u5BF9\u8C61\u5DF2\u626B\u63CF", "live=30:0:1e6:\u2014,total=100:1:1e6:\u2014", "live/total", "frac", "\u2014", "principle")
];

// js/lab/rows/eng.js
var r6 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var ENG = [
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7Raft", "\u8FC7\u534A\u5373\u5F53\u9009\uFF1Avotes \u2265 \u230An/2\u230B+1", "Ongaro & Ousterhout, Raft", "\u6295\u7968\u8BA1\u6570", "votes=3:0:11:\u2014,n=5:1:11:\u2014", "ge(votes,floor(n/2)+1)", "elected", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7Paxos", "\u540C\u4E00\u591A\u6570\u6D3E\u6CD5\u5B9A\u4EBA\u6570 \u230An/2\u230B+1", "Lamport, Paxos", "\u6CD5\u5B9A\u4EBA\u6570\u5B9A\u4E49", "n=5:1:11:\u2014", "floor(n/2)+1", "q", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7MapReduce", "\u6D17\u724C\u91CF\u7EA7\u7B49\u4E8E\u4E2D\u95F4\u952E\u503C\u5BF9\u6761\u6570", "Dean & Ghemawat, MapReduce", "\u53EA\u8BA1\u6570", "n=1000:0:1e7:\u2014", "n", "pairs", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7\u4E00\u81F4\u6027\u54C8\u5E0C", "\u865A\u62DF\u8282\u70B9\u540E\u8D1F\u8F7D\u5DEE\u968F\u526F\u672C\u4E0B\u964D\uFF1B\u671F\u671B\u8D1F\u8F7D n/k", "Karger \u7B49, \u4E00\u81F4\u6027\u54C8\u5E0C", "\u5747\u5300", "n=1000:1:1e7:\u2014,k=8:1:256:\u2014", "n/k", "load", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7Gossip", "\u4E00\u8F6E\u540E\u672A\u611F\u67D3\u6BD4\u4F8B (1\u22121/n)^i", "\u6D41\u8A00\u4F20\u64AD", "\u72EC\u7ACB\u63A8\u9001", "n=20:2:1000:\u2014,i=20:0:5000:\u2014", "(1-1/n)^i", "uninf", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7\u62DC\u5360\u5EAD", "\u53E3\u5934\u6D88\u606F\u4E0B\u5BB9\u5FCD f \u9700\u8981 n\u22653f+1", "Lamport, Shostak, Pease", "\u540C\u6B65\u53E3\u5934\u6D88\u606F\u6A21\u578B\u7684\u7ECF\u5178\u754C", "f=1:0:7:\u2014", "3*f+1", "n_min", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7\u533A\u5757\u94FE", "\u6700\u957F\u94FE\u89C4\u5219\u4E0B\u786E\u8BA4\u6DF1\u5EA6", "\u4E2D\u672C\u806A\u8BBA\u6587\u7684\u786E\u8BA4\u6DF1\u5EA6\u6982\u5FF5", "\u53EA\u8BA1\u533A\u5757\u6DF1\u5EA6\uFF0C\u4E0D\u662F\u6316\u77FF\u4F18\u5316", "d=6:0:100:\u2014", "d", "depth", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7\u5165\u4FB5\u68C0\u6D4B", "\u8BEF\u62A5\u7387 FP/(FP+TN)", "\u68C0\u6D4B\u5668\u6DF7\u6DC6\u77E9\u9635\u5B9A\u4E49", "\u8BA1\u6570\u5DF2\u7ED9\u5B9A\uFF0C\u4E0D\u662F\u653B\u51FB\u65B9\u6CD5", "FP=5:0:1e5:\u2014,TN=95:0:1e6:\u2014", "FP/(FP+TN)", "fpr", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7\u9632\u706B\u5899", "\u9ED8\u8BA4\u62D2\u7EDD\u65F6\uFF0C\u663E\u5F0F\u5141\u8BB8\u89C4\u5219\u6570", "\u5305\u8FC7\u6EE4\u7B56\u7565\u8BA1\u6570", "\u4E0D\u662F\u89C4\u5219\u7ED5\u8FC7", "allow=3:0:1000:\u2014", "allow", "rules", "\u2014"),
  r6("\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168\xB7\u6C99\u7BB1", "\u80FD\u529B\u96C6\u5408\u5927\u5C0F", "\u6700\u5C0F\u6743\u9650\u7684\u80FD\u529B\u8BA1\u6570", "\u53EA\u8BA1\u6570", "n=2:0:64:\u2014", "n", "caps", "\u2014"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u4E0E\u95E8", "Y=A AND B", "Mano, \u4E0E\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=1:0:1:\u2014,B=1:0:1:\u2014", "and2(A,B)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u6216\u95E8", "Y=A OR B", "Mano, \u6216\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=1:0:1:\u2014,B=0:0:1:\u2014", "or2(A,B)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u975E\u95E8", "Y=NOT A", "Mano, \u975E\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=0:0:1:\u2014", "not1(A)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u4E0E\u975E", "Y=NAND", "\u4E0E\u975E\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=1:0:1:\u2014,B=1:0:1:\u2014", "nand2(A,B)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u6216\u975E", "Y=NOR", "\u6216\u975E\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=0:0:1:\u2014,B=0:0:1:\u2014", "nor2(A,B)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u5F02\u6216", "Y=XOR", "\u5F02\u6216\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=1:0:1:\u2014,B=0:0:1:\u2014", "xor2(A,B)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u540C\u6216", "Y=XNOR", "\u540C\u6216\u95E8", "\u7406\u60F3\u5E03\u5C14", "A=1:0:1:\u2014,B=1:0:1:\u2014", "xnor2(A,B)", "Y", "\u2014", "engineering"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u4E09\u6001\u95E8", "\u4F7F\u80FD\u65F6\u8F93\u51FA\u7B49\u4E8E\u8F93\u5165\uFF0C\u5426\u5219\u9AD8\u963B\u8BB0\u4E3A \u22121", "\u4E09\u6001\u7F13\u51B2", "\u9AD8\u963B\u7528 \u22121 \u8868\u793A", "en=1:0:1:\u2014,A=1:0:1:\u2014", "step(en)*A+(1-step(en))*(-1)", "Y", "\u2014", "principle"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u4F20\u8F93\u95E8", "CMOS \u4F20\u8F93\u95E8\u5BFC\u901A\u65F6 Y=A", "\u4F20\u8F93\u95E8", "\u7406\u60F3\u5BFC\u901A", "en=1:0:1:\u2014,A=1:0:1:\u2014", "step(en)*A", "Y", "\u2014", "principle"),
  r6("\u6570\u5B57\u903B\u8F91\xB7\u903B\u8F91\u5316\u7B80", "\u5438\u6536\u5F8B\uFF1AA+AB=A", "\u5E03\u5C14\u4EE3\u6570", "\u4E24\u53D8\u91CF", "A=1:0:1:\u2014,B=1:0:1:\u2014", "or2(A,and2(A,B))", "Y", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u534A\u52A0\u5668", "\u548C=XOR\uFF0C\u8FDB\u4F4D=AND", "\u534A\u52A0\u5668", "\u65E0\u4F4E\u4F4D\u8FDB\u4F4D", "A=1:0:1:\u2014,B=1:0:1:\u2014", "xor2(A,B)", "S", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u5168\u52A0\u5668", "\u548C=A XOR B XOR Cin", "\u5168\u52A0\u5668", "\u4E00\u4F4D", "A=1:0:1:\u2014,B=1:0:1:\u2014,Cin=1:0:1:\u2014", "xor2(xor2(A,B),Cin)", "S", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u51CF\u6CD5\u5668", "\u5DEE=A XOR B XOR Bin", "\u5168\u51CF\u5668\u7684\u5DEE", "\u4E00\u4F4D", "A=1:0:1:\u2014,B=0:0:1:\u2014,Bin=0:0:1:\u2014", "xor2(xor2(A,B),Bin)", "D", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u6BD4\u8F83\u5668", "A>B", "\u6570\u503C\u6BD4\u8F83", "\u6807\u91CF\u6BD4\u8F83", "A=2:-5:5:\u2014,B=1:-5:5:\u2014", "A>B", "gt", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u7F16\u7801\u5668", "4-2 \u4F18\u5148\u7F16\u7801\u5668\u5728\u4EC5 D2 \u6709\u6548\u65F6\u8F93\u51FA 2", "\u4F18\u5148\u7F16\u7801\u7684\u7F16\u53F7", "\u53EA\u5141\u8BB8\u4E00\u4E2A\u8F93\u5165\u4E3A 1 \u7684\u6559\u5B66\u4F8B", "d=2:0:3:\u2014", "d", "Y", "\u2014", "principle"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u8BD1\u7801\u5668", "2-4 \u8BD1\u7801\uFF1A\u8F93\u51FA\u5B57\u7B49\u4E8E 2^A", "\u8BD1\u7801\u5668", "A \u4E3A 0..3", "A=1:0:3:\u2014", "2^floor(A)", "Y", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u591A\u8DEF\u9009\u62E9\u5668", "Y=S?B:A", "2 \u9009 1", "\u7406\u60F3", "S=1:0:1:\u2014,A=0:0:1:\u2014,B=1:0:1:\u2014", "(1-step(S))*step(A)+step(S)*step(B)", "Y", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u89E3\u590D\u7528\u5668", "\u9009\u62E9\u7AEF\u628A\u8F93\u5165\u9001\u5230 2^S \u8DEF", "1-2 \u89E3\u590D\u7528", "S=0 \u6216 1", "S=0:0:1:\u2014,D=1:0:1:\u2014", "step(D)*(1+step(S))", "lane", "\u2014", "principle"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7ALU", "\u7B97\u672F\uFF1AY=A+B \u6216 A\u2212B\uFF0C\u7531 M \u9009\u62E9", "\u4E00\u4F4D ALU \u7684\u52A0\u51CF", "\u65E0\u8FDB\u4F4D\u94FE", "A=3:-8:8:\u2014,B=1:-8:8:\u2014,M=0:0:1:\u2014", "(1-step(M))*(A+B)+step(M)*(A-B)", "Y", "\u2014", "engineering"),
  r6("\u7EC4\u5408\u903B\u8F91\xB7\u5947\u5076\u6821\u9A8C", "\u5076\u6821\u9A8C\u4F4D\u4F7F 1 \u7684\u4E2A\u6570\u4E3A\u5076\uFF1AP=A XOR B XOR C", "\u5947\u5076\u6821\u9A8C", "\u4E09\u4F4D", "A=1:0:1:\u2014,B=1:0:1:\u2014,C=0:0:1:\u2014", "xor2(xor2(A,B),C)", "P", "\u2014", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7SR\u9501\u5B58", "\u7981\u6B62\u8F93\u5165 11\uFF1BS=1,R=0 \u65F6 Q=1", "SR \u9501\u5B58", "\u4E0D\u4F7F\u7528\u4E0D\u5B9A\u6001\u8F93\u5165", "S=1:0:1:\u2014,R=0:0:1:\u2014", "step(S)*(1-step(R))", "Q", "\u2014", "principle"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7D\u89E6\u53D1\u5668", "\u65F6\u949F\u6CBF\u540E Q=D", "D \u89E6\u53D1\u5668", "\u7406\u60F3\u8FB9\u6CBF", "D=1:0:1:\u2014", "step(D)", "Q", "\u2014", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7JK\u89E6\u53D1\u5668", "J=K=1 \u65F6\u7FFB\u8F6C\uFF1B\u6B64\u5904 J=1,K=0 \u5219\u7F6E\u4F4D", "JK \u89E6\u53D1\u5668", "\u4E00\u79CD\u8F93\u5165\u7EC4\u5408", "J=1:0:1:\u2014,K=0:0:1:\u2014,Q=0:0:1:\u2014", "or2(and2(J,not1(K)),and2(and2(J,K),not1(Q)))", "Q\u2032", "\u2014", "principle"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7T\u89E6\u53D1\u5668", "T=1 \u65F6 Q\u2032=NOT Q", "T \u89E6\u53D1\u5668", "\u7406\u60F3", "T=1:0:1:\u2014,Q=0:0:1:\u2014", "xor2(T,Q)", "Q\u2032", "\u2014", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7\u5BC4\u5B58\u5668", "n \u4F4D\u5BC4\u5B58\u5668\u5B58\u50A8 n bit", "\u5BC4\u5B58\u5668", "\u5E76\u884C\u88C5\u8F7D", "n=8:1:64:\u2014", "n", "bits", "\u2014", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7\u79FB\u4F4D\u5BC4\u5B58\u5668", "\u903B\u8F91\u53F3\u79FB\u4E00\u4F4D\u7B49\u4E8E floor(v/2)", "\u79FB\u4F4D\u5BC4\u5B58\u5668", "\u65E0\u7B26\u53F7", "v=13:0:255:\u2014", "floor(v/2)", "v\u2032", "\u2014", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7\u8BA1\u6570\u5668", "\u6A21 N \u8BA1\u6570 (c+1) mod N", "\u8BA1\u6570\u5668", "\u540C\u6B65\u52A0 1", "c=3:0:63:\u2014,N=8:2:64:\u2014", "mod(c+1,N)", "c\u2032", "\u2014", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7\u5206\u9891\u5668", "f_out=f_in/N", "\u6574\u6570\u5206\u9891", "N\u22651", "fin=1000:1:1e6:Hz,N=4:1:64:\u2014", "fin/max(1,floor(N))", "fout", "Hz", "engineering"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7\u72B6\u6001\u673A", "Moore \u673A\u8F93\u51FA\u53EA\u4F9D\u8D56\u72B6\u6001\u7F16\u53F7", "\u6709\u9650\u72B6\u6001\u673A", "\u72B6\u6001\u5DF2\u7F16\u7801", "s=2:0:15:\u2014", "s", "y", "\u2014", "principle"),
  r6("\u65F6\u5E8F\u903B\u8F91\xB7\u65F6\u949F\u57DF", "\u4E24\u65F6\u949F\u6BD4 f1/f2", "\u65F6\u949F\u57DF", "\u9891\u7387\u7ED9\u5B9A\uFF0C\u4E0D\u662F\u4E9A\u7A33\u6001\u8BA1\u7B97\u7684\u5168\u90E8", "f1=100:1:1e6:MHz,f2=50:1:1e6:MHz", "f1/f2", "ratio", "\u2014", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u6307\u4EE4\u5468\u671F", "CPI \u5E73\u5747", "\u6307\u4EE4\u5468\u671F", "\u6DF7\u5408\u6307\u4EE4", "cpi=1.5:0.2:20:\u2014", "cpi", "CPI", "\u2014", "engineering"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u6570\u636E\u901A\u8DEF", "\u5355\u5468\u671F\u65F6\u949F \u2265 \u5173\u952E\u8DEF\u5F84\u5EF6\u8FDF", "\u6570\u636E\u901A\u8DEF", "\u5EF6\u8FDF\u7ED9\u5B9A", "tpd=8:0.1:100:ns", "tpd", "Tclk", "ns", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u63A7\u5236\u5668", "\u5FAE\u6307\u4EE4\u6761\u6570", "\u5FAE\u7A0B\u5E8F\u63A7\u5236", "\u4E00\u6761\u6307\u4EE4", "n=5:1:64:\u2014", "n", "\u03BCops", "\u2014", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u5BC4\u5B58\u5668\u5806", "\u7AEF\u53E3\u8BFB\u51FA\u4E2A\u6570", "\u5BC4\u5B58\u5668\u5806", "\u53EA\u8BA1\u6570", "n=2:1:8:\u2014", "n", "reads", "\u2014", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7ALU", "\u52A0\u6CD5\u5EF6\u8FDF\u968F\u4F4D\u6570\u7EBF\u6027\u7684\u95E8\u7EA7\u4F30\u8BA1 t_d = n \xB7 delay", "\u884C\u6CE2\u8FDB\u4F4D", "\u4E00\u4F4D\u5EF6\u8FDF\u7ED9\u5B9A\u3002delay \u662F\u95E8\u5EF6\u8FDF\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "n=32:1:64:\u2014,delay=0.1:0.01:2:ns", "n*delay", "td", "ns", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u603B\u7EBF", "\u5E26\u5BBD=\u5BBD\u5EA6\xD7\u9891\u7387", "\u603B\u7EBF\u5E26\u5BBD", "\u6BCF\u6B21\u4F20\u8F93\u4E00\u5B57", "w=8:1:64:B,f=100:1:5000:MHz", "w*f", "BW", "MB/s", "engineering"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u4E2D\u65AD", "\u4E2D\u65AD\u4F18\u5148\u7EA7\u7F16\u53F7\u5C0F\u8005\u4F18\u5148\u7684\u6BD4\u8F83", "\u4E2D\u65AD\u4F18\u5148\u7EA7", "\u7F16\u53F7\u8D8A\u5C0F\u8D8A\u9AD8", "p=2:0:15:\u2014,cur=4:0:15:\u2014", "le(p,cur)", "preempt", "\u2014", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7DMA", "\u4F20\u8F93\u65F6\u95F4=\u5B57\u8282\u6570/\u5E26\u5BBD", "DMA", "\u72EC\u5360\u603B\u7EBF\u7684\u7406\u60F3", "bytes=4096:1:1e8:B,bw=100:0.1:1e5:MB/s", "bytes/(bw*1e6)", "t", "s", "principle"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u6D41\u6C34\u7EBF", "\u52A0\u901F\u6BD4 S=n k/(k+n\u22121) \u8D8B\u8FD1\u7EA7\u6570 k", "\u7406\u60F3\u6D41\u6C34\u7EBF", "\u65E0\u5192\u9669", "n=100:1:1e5:\u2014,k=5:1:20:\u2014", "n*k/(k+n-1)", "S", "\u2014", "engineering"),
  r6("\u8BA1\u7B97\u673A\u4F53\u7CFB\xB7\u8D85\u6807\u91CF", "\u7406\u60F3 IPC \u7B49\u4E8E\u53D1\u5C04\u5BBD\u5EA6", "\u8D85\u6807\u91CF", "\u65E0\u76F8\u5173", "w=4:1:8:\u2014", "w", "IPC", "\u2014", "principle"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u7F13\u5B58\u6620\u5C04", "\u76F4\u63A5\u6620\u5C04\uFF1A\u884C\u53F7 = (\u5730\u5740/\u5757) mod \u884C\u6570", "\u7F13\u5B58\u6620\u5C04", "\u76F4\u63A5\u6620\u5C04", "addr=1000:0:1e7:\u2014,block=16:4:256:\u2014,lines=64:1:4096:\u2014", "mod(floor(addr/block),lines)", "line", "\u2014", "engineering"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u5199\u7B56\u7565", "\u5199\u56DE\u810F\u5757\u6BD4\u4F8B", "\u5199\u56DE/\u5199\u5206\u914D\u7684\u810F\u884C\u6BD4\u4F8B", "\u7EDF\u8BA1\u5DF2\u7ED9\u5B9A", "dirty=3:0:1000:\u2014,lines=64:1:4096:\u2014", "dirty/lines", "ratio", "\u2014", "principle"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u865A\u62DF\u5185\u5B58", "\u9875\u53F7=\u5730\u5740/\u9875\u5927\u5C0F", "\u5206\u9875", "\u5B57\u8282\u5730\u5740", "addr=5000:0:1e8:\u2014,page=4096:256:65536:\u2014", "floor(addr/page)", "vpn", "\u2014", "engineering"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7TLB", "TLB \u547D\u4E2D\u7387", "TLB", "\u8BBF\u95EE\u8BA1\u6570", "hit=90:0:1e6:\u2014,acc=100:1:1e6:\u2014", "hit/acc", "hr", "\u2014", "engineering"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u9875\u8868", "\u5355\u7EA7\u9875\u8868\u9879\u6570=\u865A\u62DF\u9875\u6570", "\u9875\u8868", "\u5355\u7EA7", "vas=1e6:1:1e9:B,page=4096:256:65536:\u2014", "vas/page", "entries", "\u2014", "principle"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u78C1\u76D8\u8C03\u5EA6", "SCAN \u626B\u8FC7\u7684\u67F1\u9762\u8DDD\u79BB |c2\u2212c1|", "\u78C1\u76D8\u8C03\u5EA6", "\u4E00\u6B21\u79FB\u52A8", "c1=20:0:10000:\u2014,c2=80:0:10000:\u2014", "abs(c2-c1)", "cyl", "\u2014", "principle"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7RAID", "RAID1 \u53EF\u7528\u5BB9\u91CF\u7B49\u4E8E\u5355\u76D8", "RAID \u5BB9\u91CF", "\u955C\u50CF", "disk=4:0.1:20:TB,n=2:2:8:\u2014", "disk", "cap", "TB", "principle"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u95EA\u5B58", "\u78E8\u635F\uFF1A\u64E6\u5199\u6B21\u6570", "\u95EA\u5B58\u5BFF\u547D\u8BA1\u6570", "\u4E00\u5757", "cycles=1000:0:1e6:\u2014", "cycles", "P/E", "\u2014", "principle"),
  r6("\u5B58\u50A8\u5C42\u6B21\xB7\u5185\u5B58\u4E00\u81F4\u6027", "\u603B\u5B58\u50A8\u5E8F\u4E0B\uFF0C\u5199\u540E\u8BFB\u770B\u5230\u6700\u65B0\u503C\u8BB0\u4E3A 1", "\u987A\u5E8F\u4E00\u81F4\u6027\u7684\u4E00\u79CD\u89C2\u5BDF", "\u5355\u5730\u5740", "latest=1:0:1:\u2014", "step(latest)", "see", "\u2014", "principle"),
  r6("\u5D4C\u5165\u5F0F\xB7GPIO", "\u8F93\u51FA\u5BC4\u5B58\u5668\u4E00\u4F4D", "GPIO", "\u63A8\u633D\u8F93\u51FA", "b=1:0:1:\u2014", "step(b)", "pin", "\u2014", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7\u5B9A\u65F6\u5668", "\u6EA2\u51FA\u5468\u671F N/fclk", "\u5B9A\u65F6\u5668", "\u5411\u4E0A\u8BA1\u6570\u5230 N", "N=1000:1:1e7:\u2014,f=1e6:1:1e8:Hz", "N/f", "T", "s", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7\u4E2D\u65AD", "\u4F18\u5148\u7EA7\u54CD\u5E94", "\u5D4C\u5957\u4E2D\u65AD", "\u7F16\u53F7\u6BD4\u8F83", "pri=1:0:15:\u2014,cur=3:0:15:\u2014", "le(pri,cur)", "ok", "\u2014", "principle"),
  r6("\u5D4C\u5165\u5F0F\xB7ADC", "\u91CF\u5316\u53F0\u9636 Vref/2^n", "ADC \u5206\u8FA8\u7387", "\u5747\u5300\u91CF\u5316", "Vref=3.3:0.5:5:V,n=12:4:16:\u2014", "Vref/2^n", "LSB", "V", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7DAC", "\u8F93\u51FA D\xB7Vref/2^n", "DAC", "\u76F4\u7EBF\u4E8C\u8FDB\u5236", "D=2048:0:65535:\u2014,Vref=3.3:0.5:5:V,n=12:4:16:\u2014", "D*Vref/2^n", "V", "V", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7UART", "\u4F4D\u65F6\u95F4 1/\u6CE2\u7279\u7387", "UART", "\u4E00\u4F4D", "baud=115200:300:4e6:baud", "1/baud", "tbit", "s", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7I2C", "\u6807\u51C6\u6A21\u5F0F 100 kHz \u7684\u4F4D\u65F6\u95F4", "I2C \u901F\u7387", "\u6807\u51C6\u6A21\u5F0F", "f=1e5:1e4:3.4e6:Hz", "1/f", "t", "s", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7SPI", "\u4F4D\u901F\u7387 f_sclk", "SPI", "\u4E3B\u673A\u65F6\u949F", "f=1e6:1e3:5e7:Hz", "f", "bps", "Hz", "engineering"),
  r6("\u5D4C\u5165\u5F0F\xB7\u770B\u95E8\u72D7", "\u8D85\u65F6 N/f", "\u770B\u95E8\u72D7", "\u72EC\u7ACB\u65F6\u949F", "N=1e6:1:1e8:\u2014,f=1000:1:1e6:Hz", "N/f", "T", "s", "engineering"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7NRZ", "\u6BD4\u7279\u7387\u7B49\u4E8E\u7B26\u53F7\u7387", "NRZ", "\u4E8C\u8FDB\u5236", "Rs=1000:1:1e8:baud", "Rs", "Rb", "bit/s", "engineering"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7\u66FC\u5F7B\u65AF\u7279", "\u6BD4\u7279\u7387\u662F\u6CE2\u7279\u7387\u7684\u4E00\u534A\uFF08\u6BCF\u6BD4\u7279\u4E24\u6B21\u8DF3\u53D8\uFF09", "\u66FC\u5F7B\u65AF\u7279\u7F16\u7801", "IEEE 802.3 \u98CE\u683C", "Rs=2e6:1:1e8:baud", "Rs/2", "Rb", "bit/s", "engineering"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7AMI", "\u4F20\u53F7\u4EA4\u66FF\uFF0C\u4FE1\u606F\u901F\u7387\u4ECD\u7B49\u4E8E\u4E8C\u8FDB\u5236\u6BD4\u7279\u7387", "AMI", "\u4E8C\u8FDB\u5236", "Rb=1000:1:1e7:bit/s", "Rb", "Rb", "bit/s", "principle"),
  r6("\u901A\u4FE1\u7F16\u7801\xB74B5B", "\u6548\u7387 4/5", "4B5B", "\u5206\u7EC4\u7F16\u7801", "Rb=4:1:1000:Mbit/s", "Rb*4/5", "line", "Mbit/s", "engineering"),
  r6("\u901A\u4FE1\u7F16\u7801\xB78B10B", "\u6548\u7387 8/10", "8B10B", "\u5206\u7EC4\u7F16\u7801", "Rb=8:1:1000:Mbit/s", "Rb*0.8", "line", "Mbit/s", "engineering"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7\u5E76\u4E32\u8F6C\u6362", "\u4E32\u884C\u4F4D\u65F6\u95F4=\u5E76\u884C\u5B57\u65F6\u95F4/\u5BBD\u5EA6", "\u5E76\u4E32\u8F6C\u6362", "\u65E0\u7F16\u7801\u81A8\u80C0", "Tw=1e-6:1e-9:0.01:s,w=8:1:64:\u2014", "Tw/w", "tbit", "s", "engineering"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7\u6270\u7801", "\u6270\u7801\u4E0D\u6539\u53D8\u6BD4\u7279\u7387", "\u6270\u7801", "\u540C\u6B65\u6270\u7801", "Rb=1000:1:1e8:bit/s", "Rb", "Rb", "bit/s", "principle"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7\u773C\u56FE", "\u773C\u9AD8=\u4FE1\u53F7\u5E45\u5EA6\u2212\u566A\u58F0\u95E8\u9650\u7684\u793A\u610F", "\u773C\u56FE", "\u4E24\u7535\u5E73", "A=1:0:5:\u2014,noise=0.1:0:2:\u2014", "max(0,A-noise)", "eye", "\u2014", "principle"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7\u65F6\u949F\u6062\u590D", "\u9501\u76F8\u73AF\u9501\u5B9A\u540E\u8F93\u51FA\u9891\u7387\u7B49\u4E8E\u7B26\u53F7\u7387", "\u65F6\u949F\u6062\u590D", "\u5DF2\u9501\u5B9A", "Rs=1000:1:1e8:baud", "Rs", "f", "Hz", "principle"),
  r6("\u901A\u4FE1\u7F16\u7801\xB7\u5747\u8861", "\u8FEB\u96F6\u4E00\u62BD\u5934\uFF1A\u589E\u76CA 1/H", "\u5355\u62BD\u5934\u8FEB\u96F6", "H\u22600", "H=0.5:0.05:2:\u2014", "1/H", "g", "\u2014", "principle"),
  r6("\u8C03\u5236\xB7AM", "\u8C03\u5236\u5EA6 \u03BC=m/A", "\u5E38\u89C4\u8C03\u5E45", "A>0", "m=0.5:0:2:\u2014,A=1:0.1:5:\u2014", "m/A", "\u03BC", "\u2014", "engineering"),
  r6("\u8C03\u5236\xB7FM", "\u8C03\u9891\u6307\u6570 \u03B2=\u0394f/fm", "FM", "\u5355\u97F3\u8C03\u5236", "df=5000:0:1e6:Hz,fm=1000:1:1e5:Hz", "df/fm", "\u03B2", "\u2014", "engineering"),
  r6("\u8C03\u5236\xB7PM", "\u76F8\u4F4D\u504F\u79FB \u0394\u03C6", "PM", "\u5CF0\u503C\u76F8\u79FB", "dphi=1:0:3.14:rad", "dphi", "\u0394\u03C6", "rad", "engineering"),
  r6("\u8C03\u5236\xB7ASK", "OOK \u5E73\u5747\u529F\u7387\u7EA6\u4E3A\u5CF0\u503C\u7684\u5360\u7A7A\u4E00\u534A", "ASK", "\u7B49\u6982\u7387 0/1", "P=1:0:10:W", "0.5*P", "Pavg", "W", "principle"),
  r6("\u8C03\u5236\xB7FSK", "\u4E24\u9891\u7387\u95F4\u9694", "\u4E8C\u8FDB\u5236 FSK", "\u4E24\u4E2A\u8F7D\u6CE2", "f1=1000:1:1e6:Hz,f2=2000:1:1e6:Hz", "abs(f2-f1)", "\u0394f", "Hz", "engineering"),
  r6("\u8C03\u5236\xB7PSK", "BPSK \u6BD4\u7279\u7387\u7B49\u4E8E\u7B26\u53F7\u7387", "BPSK", "\u4E00\u6BD4\u7279\u6BCF\u7B26\u53F7", "Rs=1000:1:1e8:baud", "Rs", "Rb", "bit/s", "engineering"),
  r6("\u8C03\u5236\xB7QAM", "M \u8FDB\u5236\u6BCF\u7B26\u53F7 log2 M \u6BD4\u7279", "QAM", "\u65B9\u5F62\u661F\u5EA7\u6BD4\u7279\u6570", "M=16:4:256:\u2014", "log2(M)", "k", "bit/symbol", "engineering"),
  r6("\u8C03\u5236\xB7OFDM", "\u5B50\u8F7D\u6CE2\u95F4\u9694 \u0394f=1/T", "OFDM", "\u77E9\u5F62\u7A97\u3001\u65E0\u5FAA\u73AF\u524D\u7F00\u65F6\u7684\u6B63\u4EA4\u95F4\u9694", "T=1e-4:1e-7:0.1:s", "1/T", "\u0394f", "Hz", "engineering"),
  r6("\u8C03\u5236\xB7\u6269\u9891", "\u5904\u7406\u589E\u76CA Gp=\u82AF\u7247\u7387/\u6BD4\u7279\u7387", "\u76F4\u63A5\u5E8F\u5217\u6269\u9891", "\u901F\u7387\u7ED9\u5B9A", "Rc=1e6:1:1e9:chip/s,Rb=1e3:1:1e7:bit/s", "Rc/Rb", "Gp", "\u2014", "engineering"),
  r6("\u8C03\u5236\xB7\u89E3\u8C03", "\u5339\u914D\u6EE4\u6CE2\u5668\u62BD\u6837\u4FE1\u566A\u6BD4 2E/N0", "\u6570\u5B57\u901A\u4FE1", "AWGN\u3001\u7406\u60F3\u540C\u6B65", "E=1:0:100:\u2014,N0=0.1:0.001:10:\u2014", "2*E/N0", "SNR", "\u2014", "principle")
];

// js/lab/rows/engb.js
var r7 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var ENGB = [
  r7("\u5DEE\u9519\u63A7\u5236\xB7\u5947\u5076\u6821\u9A8C", "\u5076\u6821\u9A8C\u4F4D = \u5404\u4F4D\u5F02\u6216", "\u5947\u5076\u6821\u9A8C", "\u4E09\u4F4D", "A=1:0:1:\u2014,B=0:0:1:\u2014,C=1:0:1:\u2014", "xor2(xor2(A,B),C)", "P", "\u2014", "engineering"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7CRC", "\u4F59\u6570\u6B21\u6570\u7B49\u4E8E\u751F\u6210\u591A\u9879\u5F0F\u6B21\u6570", "CRC", "\u53EA\u7ED9\u6821\u9A8C\u4F4D\u6570", "r=8:1:32:\u2014", "r", "r", "bit"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7\u6C49\u660E\u7801", "n=2^r\u22121", "\u6C49\u660E\u7801", "\u7EA0\u6B63\u5355\u9519", "r=3:2:8:\u2014", "2^r-1", "n", "\u2014", "engineering"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7\u5377\u79EF\u7801", "\u7801\u7387 k/n", "\u5377\u79EF\u7801", "\u7ED9\u5B9A\u751F\u6210\u5668\u7684\u8F93\u5165\u8F93\u51FA\u4F4D\u6570", "k=1:1:4:\u2014,n=2:1:8:\u2014", "k/n", "R", "\u2014"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7\u7EF4\u7279\u6BD4", "\u6BCF\u7EA7\u72B6\u6001\u6570 2^{K\u22121}", "Viterbi", "\u7EA6\u675F\u957F\u5EA6 K\uFF0C\u4E0D\u662F\u4FE1\u9053\u653B\u51FB", "K=3:2:8:\u2014", "2^(K-1)", "states", "\u2014"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7LDPC", "\u7801\u7387 k/n", "LDPC", "\u53C2\u6570", "k=50:1:5000:\u2014,n=100:1:10000:\u2014", "k/n", "R", "\u2014"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7Turbo", "\u7801\u7387\u7EA6 1/3 \u7684\u7ECF\u5178\u5E76\u884C\u7EA7\u8054", "Berrou \u7B49, Turbo \u7801\u7684\u5178\u578B\u7801\u7387", "\u53EA\u7ED9\u7801\u7387", "R=0.333:0.1:0.95:\u2014", "R", "R", "\u2014"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7\u4EA4\u7EC7", "\u5757\u4EA4\u7EC7\u6DF1\u5EA6", "\u4EA4\u7EC7\u5668", "\u884C\u5217", "rows=8:1:256:\u2014,cols=8:1:256:\u2014", "rows*cols", "N", "\u2014"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7ARQ", "\u505C\u7B49\u6548\u7387 \u03B7= (1\u2212p)/(1+2a)", "\u505C\u7B49\u5F0F ARQ", "\u8BEF\u5E27\u7387 p\u3001\u5F52\u4E00\u5316\u65F6\u5EF6 a", "p=0.1:0:0.9:\u2014,a=1:0:50:\u2014", "(1-p)/(1+2*a)", "\u03B7", "\u2014"),
  r7("\u5DEE\u9519\u63A7\u5236\xB7HARQ", "chase \u5408\u5E76\u540E SNR \u8FD1\u4F3C\u4E58\u4EE5\u4F20\u8F93\u6B21\u6570", "HARQ \u5408\u5E76", "\u7B49\u589E\u76CA\u91CD\u590D", "snr=2:0:30:\u2014,n=2:1:8:\u2014", "snr*n", "SNR", "\u2014"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7\u4EE5\u592A\u7F51", "\u6700\u5C0F\u5E27 64 \u5B57\u8282\u7684\u4F20\u8F93\u65F6\u95F4", "IEEE 802.3", "\u7ED9\u5B9A\u901F\u7387", "rate=1e8:1e6:1e11:bit/s", "64*8/rate", "t", "s", "engineering"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7IP", "IPv4 \u5934\u6700\u77ED 20 \u5B57\u8282", "RFC 791", "\u65E0\u9009\u9879", "b=20:20:60:B", "b", "hdr", "B", "engineering"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7TCP", "\u5E8F\u53F7\u7A7A\u95F4 2^32", "RFC 793", "32 \u4F4D\u5E8F\u53F7", "bits=32:16:32:\u2014", "2^bits", "space", "\u2014", "engineering"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7UDP", "UDP \u5934 8 \u5B57\u8282", "RFC 768", "\u56FA\u5B9A\u5934", "b=8:8:8:B", "b", "hdr", "B", "engineering"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7ARP", "\u8BF7\u6C42\u4E3A\u5E7F\u64AD", "ARP", "\u4E00\u6761\u8BF7\u6C42\u8BB0 1", "n=1:0:10:\u2014", "n", "req", "\u2014"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7ICMP", "\u56DE\u663E\u5F80\u8FD4 2 \u6BB5", "ICMP echo", "\u65E0\u4E22\u5931", "rtt=20:0.1:1000:ms", "rtt", "t", "ms"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7DHCP", "DORA \u56DB\u6B65", "DHCP", "\u53D1\u73B0-\u63D0\u4F9B-\u8BF7\u6C42-\u786E\u8BA4", "steps=4:1:4:\u2014", "steps", "steps", "\u2014"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7VLAN", "802.1Q \u6807\u7B7E 4 \u5B57\u8282", "IEEE 802.1Q", "\u5355\u6807\u7B7E", "b=4:4:8:B", "b", "tag", "B", "engineering"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7MPLS", "\u6807\u7B7E 32 \u4F4D\u4E2D 20 \u4F4D\u4E3A\u6807\u7B7E\u503C\u7684\u4E2A\u6570\u4E0A\u754C 2^20", "RFC 3032", "\u6807\u7B7E\u7A7A\u95F4", "bits=20:8:20:\u2014", "2^bits", "labels", "\u2014"),
  r7("\u7F51\u7EDC\u534F\u8BAE\xB7QoS", "\u4EE4\u724C\u6876\u901F\u7387", "\u6D41\u91CF\u6574\u5F62", "\u5E73\u5747\u901F\u7387", "rate=10:0.1:10000:Mbit/s", "rate", "r", "Mbit/s", "engineering"),
  r7("VLSI-FPGA\xB7CMOS\u53CD\u76F8\u5668", "tp\u22480.69 Req C", "Rabaey, CMOS \u53CD\u76F8\u5668\u5EF6\u8FDF", "\u9636\u8DC3\u3001\u7B49\u6548\u7535\u963B", "Req=1e4:100:1e6:ohm,C=1e-14:1e-16:1e-11:F", "0.69*Req*C", "tp", "s", "engineering"),
  r7("VLSI-FPGA\xB7\u7EC4\u5408\u903B\u8F91\u95E8", "\u903B\u8F91\u52AA\u529B g\uFF08\u53CD\u76F8\u5668\u4E3A 1\uFF0C\u4E0E\u975E\u5E38\u53D6 4/3\uFF09", "Sutherland, \u903B\u8F91\u52AA\u529B", "\u4E0E\u975E\u4E8C\u8F93\u5165\u7684\u5E38\u7528\u503C", "g=1.333:1:3:\u2014", "g", "g", "\u2014"),
  r7("VLSI-FPGA\xB7\u65F6\u5E8F\u7535\u8DEF", "\u5EFA\u7ACB\u65F6\u95F4\u7EA6\u675F T\u2265tcq+tlogic+tsu", "\u65F6\u5E8F\u7EA6\u675F", "\u5355\u7EA7", "tcq=0.1:0:5:ns,tlog=1:0:20:ns,tsu=0.1:0:5:ns", "tcq+tlog+tsu", "T", "ns", "engineering"),
  r7("VLSI-FPGA\xB7\u5E03\u5C40\u5E03\u7EBF", "\u66FC\u54C8\u987F\u8DDD\u79BB |x2\u2212x1|+|y2\u2212y1|", "\u5E03\u7EBF\u957F\u5EA6", "\u7F51\u683C", "x1=0:0:100:\u2014,y1=0:0:100:\u2014,x2=5:0:100:\u2014,y2=3:0:100:\u2014", "abs(x2-x1)+abs(y2-y1)", "L", "\u2014", "engineering"),
  r7("VLSI-FPGA\xB7\u65F6\u949F\u6811", "\u7406\u60F3\u504F\u659C 0\uFF1B\u8FD9\u91CC\u7ED9\u7F13\u51B2\u7EA7\u6570", "\u65F6\u949F\u6811", "\u7EA7\u6570", "n=4:1:16:\u2014", "n", "levels", "\u2014"),
  r7("VLSI-FPGA\xB7\u529F\u8017", "\u52A8\u6001\u529F\u8017 C V\xB2 f", "CMOS \u52A8\u6001\u529F\u8017", "\u5F00\u5173\u6D3B\u52A8\u5DF2\u542B\u8FDB\u7B49\u6548 C", "C=1e-12:1e-15:1e-9:F,V=1:0.3:5:V,f=1e8:1e3:5e9:Hz", "C*V*V*f", "P", "W", "engineering"),
  r7("VLSI-FPGA\xB7FPGA\u67E5\u627E\u8868", "k \u8F93\u5165 LUT \u7684\u914D\u7F6E\u4F4D\u6570 2^k", "LUT", "\u4E00\u5F20\u771F\u503C\u8868", "k=4:2:6:\u2014", "2^k", "bits", "\u2014", "engineering"),
  r7("VLSI-FPGA\xB7\u53EF\u914D\u7F6E\u903B\u8F91\u5757", "CLB \u5185 LUT \u4E2A\u6570", "FPGA CLB", "\u8BA1\u6570", "n=4:1:16:\u2014", "n", "LUT", "\u2014"),
  r7("VLSI-FPGA\xB7\u7EFC\u5408", "\u903B\u8F91\u7EA7\u6570", "\u7EFC\u5408\u7ED3\u679C", "\u5173\u952E\u8DEF\u5F84\u95E8\u7EA7", "n=6:1:64:\u2014", "n", "levels", "\u2014"),
  r7("VLSI-FPGA\xB7\u65F6\u5E8F\u5206\u6790", "\u88D5\u91CF slack=T\u2212\u8DEF\u5F84\u5EF6\u8FDF", "\u9759\u6001\u65F6\u5E8F", "\u5355\u8DEF\u5F84", "T=10:0.1:100:ns,tp=8:0:100:ns", "T-tp", "slack", "ns", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u91CF\u5316", "\u91CF\u5316\u566A\u58F0\u529F\u7387 \u0394\xB2/12", "\u5747\u5300\u91CF\u5316", "\u6EE1\u5E45\u5747\u5300", "V=1:0.1:5:V,n=8:2:16:\u2014", "(V/2^n)^2/12", "\u03C3\xB2", "V\xB2", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7FFT", "\u9891\u7387\u5206\u8FA8\u7387 fs/N", "DFT", "N \u70B9", "fs=1000:1:1e6:Hz,N=256:4:8192:\u2014", "fs/N", "\u0394f", "Hz", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u5377\u79EF", "\u7EBF\u6027\u5377\u79EF\u957F\u5EA6 n+m\u22121", "\u79BB\u6563\u5377\u79EF", "\u4E24\u6709\u9650\u5E8F\u5217", "n=8:1:4096:\u2014,m=4:1:4096:\u2014", "n+m-1", "L", "\u2014", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u6EE4\u6CE2", "\u4E00\u9636\u4F4E\u901A fc=1/(2\u03C0RC)", "\u6A21\u62DF\u4F4E\u901A", "RC", "R=1000:1:1e6:ohm,C=1e-7:1e-10:0.001:F", "1/(2*pi*R*C)", "fc", "Hz", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u9891\u8C31", "\u5E15\u585E\u74E6\u5C14\uFF1A\u65F6\u57DF\u80FD\u91CF\u7B49\u4E8E\u9891\u57DF\u80FD\u91CF\uFF0C\u8FD9\u91CC\u7ED9\u5355\u9891\u5E45\u5EA6", "\u9891\u8C31", "\u5355\u97F3", "A=1:0:10:\u2014", "A", "A", "\u2014"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u7A97\u51FD\u6570", "\u6C49\u5B81\u4E3B\u74E3\u5BBD\u5EA6\u7EA6 4\u03C0/N \u7684\u6876\u6570 4", "\u7A97\u51FD\u6570", "\u4E3B\u74E3\u5C55\u5BBD\u76F8\u5BF9\u77E9\u5F62\u7A97", "bins=4:2:8:\u2014", "bins", "bins", "\u2014"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u5C0F\u6CE2", "\u4E8C\u8FDB\u5C3A\u5EA6 a=2^j", "\u79BB\u6563\u5C0F\u6CE2", "\u4E00\u5C42\u5C3A\u5EA6", "j=3:0:10:\u2014", "2^j", "a", "\u2014", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u81EA\u9002\u5E94\u6EE4\u6CE2", "LMS\uFF1Aw\u2190w+\u03BC e x", "Widrow, LMS", "\u6807\u91CF", "w=0:-5:5:\u2014,mu=0.1:0.0001:1:\u2014,e=0.5:-5:5:\u2014,x=1:-5:5:\u2014", "w+mu*e*x", "w\u2032", "\u2014", "engineering"),
  r7("\u4FE1\u53F7\u5904\u7406\xB7\u538B\u7F29\u611F\u77E5", "\u6D4B\u91CF\u6570 m\u2265O(k log(n/k)) \u7684\u793A\u610F m=k log2(n/k)", "Candes & Tao \u7684\u6D4B\u91CF\u4E0B\u754C\u91CF\u7EA7", "\u7A00\u758F\u5EA6 k", "k=5:1:100:\u2014,n=256:8:1e5:\u2014", "k*log2(max(2,n/k))", "m", "\u2014"),
  r7("\u63A7\u5236\xB7\u5F00\u73AF", "\u5F00\u73AF\u589E\u76CA K", "\u5F00\u73AF", "\u9759\u6001\u589E\u76CA", "K=2:0:100:\u2014", "K", "K", "\u2014", "engineering"),
  r7("\u63A7\u5236\xB7\u95ED\u73AF", "\u5355\u4F4D\u8D1F\u53CD\u9988 T=G/(1+G)\uFF0CG \u4E3A\u5E38\u6570", "\u95ED\u73AF", "\u9759\u6001", "G=5:0:100:\u2014", "G/(1+G)", "T", "\u2014", "engineering"),
  r7("\u63A7\u5236\xB7PID", "u = Kp e + Ki e t + Kd\xB70\uFF08\u9636\u8DC3\u8BEF\u5DEE\uFF0C\u222Be = e t\uFF0Cde/dt = 0\uFF09", "PID \u5B9A\u4E49", "\u9636\u8DC3\u8BEF\u5DEE\u4E0B\u5BFC\u6570\u9879\u4E3A 0\u3002Kp\u3001Ki\u3001Kd \u4E0E\u624B\u5199 pid-tune \u7684\u9ED8\u8BA4\u4E00\u81F4", "Kp=1.4:0:20:\u2014,Ki=0.55:0:20:\u2014,Kd=0.12:0:10:\u2014,e=1:-5:5:\u2014", "Kp*e+Ki*e*t", "u", "\u2014", "engineering"),
  r7("\u63A7\u5236\xB7\u6839\u8F68\u8FF9", "\u5F00\u73AF\u6781\u70B9\u5B9E\u90E8", "\u6839\u8F68\u8FF9\u8D77\u70B9\u662F\u5F00\u73AF\u6781\u70B9", "\u4E00\u9636", "p=-2:-20:0:1/s", "p", "s", "1/s", "engineering"),
  r7("\u63A7\u5236\xB7\u4F2F\u5FB7\u56FE", "\u4E00\u9636\u6781\u70B9\u540E\u659C\u7387 \u221220 dB/dec", "\u4F2F\u5FB7\u6E10\u8FD1\u7EBF", "\u8FC7\u8F6C\u6298\u4E00\u4E2A\u5341\u500D\u9891", "dec=1:0:3:\u2014", "-20*dec", "slope", "dB/dec", "engineering"),
  r7("\u63A7\u5236\xB7\u72B6\u6001\u7A7A\u95F4", "\u1E8B=A x\uFF0C\u6807\u91CF\u89E3 x=x0 e^{a t}", "\u72B6\u6001\u7A7A\u95F4", "\u4E00\u7EF4", "a=-0.5:-5:2:1/s,x0=1:-5:5:\u2014", "x0*exp(a*t)", "x", "\u2014", "engineering"),
  r7("\u63A7\u5236\xB7\u5361\u5C14\u66FC\u6EE4\u6CE2", "\u6807\u91CF\u5361\u5C14\u66FC\u589E\u76CA K=p/(p+r)", "Kalman \u589E\u76CA", "\u4E00\u7EF4\u3001\u5148\u9A8C\u65B9\u5DEE p\u3001\u6D4B\u91CF\u65B9\u5DEE r", "p=1:0:10:\u2014,r=1:0.01:10:\u2014", "p/(p+r)", "K", "\u2014", "engineering"),
  r7("\u63A7\u5236\xB7\u6700\u4F18\u63A7\u5236", "\u65E0\u9650\u65F6 LQR \u6807\u91CF\uFF1A\u5BF9 \u1E8B=a x\uFF0C\u4EE3\u4EF7 q,r \u7684\u4EE3\u6570\u91CC\u5361\u63D0\u6B63\u6839", "\u6807\u91CF LQR", "a \u6807\u91CF\u3001\u65E0\u9650\u65F6", "a=-1:-5:2:\u2014,q=1:0:20:\u2014,rr=1:0.01:20:\u2014", "rr*(a+sqrt(a*a+q/rr))", "P", "\u2014"),
  r7("\u63A7\u5236\xB7\u9C81\u68D2\u63A7\u5236", "\u7075\u654F\u5EA6 S=1/(1+L)", "\u7075\u654F\u5EA6\u51FD\u6570", "\u56DE\u8DEF\u589E\u76CA L \u4E3A\u5B9E\u6570", "L=5:0:100:\u2014", "1/(1+L)", "S", "\u2014", "engineering"),
  r7("\u63A7\u5236\xB7\u6A21\u578B\u9884\u6D4B", "\u9884\u6D4B\u65F6\u57DF\u6B65\u6570 Np", "MPC", "\u53EA\u7ED9\u65F6\u57DF\u957F\u5EA6", "Np=10:1:80:\u2014", "Np", "Np", "\u2014"),
  r7("\u673A\u5668\u4EBA\xB7\u6B63\u8FD0\u52A8\u5B66", "\u5E73\u9762 2R\uFF1Ax=l1 cos\u03B81+l2 cos(\u03B81+\u03B82)", "Craig, \u6B63\u8FD0\u52A8\u5B66", "\u5E73\u9762\u4E24\u8FDE\u6746", "l1=1:0.05:2:m,l2=0.8:0.05:2:m,t1=0.6:-3.14:3.14:rad,t2=0.4:-3.14:3.14:rad", "l1*cos(t1)+l2*cos(t1+t2)", "x", "m", "engineering"),
  r7("\u673A\u5668\u4EBA\xB7\u9006\u8FD0\u52A8\u5B66", "\u4E24\u8FDE\u6746\u53EF\u8FBE\u6027 c2=(x\xB2+y\xB2\u2212l1\xB2\u2212l2\xB2)/(2 l1 l2)", "\u5E73\u9762 2R \u9006\u89E3\u7684\u4F59\u5F26", "\u8098\u90E8\u89E3\u7684\u4F59\u5F26\uFF0C\u9700\u5728 [\u22121,1]", "x=1:-2:2:m,y=0.5:-2:2:m,l1=1:0.1:2:m,l2=1:0.1:2:m", "(x*x+y*y-l1*l1-l2*l2)/(2*l1*l2)", "c2", "\u2014", "engineering"),
  r7("\u673A\u5668\u4EBA\xB7\u8F68\u8FF9\u89C4\u5212", "\u4E09\u6B21\u591A\u9879\u5F0F\u672B\u7AEF\u901F\u5EA6\u4E3A 0 \u65F6\u4E2D\u70B9 s=0.5", "\u70B9\u5230\u70B9", "\u5F52\u4E00\u5316\u65F6\u95F4 0.5", "s=0.5:0:1:\u2014", "s", "s", "\u2014"),
  r7("\u673A\u5668\u4EBA\xB7PID\u5173\u8282", "\u5173\u8282\u529B\u77E9 \u03C4=Kp e", "\u5173\u8282\u4F3A\u670D\u6BD4\u4F8B\u9879", "\u5355\u5173\u8282", "Kp=10:0:200:\u2014,e=0.2:-3:3:rad", "Kp*e", "\u03C4", "N\xB7m", "engineering"),
  r7("\u673A\u5668\u4EBA\xB7\u529B\u63A7", "\u963B\u6297 F=K (x0\u2212x)", "\u521A\u5EA6\u63A7\u5236", "\u4E00\u7EF4", "K=100:0:5000:N/m,x0=0.1:-1:1:m,x=0.08:-1:1:m", "K*(x0-x)", "F", "N", "engineering"),
  r7("\u673A\u5668\u4EBA\xB7\u89C6\u89C9\u4F3A\u670D", "\u56FE\u50CF\u96C5\u53EF\u6BD4\u4E00\u7EF4\uFF1Av=\u2212\u03BB e", "\u89C6\u89C9\u4F3A\u670D", "\u6BD4\u4F8B", "lam=0.5:0:5:\u2014,e=10:-200:200:px", "-lam*e", "v", "px/s", "principle"),
  r7("\u673A\u5668\u4EBA\xB7SLAM", "\u91CC\u7A0B\u8BA1\u534F\u65B9\u5DEE\u968F\u6B65\u6570\u7EBF\u6027\u589E\u957F\u7684\u793A\u610F \u03C3\xB2=n \u03C30\xB2", "\u7D2F\u79EF\u8BEF\u5DEE", "\u72EC\u7ACB\u589E\u91CF", "n=10:1:1000:\u2014,s0=0.01:0:1:\u2014", "n*s0", "var", "\u2014"),
  r7("\u673A\u5668\u4EBA\xB7\u8DEF\u5F84\u89C4\u5212", "\u6805\u683C A* \u7684\u542F\u53D1\u5F0F h=|dx|+|dy|", "\u66FC\u54C8\u987F\u542F\u53D1\u5F0F", "\u56DB\u8FDE\u901A", "dx=3:-50:50:\u2014,dy=4:-50:50:\u2014", "abs(dx)+abs(dy)", "h", "\u2014", "engineering"),
  r7("\u673A\u5668\u4EBA\xB7\u591A\u673A\u5668\u4EBA", "\u901A\u4FE1\u56FE\u8FDE\u901A\u6240\u9700\u8FB9\u6570\u81F3\u5C11 n\u22121", "\u751F\u6210\u6811", "n \u4E2A\u673A\u5668\u4EBA", "n=4:1:20:\u2014", "n-1", "edges", "\u2014", "engineering"),
  r7("\u673A\u5668\u4EBA\xB7\u6293\u53D6", "\u529B\u5C01\u95ED\u7684\u6469\u64E6\u9525\u534A\u89D2", "\u5E93\u4ED1\u6469\u64E6", "\u7ED9\u5B9A \u03BC", "mu=0.3:0:1.5:\u2014", "atan(mu)*180/pi", "\u03B1", "\xB0", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u6574\u6D41", "\u5355\u76F8\u6865\u5F0F\u7406\u60F3 Vavg=2 Vm/\u03C0", "\u4E8C\u6781\u7BA1\u6865", "\u963B\u6027\u8D1F\u8F7D\u3001\u5FFD\u7565\u538B\u964D", "Vm=12:0:400:V", "2*Vm/pi", "Vavg", "V", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u9006\u53D8", "\u65B9\u6CE2\u57FA\u6CE2\u5CF0\u503C 4 Vdc/\u03C0", "\u5355\u76F8\u65B9\u6CE2\u9006\u53D8", "\u5085\u91CC\u53F6\u57FA\u6CE2", "Vdc=48:0:800:V", "4*Vdc/pi", "V1", "V", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u65A9\u6CE2", "\u964D\u538B Vout=D Vin", "Buck \u7406\u60F3", "\u8FDE\u7EED\u3001\u65E0\u635F\u8017", "D=0.5:0:1:\u2014,Vin=12:0:400:V", "D*Vin", "Vout", "V", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u53D8\u9891", "V/f \u5E38\u6570\u4E0B\u7535\u538B\u968F\u9891\u7387", "\u6052\u538B\u9891\u6BD4", "\u57FA\u9891\u4EE5\u4E0B", "f=25:1:400:Hz,k=4:0.1:20:V/Hz", "k*f", "V", "V", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u76F4\u6D41\u7535\u673A", "Ea=K \u03C6 \u03C9", "\u76F4\u6D41\u7535\u673A\u53CD\u7535\u52BF", "K\u03C6 \u5408\u5E76\u4E3A\u5E38\u6570", "K=0.2:0.001:2:V\xB7s,w=100:0:400:rad/s", "K*w", "Ea", "V", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u540C\u6B65\u7535\u673A", "n=120 f/p", "\u540C\u6B65\u8F6C\u901F", "p \u4E3A\u6781\u6570", "f=50:10:400:Hz,p=4:2:24:\u2014", "120*f/p", "n", "r/min", "engineering"),
  r7("\u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A\xB7\u65E0\u7EBF\u5145\u7535", "\u4E92\u611F\u7535\u538B \u03C9 M I", "\u677E\u8026\u5408\u53D8\u538B\u5668", "\u6B63\u5F26\u7A33\u6001\u5E45\u503C", "w=1e5:10:1e7:rad/s,M=1e-5:1e-8:0.001:H,I=1:0:20:A", "w*M*I", "U", "V", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u56DB\u6746", "Grashof\uFF1A\u6700\u77ED+\u6700\u957F \u2264 \u53E6\u4E24\u6746\u4E4B\u548C\u5219\u53EF\u6574\u5468", "Grashof \u51C6\u5219", "\u56DB\u6746\u957F\u5EA6", "s=1:0.1:5:\u2014,l=3:0.1:8:\u2014,p=2:0.1:8:\u2014,q=2.5:0.1:8:\u2014", "le(s+l,p+q)", "crank", "\u2014", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u66F2\u67C4\u6ED1\u5757", "\u884C\u7A0B\u7EA6 2 \u500D\u66F2\u67C4\uFF08\u5BF9\u5FC3\uFF09", "\u5BF9\u5FC3\u66F2\u67C4\u6ED1\u5757", "\u66F2\u67C4\u80FD\u6574\u5468", "r=0.1:0.01:1:m", "2*r", "stroke", "m", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u68D8\u8F6E", "\u6BCF\u9F7F\u8F6C\u89D2 2\u03C0/z", "\u68D8\u8F6E", "\u5747\u5E03\u9F7F", "z=12:4:120:\u2014", "2*pi/z", "d\u03B8", "rad", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u69FD\u8F6E", "\u69FD\u6570 n \u7684\u8F6C\u4F4D\u89D2 2\u03C0/n", "\u9A6C\u8033\u4ED6\u69FD\u8F6E", "\u5355\u9500", "n=4:3:12:\u2014", "2*pi/n", "d\u03B8", "rad", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u4E07\u5411\u8282", "\u4ECE\u52A8\u89D2\u901F\u5EA6\u6CE2\u52A8 \u03C92/\u03C91=cos\u03B2/(1\u2212sin\xB2\u03B2 sin\xB2\u03B8)", "\u864E\u514B\u4E07\u5411\u8282", "\u5355\u8282\uFF0C\u03B8 \u4E3A\u8F93\u5165\u89D2", "beta=0.4:0:1.2:rad,theta=0.7:0:1.57:rad", "cos(beta)/(1-sin(beta)^2*sin(theta)^2)", "ratio", "\u2014", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u95F4\u6B47\u673A\u6784", "\u8FD0\u52A8\u7CFB\u6570 \u03C4=\u8FD0\u52A8\u89D2/2\u03C0", "\u95F4\u6B47\u673A\u6784", "\u4E00\u4E2A\u5468\u671F", "phi=1.5:0.1:3:rad", "phi/(2*pi)", "\u03C4", "\u2014"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u5DEE\u901F\u5668", "\u76F4\u884C\u65F6\u4E24\u534A\u8F74\u8F6C\u901F\u7B49\u4E8E\u9525\u9F7F\u8F6E\u67B6", "\u5F00\u5F0F\u5DEE\u901F\u5668", "nL=nR=nc", "nc=100:0:5000:r/min", "nc", "n", "r/min", "engineering"),
  r7("\u673A\u68B0\u673A\u6784\xB7\u673A\u68B0\u81C2", "\u4E0E\u6B63\u8FD0\u52A8\u5B66\u76F8\u540C\u7684\u5E73\u9762\u4F4D\u7F6E\u5F0F\uFF0C\u81C2\u957F\u4E0D\u540C", "\u5E73\u9762\u5B9A\u4F4D", "\u4E24\u8FDE\u6746", "l1=0.4:0.05:1.5:m,l2=0.3:0.05:1.5:m,t1=0.5:-3:3:rad,t2=0.8:-3:3:rad", "l1*cos(t1)+l2*cos(t1+t2)", "x", "m", "engineering"),
  r7("\u4F20\u52A8\xB7\u94FE\u4F20\u52A8", "\u5E73\u5747\u4F20\u52A8\u6BD4 i=z2/z1", "\u94FE\u4F20\u52A8", "\u5E73\u5747\uFF0C\u5FFD\u7565\u591A\u8FB9\u5F62\u6548\u5E94", "z2=30:8:200:\u2014,z1=15:8:80:\u2014", "z2/z1", "i", "\u2014", "engineering"),
  r7("\u4F20\u52A8\xB7\u9F7F\u8F6E\u4F20\u52A8", "i=z2/z1", "\u9F7F\u8F6E", "\u6807\u51C6\u556E\u5408", "z2=40:10:200:\u2014,z1=20:10:100:\u2014", "z2/z1", "i", "\u2014", "engineering"),
  r7("\u4F20\u52A8\xB7\u8717\u8F6E\u8717\u6746", "i=z/k\uFF0Ck \u4E3A\u8717\u6746\u5934\u6570", "\u8717\u6746\u4F20\u52A8", "\u8717\u8F6E\u9F7F\u6570 z", "z=40:10:120:\u2014,k=1:1:4:\u2014", "z/k", "i", "\u2014", "engineering"),
  r7("\u4F20\u52A8\xB7\u87BA\u65CB\u4F20\u52A8", "\u5BFC\u7A0B L=n P", "\u87BA\u65CB", "n \u7EBF\u3001\u87BA\u8DDD P", "n=1:1:4:\u2014,P=0.002:0.0005:0.02:m", "n*P", "L", "m", "engineering"),
  r7("\u4F20\u52A8\xB7\u79BB\u5408", "\u6469\u64E6\u79BB\u5408\u5668\u8F6C\u77E9 \u03BC F R n", "\u76D8\u5F0F\u6469\u64E6", "n \u4E2A\u6469\u64E6\u9762\u3001\u5747\u5300\u538B\u529B\u7684\u7B80\u5316", "mu=0.3:0.05:0.6:\u2014,F=200:0:5000:N,R=0.1:0.01:0.4:m,n=2:1:8:\u2014", "mu*F*R*n", "T", "N\xB7m", "principle"),
  r7("\u4F20\u52A8\xB7\u5236\u52A8", "\u5236\u52A8\u529B\u77E9 \u03BC N R", "\u9F13\u5F0F\u6216\u76D8\u5F0F\u7684\u7B80\u5316", "\u4E00\u4E2A\u6469\u64E6\u534A\u5F84", "mu=0.4:0.05:0.8:\u2014,N=500:0:2e4:N,R=0.15:0.02:0.5:m", "mu*N*R", "T", "N\xB7m", "principle"),
  r7("\u4F20\u52A8\xB7\u53D8\u901F\u5668", "\u603B\u4F20\u52A8\u6BD4\u8FDE\u4E58", "\u9F7F\u8F6E\u53D8\u901F", "\u4E24\u7EA7", "i1=2:0.2:6:\u2014,i2=1.5:0.2:6:\u2014", "i1*i2", "i", "\u2014", "engineering"),
  r7("\u4F20\u52A8\xB7\u8054\u8F74\u5668", "\u4F20\u9012\u8F6C\u77E9 T=9550 P/n", "\u529F\u7387\u4E0E\u8F6C\u77E9", "n \u4E3A r/min\uFF0CP \u4E3A kW", "P=10:0:500:kW,n=1500:10:20000:r/min", "9550*P/n", "T", "N\xB7m", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u5355\u81EA\u7531\u5EA6", "\u03C9n=\u221A(k/m)", "\u5355\u81EA\u7531\u5EA6", "\u65E0\u963B\u5C3C", "k=1000:1:1e6:N/m,m=2:0.05:500:kg", "sqrt(k/m)", "\u03C9n", "rad/s", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u591A\u81EA\u7531\u5EA6", "\u4E24\u8D28\u91CF\u65E0\u8026\u5408\u65F6\u5404\u81EA \u03C9", "\u89E3\u8026\u6781\u9650", "\u03BA=0 \u65F6 \u03C9=\u221A(k/m)", "k=100:1:1e5:N/m,m=1:0.05:100:kg", "sqrt(k/m)", "\u03C9", "rad/s", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u6A21\u6001", "\u6A21\u6001\u8D28\u91CF\u5F52\u4E00\u540E\u9891\u7387\u5373 \u03C9", "\u6A21\u6001\u5750\u6807", "\u5DF2\u7ED9\u6A21\u6001\u521A\u5EA6\u4E0E\u8D28\u91CF", "km=200:0.1:1e6:\u2014,mm=1:0.01:100:\u2014", "sqrt(km/mm)", "\u03C9", "rad/s", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u5438\u632F", "\u52A8\u529B\u5438\u632F\u5668\u8C03\u8C10 \u03C9a=\u221A(ka/ma)=\u03C9n", "Den Hartog, \u52A8\u529B\u5438\u632F\u5668", "\u65E0\u963B\u5C3C\u4E3B\u7CFB\u7EDF\u7684\u8C03\u8C10\u6761\u4EF6", "wn=20:0.5:400:rad/s", "wn", "\u03C9a", "rad/s", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u8F6C\u5B50\u5E73\u8861", "\u6B8B\u4F59\u4E0D\u5E73\u8861\u529B m e \u03C9\xB2", "\u521A\u6027\u8F6C\u5B50", "\u5355\u5E73\u9762", "m=0.01:0:2:kg,e=0.001:0:0.05:m,w=100:0:2000:rad/s", "m*e*w*w", "F", "N", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u8F74\u627F\u632F\u52A8", "\u8F6C\u9891 f=n/60", "\u8F6C\u9891", "r/min", "n=1500:0:20000:r/min", "n/60", "f", "Hz", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u9F7F\u8F6E\u6545\u969C", "\u556E\u5408\u9891\u7387 f=z n/60", "\u9F7F\u8F6E\u556E\u5408\u9891\u7387", "\u5B9A\u8F74", "z=20:8:200:\u2014,n=1500:0:20000:r/min", "z*n/60", "f", "Hz", "engineering"),
  r7("\u673A\u68B0\u632F\u52A8\xB7\u968F\u673A\u632F\u52A8", "\u767D\u566A\u58F0\u4F4D\u79FB\u65B9\u5DEE \u03C0 S0 \u03C9n/(2 \u03B6) \u7684\u91CF\u7EA7\u5728 \u03B6\u3001\u03C9n \u7ED9\u5B9A\u65F6", "\u5355\u81EA\u7531\u5EA6\u968F\u673A\u54CD\u5E94", "\u7406\u60F3\u767D\u566A\u58F0\u3001\u8F7B\u963B\u5C3C", "S0=1:0:100:\u2014,wn=10:0.2:200:\u2014,zeta=0.05:0.001:0.5:\u2014", "pi*S0*wn/(2*zeta)", "\u03C3\xB2", "\u2014"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7S-N\u66F2\u7EBF", "Basquin\uFF1A\u03C3 N^b = C \u7684\u5BFF\u547D N=(C/\u03C3)^{1/b}", "\u9AD8\u5468\u75B2\u52B3 Basquin", "\u5F39\u6027\u9AD8\u5468\u3001b>0", "C=1000:100:5000:MPa,sig=200:10:800:MPa,b=0.1:0.02:0.3:\u2014", "(C/sig)^(1/b)", "N", "\u2014"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u88C2\u7EB9\u6269\u5C55", "Paris\uFF1Ada/dN=C (\u0394K)^m", "Paris \u5B9A\u5F8B", "\u7EBF\u5F39\u6027\u65AD\u88C2\u3001\u7ED9\u5B9A \u0394K", "C=1e-12:1e-16:1e-8:\u2014,dK=10:1:80:MPa\u221Am,m=3:2:6:\u2014", "C*dK^m", "da/dN", "m/cycle"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u5E94\u529B\u96C6\u4E2D", "\u03C3max=Kt \u03C3nom", "\u5E94\u529B\u96C6\u4E2D\u7CFB\u6570", "\u5F39\u6027", "Kt=2:1:5:\u2014,sn=100:0:500:MPa", "Kt*sn", "\u03C3", "MPa", "engineering"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u75B2\u52B3\u5BFF\u547D", "Miner \u7D2F\u79EF D=n/N", "Miner \u7EBF\u6027\u7D2F\u79EF", "\u4E00\u7EA7\u5E94\u529B", "n=1e4:0:1e8:\u2014,N=1e6:1:1e10:\u2014", "n/N", "D", "\u2014", "engineering"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u65AD\u88C2\u97E7\u6027", "\u4E34\u754C\u88C2\u7EB9 a_c=(1/\u03C0)(KIc/\u03C3)\xB2", "KIc \u5224\u636E", "\u65E0\u9650\u677F\u7A7F\u900F\u88C2\u7EB9", "KIc=50:5:200:MPa\u221Am,sig=200:10:800:MPa", "(1/pi)*(KIc/sig)^2", "ac", "m"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u51B2\u51FB", "\u590F\u6BD4\u80FD\u91CF\u4F5C\u4E3A\u8F93\u5165", "\u51B2\u51FB\u97E7\u6027", "\u5B9E\u9A8C\u503C\u8F93\u5165\uFF0C\u4E0D\u662F\u8BD5\u9A8C\u89C4\u7A0B", "E=40:0:300:J", "E", "E", "J"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u8815\u53D8", "Norton\uFF1A\u03B5\u0307=A \u03C3^n", "Norton \u8815\u53D8", "\u7A33\u6001\u3001\u6052\u6E29\uFF0CA \u5DF2\u542B\u6E29\u5EA6", "A=1e-10:1e-16:1e-6:\u2014,sig=50:1:300:MPa,n=5:1:10:\u2014", "A*sig^n", "\u03B5\u0307", "1/s"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u8150\u8680\u75B2\u52B3", "\u5BFF\u547D\u6298\u51CF\u7CFB\u6570", "\u8150\u8680\u75B2\u52B3", "\u7ECF\u9A8C\u6298\u51CF\uFF0C\u4E0D\u662F\u73AF\u5883\u8C31", "Nair=1e6:1:1e9:\u2014,kf=0.5:0.05:1:\u2014", "kf*Nair", "N", "\u2014"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u6B8B\u4F59\u5E94\u529B", "\u53E0\u52A0 \u03C3=\u03C3app+\u03C3res", "\u6B8B\u4F59\u5E94\u529B\u53E0\u52A0", "\u5F39\u6027", "sapp=100:-300:300:MPa,sres=-50:-300:300:MPa", "sapp+sres", "\u03C3", "MPa", "engineering"),
  r7("\u75B2\u52B3\u65AD\u88C2\xB7\u5931\u6548\u5206\u6790", "\u5B89\u5168\u7CFB\u6570 n=\u03C3allow/\u03C3", "\u5B89\u5168\u7CFB\u6570\u5B9A\u4E49", "\u03C3>0", "sall=200:1:1000:MPa,sig=80:1:1000:MPa", "sall/sig", "n", "\u2014", "engineering")
];

// js/lab/rows/engc.js
var r8 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var ENGC = [
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u98CE\u673A", "P=\u0394p Q/\u03B7", "\u98CE\u673A\u8F74\u529F\u7387", "\u7ED9\u5B9A\u5168\u538B\u4E0E\u6548\u7387", "dp=500:0:2e4:Pa,Q=1:0.01:50:m3/s,eta=0.7:0.3:0.95:\u2014", "dp*Q/eta", "P", "W", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u538B\u7F29\u673A", "\u7406\u60F3\u7EDD\u70ED\u529F\u7387 \u1E41 cp T ((pr)^((\u03B3\u22121)/\u03B3)\u22121)", "\u7EDD\u70ED\u538B\u7F29", "\u7406\u60F3\u6C14\u4F53\u3001\u7ED9\u5B9A\u538B\u6BD4", "md=0.1:0.001:20:kg/s,cp=1004:500:2000:J/kgK,T=300:200:600:K,pr=4:1:40:\u2014,gamma=1.4:1.1:1.67:\u2014", "md*cp*T*(pr^((gamma-1)/gamma)-1)", "P", "W", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u6DA1\u8F6E", "\u7406\u60F3\u8F93\u51FA \u1E41 cp T (1\u2212pr^((\u03B3\u22121)/\u03B3))", "\u7EDD\u70ED\u6DA1\u8F6E", "\u538B\u6BD4\u5C0F\u4E8E 1 \u7528\u51FA\u53E3/\u5165\u53E3", "md=1:0.01:50:kg/s,cp=1100:500:2000:J/kgK,T=1200:400:1800:K,pr=0.4:0.05:0.95:\u2014,gamma=1.33:1.1:1.67:\u2014", "md*cp*T*(1-pr^((gamma-1)/gamma))", "P", "W", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u55B7\u5634", "\u7406\u60F3\u55B7\u7BA1\u51FA\u53E3 v=\u221A(2 \u0394h)", "\u80FD\u91CF\u65B9\u7A0B", "\u7EDD\u70ED\u3001\u5165\u53E3\u901F\u5EA6\u53EF\u5FFD\u7565", "dh=2e5:0:2e6:J/kg", "sqrt(2*dh)", "v", "m/s", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u9600\u95E8", "\u6D41\u91CF Q=Cv \u221A(\u0394P/\u03C1) \u7684\u6BD4\u4F8B\uFF0CCv \u7ED9\u5B9A", "\u9600\u95E8\u6D41\u91CF", "\u6E4D\u6D41\u3001Cv \u4E3A\u7ED9\u5B9A\u7CFB\u6570\u4E0D\u662F\u9009\u578B\u624B\u518C\u6B65\u9AA4", "Cv=1:0.01:50:\u2014,dP=1e5:0:2e6:Pa,rho=1000:1:2000:kg/m3", "Cv*sqrt(dP/rho)", "Q", "\u2014", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u7BA1\u9053", "\u8FBE\u897F hf=f (L/D) v\xB2/(2g)", "Darcy\u2013Weisbach", "f \u7ED9\u5B9A", "f=0.02:0.005:0.08:\u2014,L=50:0.1:2000:m,D=0.1:0.005:2:m,v=2:0:15:m/s", "f*(L/D)*v*v/(2*g)", "hf", "m", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u6DB2\u538B\u7F38", "F=P A", "\u6DB2\u538B\u7F38\u9759\u63A8\u529B", "\u4E0D\u8BA1\u6469\u64E6", "P=1e7:0:4e7:Pa,A=0.002:1e-5:0.1:m2", "P*A", "F", "N", "engineering"),
  r8("\u6D41\u4F53\u673A\u68B0\xB7\u6C14\u52A8\u9A6C\u8FBE", "\u7406\u60F3\u529F\u7387 P Q", "\u6C14\u52A8\u529F\u7387", "\u538B\u529B\u4E0E\u4F53\u79EF\u6D41\u91CF", "P=6e5:0:2e6:Pa,Q=0.01:0:0.5:m3/s", "P*Q", "Pow", "W", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u62C9\u4F38", "\u03C3=F/A", "\u8F74\u5411\u62C9\u4F38", "\u5747\u5300\u622A\u9762", "F=1000:0:1e6:N,A=0.0001:1e-6:0.05:m2", "F/A/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u538B\u7F29", "\u77ED\u67F1 \u03C3=F/A", "\u8F74\u5411\u538B\u7F29", "\u4E0D\u5C48\u66F2\u7684\u77ED\u67F1", "F=2000:0:1e6:N,A=0.0002:1e-6:0.05:m2", "F/A/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u526A\u5207", "\u5E73\u5747\u526A\u5E94\u529B \u03C4=V/A", "\u526A\u5207", "\u5E73\u5747", "V=500:0:1e6:N,A=0.0001:1e-6:0.02:m2", "V/A/1e6", "\u03C4", "MPa", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u7EC4\u5408\u53D8\u5F62", "\u5F2F\u66F2\u4E0E\u8F74\u529B\uFF1A\u03C3=F/A+M y/I", "\u53E0\u52A0", "\u5F39\u6027\u3001\u5C0F\u53D8\u5F62", "F=1000:0:1e5:N,A=0.001:1e-5:0.05:m2,M=200:0:1e5:N\xB7m,y=0.02:0:0.2:m,I=1e-6:1e-9:0.001:m4", "(F/A+M*y/I)/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u538B\u6746\u7A33\u5B9A", "Pcr=\u03C0\xB2 E I /(\u03BC L)\xB2", "\u6B27\u62C9\u516C\u5F0F", "\u7EC6\u957F\u3001\u5F39\u6027\u3001\u8F74\u5FC3", "E=200e9:10e9:300e9:Pa,I=1e-6:1e-9:0.0001:m4,mu=1:0.5:2:\u2014,L=2:0.2:10:m", "pi*pi*E*I/(mu*L)^2", "Pcr", "N", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u5E94\u53D8\u80FD", "\u62C9\u6746 U=F\xB2 L/(2 A E)", "\u5F39\u6027\u5E94\u53D8\u80FD", "\u7EBF\u5F39\u6027", "F=1000:0:1e5:N,L=1:0.05:5:m,A=0.0001:1e-6:0.01:m2,E=200e9:1e9:300e9:Pa", "F*F*L/(2*A*E)", "U", "J", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u5F3A\u5EA6\u7406\u8BBA", "von Mises\uFF1A\u03C3e=\u221A(\u03C3\xB2+3 \u03C4\xB2)", "\u7578\u53D8\u80FD\u51C6\u5219", "\u5E73\u9762", "sig=100:-300:300:MPa,tau=40:0:200:MPa", "sqrt(sig*sig+3*tau*tau)", "\u03C3e", "MPa", "engineering"),
  r8("\u6750\u6599\u529B\u5B66\xB7\u75B2\u52B3", "\u5B89\u5168\u7CFB\u6570 n=\u03C3allow/\u03C3a", "\u75B2\u52B3\u8BB8\u7528", "\u5E94\u529B\u5E45", "sall=150:1:800:MPa,sa=60:1:800:MPa", "sall/sa", "n", "\u2014", "engineering"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u6676\u4F53\u7F3A\u9677", "\u7A7A\u4F4D\u6D53\u5EA6 exp(\u2212Ef/kT)", "\u7A7A\u4F4D\u5F62\u6210", "\u7A00\u6D53\u5EA6", "Ef=1:0.1:3:eV,T=800:200:2000:K", "exp(-Ef*qe/(kB*T))", "c", "\u2014"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u4F4D\u9519", "\u67CF\u6C0F\u77E2\u91CF\u91CF\u7EA7\u7684\u7406\u8BBA\u5207\u5E94\u529B \u03BC/10 \u7684\u6BD4\u4F8B \u03BC b / Lp \u4E0D\u7528\uFF1B\u8FD9\u91CC \u03C4\u2248\u03BC/(2\u03C0)", "\u7406\u8BBA\u526A\u5207\u5F3A\u5EA6\u7684\u91CF\u7EA7", "\u5B8C\u6574\u6676\u4F53\u7684\u7C97\u4F30\uFF0C\u4E0D\u662F\u52A0\u5DE5\u6B65\u9AA4", "mu=50:5:200:GPa", "mu/(2*pi)", "\u03C4", "GPa"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u6269\u6563", "\u83F2\u514B\u7B2C\u4E00\u5B9A\u5F8B J=\u2212D dc/dx", "Fick", "\u7A33\u6001", "D=1e-12:1e-16:1e-8:m2/s,dc=-100:-1e4:0:mol/m4,dx=0.001:1e-5:0.1:m", "-D*dc/dx", "J", "mol/m\xB2s", "engineering"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u51DD\u56FA", "\u51DD\u56FA\u65F6\u95F4 Chvorinov t=C (V/A)\xB2", "Chvorinov \u89C4\u5219", "\u7ECF\u9A8C\u5E38\u6570 C", "C=1e6:1e4:1e8:s/m2,V=0.001:1e-6:0.1:m3,A=0.06:1e-4:2:m2", "C*(V/A)^2", "t", "s"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u70E7\u7ED3", "\u9888\u957F\u6BD4\u7684\u521D\u671F x/R \u221D ts^{1/5} \u53EA\u4FDD\u7559\u65F6\u95F4\u6307\u6570\u793A\u610F", "\u56FA\u76F8\u70E7\u7ED3\u521D\u671F", "\u4E0D\u662F\u5DE5\u827A\u5361\u3002ts \u662F\u70E7\u7ED3\u65F6\u95F4\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "ts=1:0.01:100:\u2014", "ts^0.2", "x/R", "\u2014"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u70ED\u5904\u7406", "\u6269\u6563\u8DDD\u79BB \u221A(D t)", "\u968F\u673A\u884C\u8D70\u6269\u6563\u8DDD\u79BB", "\u6052\u6E29", "D=1e-12:1e-16:1e-8:m2/s,tt=3600:1:1e6:s", "sqrt(D*tt)", "x", "m", "engineering"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u590D\u5408\u6750\u6599", "\u7EB5\u5411\u6DF7\u5408\u5F8B E=Ef Vf+Em(1\u2212Vf)", "Voigt \u6DF7\u5408", "\u7B49\u5E94\u53D8", "Ef=200:10:400:GPa,Em=3:0.5:20:GPa,Vf=0.6:0:1:\u2014", "Ef*Vf+Em*(1-Vf)", "E", "GPa", "engineering"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u7EB3\u7C73\u6750\u6599", "\u6BD4\u8868\u9762\u79EF 6/d\uFF08\u7ACB\u65B9\u6216\u7403\u7684\u91CF\u7EA7\uFF09", "\u51E0\u4F55\u6BD4\u8868\u9762\u79EF", "\u9897\u7C92\u76F4\u5F84 d", "d=20e-9:1e-9:1e-6:m", "6/d", "S", "1/m", "engineering"),
  r8("\u6750\u6599\u79D1\u5B66\xB7\u6750\u6599\u9009\u62E9", "\u8F7B\u91CF\u5316\u521A\u5EA6\u6307\u6807 E^{1/2}/\u03C1", "Ashby \u6750\u6599\u6307\u6807", "\u4E00\u79CD\u53D7\u5F2F\u521A\u5EA6\u7EA6\u675F\u7684\u6307\u6807", "E=70:1:400:GPa,rho=2700:500:20000:kg/m3", "sqrt(E*1e9)/rho", "M", "\u2014", "engineering"),
  r8("\u76F8\u56FE\xB7\u4E8C\u5143\u5171\u6676", "\u6760\u6746\uFF1A\u6DB2\u76F8\u5206\u6570 (c0\u2212cs)/(cl\u2212cs)", "\u6760\u6746\u5B9A\u5F8B", "\u4E24\u76F8\u533A", "c0=0.4:0:1:\u2014,cs=0.1:0:1:\u2014,cl=0.8:0:1:\u2014", "(c0-cs)/max(1e-6,cl-cs)", "fL", "\u2014", "engineering"),
  r8("\u76F8\u56FE\xB7\u5305\u6676", "\u5305\u6676\u53CD\u5E94\u540E\u6309\u6760\u6746\u4F30\u8BA1\u65B0\u76F8\u5206\u6570", "\u6760\u6746\u5B9A\u5F8B", "\u5E73\u8861\u51DD\u56FA\u7684\u5206\u6570", "c0=0.3:0:1:\u2014,ca=0.1:0:1:\u2014,cb=0.5:0:1:\u2014", "(c0-ca)/max(1e-6,cb-ca)", "f", "\u2014"),
  r8("\u76F8\u56FE\xB7\u5300\u6676", "\u56FA\u76F8\u5206\u6570 (cl\u2212c0)/(cl\u2212cs)", "\u6760\u6746\u5B9A\u5F8B", "\u5300\u6676\u4E24\u76F8", "c0=0.4:0:1:\u2014,cs=0.2:0:1:\u2014,cl=0.7:0:1:\u2014", "(cl-c0)/max(1e-6,cl-cs)", "fs", "\u2014", "engineering"),
  r8("\u76F8\u56FE\xB7\u94C1\u78B3\u76F8\u56FE", "\u5171\u6790\u6210\u5206 0.76%C \u7684\u6559\u5B66\u6807\u8BB0\uFF0C\u8FC7\u51B7\u5EA6\u7528\u6E29\u5EA6\u5DEE", "\u94C1\u78B3\u76F8\u56FE\u5171\u6790\u70B9", "\u5E73\u8861\u56FE\u8BFB\u6570\uFF0C\u4E0D\u662F\u70ED\u5904\u7406\u5DE5\u827A", "T=700:20:1200:C", "727-T", "\u0394T", "\xB0C"),
  r8("\u76F8\u56FE\xB7\u4E09\u5143\u76F8\u56FE", "\u4E09\u5143\u6D53\u5EA6\u548C x+y+z=1", "\u6D53\u5EA6\u7EA6\u675F", "\u6469\u5C14\u5206\u6570", "x=0.2:0:1:\u2014,y=0.3:0:1:\u2014", "max(0,1-x-y)", "z", "\u2014", "engineering"),
  r8("\u76F8\u56FE\xB7\u6760\u6746\u5B9A\u5F8B", "fs=(cl\u2212c0)/(cl\u2212cs)", "\u6760\u6746\u5B9A\u5F8B", "\u4E8C\u5143\u4E24\u76F8", "c0=0.5:0:1:\u2014,cs=0.2:0:1:\u2014,cl=0.8:0:1:\u2014", "(cl-c0)/max(1e-6,cl-cs)", "fs", "\u2014", "engineering"),
  r8("\u76F8\u56FE\xB7\u51DD\u56FA\u8DEF\u5F84", "\u5E73\u8861\u5206\u914D k=cs/cl", "\u5206\u914D\u7CFB\u6570", "\u754C\u9762\u5C40\u90E8\u5E73\u8861", "cs=0.2:0:1:\u2014,cl=0.5:0.01:1:\u2014", "cs/cl", "k", "\u2014", "engineering"),
  r8("\u76F8\u56FE\xB7\u76F8\u53D8", "\u9A71\u52A8\u529B\u4E0E\u8FC7\u51B7\u8FD1\u4F3C\u6210\u6B63\u6BD4 \u0394G\u221D\u0394T", "\u5F62\u6838\u9A71\u52A8\u529B\u7684\u4E00\u7EA7\u8FD1\u4F3C", "\u5C0F\u8FC7\u51B7", "dT=20:0:200:K", "dT", "\u0394G~", "K"),
  r8("\u76F8\u56FE\xB7TTT", "\u9F3B\u5C16\u65F6\u95F4 t_n", "TTT \u56FE\u8BFB\u6570", "\u7B49\u6E29\u8F6C\u53D8\uFF0C\u56FE\u5DF2\u6D4B\u5B9A", "tn=10:0.01:1e5:s", "tn", "t", "s"),
  r8("\u76F8\u56FE\xB7CCT", "\u8FDE\u7EED\u51B7\u5374\u76F8\u5BF9 TTT \u7684\u65F6\u95F4\u5E73\u79FB\u500D\u6570", "CCT \u4E0E TTT \u7684\u7ECF\u9A8C\u5173\u7CFB", "\u53EA\u7ED9\u5E73\u79FB\u56E0\u5B50", "shift=1.5:1:5:\u2014", "shift", "shift", "\u2014"),
  r8("\u6269\u6563\xB7\u83F2\u514B\u7B2C\u4E00\u5B9A\u5F8B", "J=\u2212D dc/dx", "Fick \u7B2C\u4E00\u5B9A\u5F8B", "\u7A33\u6001", "D=1e-10:1e-16:1e-6:m2/s,dc=-10:-1000:0:mol/m4,dx=0.01:1e-4:1:m", "-D*dc/dx", "J", "mol/m\xB2s", "engineering"),
  r8("\u6269\u6563\xB7\u83F2\u514B\u7B2C\u4E8C\u5B9A\u5F8B", "\u6052\u5B9A\u8868\u9762\u6D53\u5EA6\u7684\u8BEF\u5DEE\u51FD\u6570\u89E3\u5728 x \u5904\uFF1B\u8FD9\u91CC\u7ED9\u6269\u6563\u957F\u5EA6 \u221A(4Dt)", "Fick \u7B2C\u4E8C\u5B9A\u5F8B", "\u534A\u65E0\u9650\u3001\u5E38 D", "D=1e-10:1e-16:1e-6:m2/s,tt=100:0.01:1e6:s", "sqrt(4*D*tt)", "x", "m", "engineering"),
  r8("\u6269\u6563\xB7\u7A33\u6001\u6269\u6563", "\u5E73\u677F J=D (c1\u2212c2)/L", "\u7A33\u6001\u6269\u6563", "\u5E38 D", "D=1e-10:1e-16:1e-6:m2/s,c1=100:0:1e4:mol/m3,c2=10:0:1e4:mol/m3,L=0.01:1e-4:1:m", "D*(c1-c2)/L", "J", "mol/m\xB2s", "engineering"),
  r8("\u6269\u6563\xB7\u975E\u7A33\u6001\u6269\u6563", "\u5E73\u5747\u6D53\u5EA6\u8870\u51CF\u7684\u8584\u819C\u89E3\u7528 \u221A(Dt)", "\u975E\u7A33\u6001", "\u5E38 D", "D=1e-11:1e-16:1e-6:m2/s,tt=10:0:1e5:s", "sqrt(D*tt)", "\u221ADt", "m"),
  r8("\u6269\u6563\xB7\u6676\u754C\u6269\u6563", "\u6676\u754C\u6269\u6563\u7CFB\u6570\u901A\u5E38\u5927\u4E8E\u4F53\u6269\u6563\uFF1B\u6BD4\u503C Dgb/Dv", "\u6676\u754C\u77ED\u8DEF\u6269\u6563", "\u6BD4\u503C\u7ED9\u5B9A", "ratio=1000:1:1e6:\u2014", "ratio", "Dgb/Dv", "\u2014"),
  r8("\u6269\u6563\xB7\u53CD\u5E94\u6269\u6563", "\u629B\u7269\u7EBF\u751F\u957F x\xB2=2 k t", "\u53CD\u5E94\u5C42\u629B\u7269\u7EBF\u89C4\u5F8B", "\u6269\u6563\u63A7\u5236", "k=1e-14:1e-18:1e-8:m2/s,tt=100:0:1e6:s", "sqrt(2*k*tt)", "x", "m"),
  r8("\u6269\u6563\xB7\u6E17\u78B3", "\u6E17\u5C42\u6DF1\u5EA6\u5DE5\u7A0B\u4E0A\u5E38\u53D6 \u221A(Dt) \u7684\u500D\u6570", "\u6E17\u78B3\u6269\u6563\u6DF1\u5EA6", "\u6052\u6E29\u3001\u4E0D\u662F\u5DE5\u827A\u89C4\u7A0B", "D=1e-11:1e-14:1e-8:m2/s,tt=3600:60:1e5:s", "sqrt(D*tt)", "x", "m"),
  r8("\u6269\u6563\xB7\u6C27\u5316", "\u629B\u7269\u7EBF\u6C27\u5316\u589E\u91CD\xB2 = kp t", "Wagner \u629B\u7269\u7EBF\u6C27\u5316", "\u6269\u6563\u63A7\u5236\u3001\u6052\u6E29", "kp=1e-12:1e-16:1e-8:\u2014,tt=1000:1:1e6:s", "sqrt(kp*tt)", "\u0394m", "\u2014"),
  r8("\u6269\u6563\xB7\u79BB\u5B50\u6CE8\u5165", "\u6295\u5F71\u5C04\u7A0B Rp", "\u79BB\u5B50\u6CE8\u5165\u5C04\u7A0B", "\u80FD\u91CF\u5DF2\u6298\u7B97\u4E3A Rp\uFF0C\u4E0D\u662F\u6CE8\u5165\u914D\u65B9", "Rp=1e-7:1e-9:1e-5:m", "Rp", "Rp", "m"),
  r8("\u6269\u6563\xB7\u6269\u6563\u5076", "Matano \u754C\u9762\u4E24\u4FA7\u7684\u6D53\u5EA6\u8DC3\u53D8", "\u6269\u6563\u5076", "\u6D53\u5EA6\u5DEE", "c1=1:0:2:\u2014,c2=0:0:2:\u2014", "c1-c2", "\u0394c", "\u2014"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u5E94\u529B\u5F3A\u5EA6\u56E0\u5B50", "K_I=\u03C3 \u221A(\u03C0 a)", "\u65E0\u9650\u677F\u7A7F\u900F\u88C2\u7EB9", "\u7EBF\u5F39\u6027\u3001\u8FDC\u573A\u5747\u5300\u62C9\u4F38", "sig=100:0:500:MPa,a=0.01:1e-4:0.2:m", "sig*sqrt(pi*a)", "K", "MPa\u221Am", "engineering"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7J\u79EF\u5206", "\u5C0F\u8303\u56F4\u5C48\u670D J\u2248K\xB2/E\u2032", "J \u4E0E K \u7684\u5173\u7CFB", "\u7EBF\u5F39\u6027\u6781\u9650", "K=30:0:200:MPa\u221Am,E=200:10:400:GPa", "(K*1e6)^2/(E*1e9)/1000", "J", "kJ/m\xB2"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7CTOD", "\u03B4\u2248K\xB2/(E \u03C3y)", "CTOD \u4F30\u8BA1", "\u5C0F\u8303\u56F4\u5C48\u670D", "K=40:0:200:MPa\u221Am,E=200:10:400:GPa,sy=300:50:1500:MPa", "(K*K)/(E*sy)", "\u03B4", "mm"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u88C2\u7EB9\u5C16\u7AEF\u5851\u6027\u533A", "\u5E73\u9762\u5E94\u529B\u5851\u6027\u533A\u534A\u5F84 ry=(1/2\u03C0)(K/\u03C3y)\xB2", "Irwin \u5851\u6027\u533A", "\u5C0F\u8303\u56F4\u5C48\u670D", "K=30:0:150:MPa\u221Am,sy=300:50:1500:MPa", "(1/(2*pi))*(K/sy)^2", "ry", "m"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u75B2\u52B3\u88C2\u7EB9", "Paris da/dN=C \u0394K^m", "Paris", "\u7ED9\u5B9A \u0394K", "C=1e-12:1e-16:1e-8:\u2014,dK=15:1:80:\u2014,m=3:2:6:\u2014", "C*dK^m", "da/dN", "\u2014"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u65AD\u88C2\u5224\u636E", "K_I<KIc \u5219\u5B89\u5168\uFF0C\u88D5\u91CF KIc\u2212K", "\u7EBF\u5F39\u6027\u65AD\u88C2\u5224\u636E", "I \u578B", "KIc=50:5:200:\u2014,K=30:0:200:\u2014", "KIc-K", "margin", "MPa\u221Am", "engineering"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u6B62\u88C2", "\u6B62\u88C2\u8981\u6C42 K \u964D\u5230 KIa \u4EE5\u4E0B\uFF0C\u5DEE K\u2212KIa", "\u6B62\u88C2\u97E7\u5EA6", "KIa \u7ED9\u5B9A", "K=40:0:200:\u2014,KIa=20:1:150:\u2014", "K-KIa", "\u0394", "\u2014"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u635F\u4F24\u529B\u5B66", "\u6709\u6548\u5E94\u529B \u03C3/(1\u2212D)", "Kachanov \u6709\u6548\u5E94\u529B", "\u5404\u5411\u540C\u6027\u635F\u4F24 D<1", "sig=100:0:400:MPa,D=0.2:0:0.9:\u2014", "sig/(1-D)", "\u03C3eff", "MPa"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u8815\u53D8\u65AD\u88C2", "Larson\u2013Miller \u53C2\u6570 P=T(C+log10 tr)", "Larson\u2013Miller", "\u7ECF\u9A8C\u5916\u63A8\u53C2\u6570\uFF0CC \u5E38\u53D6 20 \u9644\u8FD1\u3002tr \u662F\u65AD\u88C2\u65F6\u95F4\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "T=900:400:1500:K,tr=1000:1:1e6:h,C=20:10:30:\u2014", "T*(C+log10(tr))", "P", "\u2014"),
  r8("\u65AD\u88C2\u529B\u5B66\xB7\u51B2\u51FB\u65AD\u88C2", "\u52A8\u6001\u5F3A\u5EA6\u76F8\u5BF9\u9759\u6001\u7684\u500D\u6570", "\u51B2\u51FB", "\u500D\u6570\u7ED9\u5B9A", "ks=1.2:0.5:3:\u2014,s=200:10:800:MPa", "ks*s", "\u03C3d", "MPa"),
  r8("\u590D\u5408\u6750\u6599\xB7\u7EA4\u7EF4\u589E\u5F3A", "E=Ef Vf+Em(1\u2212Vf)", "\u7EB5\u5411\u6DF7\u5408\u5F8B", "\u8FDE\u7EED\u5355\u5411\u7EA4\u7EF4", "Ef=230:10:400:GPa,Em=3:0.5:10:GPa,Vf=0.55:0:0.8:\u2014", "Ef*Vf+Em*(1-Vf)", "E", "GPa", "engineering"),
  r8("\u590D\u5408\u6750\u6599\xB7\u5C42\u5408\u677F", "\u5BF9\u79F0\u5C42\u5408\u677F\u5F2F\u626D\u8026\u5408 B=0", "\u7ECF\u5178\u5C42\u5408\u677F", "\u5BF9\u79F0\u94FA\u5C42\u65F6\u8026\u5408\u521A\u5EA6\u4E3A\u96F6", "sym=1:0:1:\u2014", "1-step(sym)", "B", "\u2014"),
  r8("\u590D\u5408\u6750\u6599\xB7\u5404\u5411\u5F02\u6027", "\u6A2A\u5411\u6CCA\u677E\u4E0E\u6A21\u91CF\u7684\u9EA6\u514B\u65AF\u97E6\u5173\u7CFB \u03BD21/E2=\u03BD12/E1", "\u67D4\u5EA6\u5BF9\u79F0", "\u7EBF\u5F39\u6027\u6B63\u4EA4\u5404\u5411\u5F02\u6027", "E1=140:1:400:GPa,E2=10:0.5:40:GPa,nu12=0.3:0:0.5:\u2014", "nu12*E2/E1", "\u03BD21", "\u2014", "engineering"),
  r8("\u590D\u5408\u6750\u6599\xB7\u5931\u6548\u51C6\u5219", "\u6700\u5927\u5E94\u529B\u51C6\u5219\uFF1A\u03C3/\u03C3allow", "\u6700\u5927\u5E94\u529B\u51C6\u5219", "\u5355\u5411", "sig=400:0:2000:MPa,sall=800:50:3000:MPa", "sig/sall", "R", "\u2014", "engineering"),
  r8("\u590D\u5408\u6750\u6599\xB7\u5C48\u66F2", "\u677F\u6761 Pcr \u4ECD\u7528\u6B27\u62C9\u5F62\u5F0F", "\u538B\u6746\u5C48\u66F2", "\u7406\u60F3\u8F74\u538B", "E=70e9:5e9:300e9:Pa,I=1e-8:1e-12:1e-4:m4,L=0.5:0.05:3:m", "pi*pi*E*I/(L*L)", "Pcr", "N"),
  r8("\u590D\u5408\u6750\u6599\xB7\u51B2\u51FB\u635F\u4F24", "\u51B2\u51FB\u80FD\u91CF", "\u51B2\u51FB", "\u80FD\u91CF\u8F93\u5165", "m=1:0.01:20:kg,v=3:0:50:m/s", "0.5*m*v*v", "E", "J", "engineering"),
  r8("\u590D\u5408\u6750\u6599\xB7\u5939\u5C42\u7ED3\u6784", "\u5939\u5C42\u5F2F\u66F2\u521A\u5EA6\u8FD1\u4F3C E_f b tf c\xB2/2", "\u5939\u5C42\u6881", "\u8584\u9762\u677F\u3001\u5FFD\u7565\u82AF\u5B50\u5F2F\u66F2\u3002tf \u662F\u9762\u677F\u539A\u5EA6\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "Ef=70e9:1e9:300e9:Pa,b=0.1:0.01:1:m,tf=0.001:1e-4:0.01:m,c=0.02:0.001:0.2:m", "Ef*b*tf*c*c/2", "D", "N\xB7m\xB2"),
  r8("\u590D\u5408\u6750\u6599\xB7\u7F16\u7EC7\u590D\u5408\u6750\u6599", "\u7EA4\u7EF4\u4F53\u79EF\u5206\u6570", "\u7F16\u7EC7", "\u7ED9\u5B9A", "Vf=0.45:0:0.7:\u2014", "Vf", "Vf", "\u2014"),
  r8("\u590D\u5408\u6750\u6599\xB7\u7EB3\u7C73\u590D\u5408\u6750\u6599", "\u6E17\u6D41\u9608\u503C\u9644\u8FD1\u5BFC\u7535\u4E0E\u4F53\u79EF\u5206\u6570\u5DEE", "\u6E17\u6D41", "\u03C6>\u03C6c \u624D\u5BFC\u901A\u7684\u793A\u610F", "phi=0.1:0:0.5:\u2014,phic=0.05:0:0.3:\u2014", "max(0,phi-phic)", "\u0394\u03C6", "\u2014"),
  r8("\u590D\u5408\u6750\u6599\xB7\u5065\u5EB7\u76D1\u6D4B", "\u9891\u7387\u76F8\u5BF9\u53D8\u5316 \u0394f/f", "\u632F\u52A8\u76D1\u6D4B", "\u6A21\u6001\u9891\u7387", "f0=20:0.1:500:Hz,f=19.5:0.1:500:Hz", "(f0-f)/f0", "\u0394f/f", "\u2014", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u67F1", "\u8F74\u538B \u03C3=N/A", "\u67F1", "\u77ED\u67F1", "N=1e5:0:1e7:N,A=0.04:0.0001:2:m2", "N/A/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u6841\u67B6", "\u4E8C\u529B\u6746\u8F74\u529B N", "\u6841\u67B6", "\u8F74\u529B\u5DF2\u7531\u8282\u70B9\u5E73\u8861\u7ED9\u51FA\u65F6\u7684\u5E94\u529B", "N=2e4:-1e6:1e6:N,A=0.002:1e-5:0.1:m2", "N/A/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u6846\u67B6", "\u6881\u7AEF\u5F2F\u77E9\u5F15\u8D77\u7684\u5E94\u529B My/I", "\u6846\u67B6\u6881", "\u5F39\u6027", "M=5e4:0:1e7:N\xB7m,y=0.2:0:1:m,I=0.001:1e-6:0.2:m4", "M*y/I/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u62F1", "\u4E09\u94F0\u62F1\u6C34\u5E73\u63A8\u529B H=M_mid/h \u7684\u9759\u5B9A\u5173\u7CFB", "\u4E09\u94F0\u62F1", "\u8DE8\u4E2D\u5F2F\u77E9\u82E5\u4E3A\u7B80\u652F\u7684 M0", "M0=1e5:0:1e7:N\xB7m,h=4:0.5:30:m", "M0/h", "H", "N"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u7D22", "\u629B\u7269\u7EBF\u7D22\u8DE8\u4E2D\u6C34\u5E73\u529B H=w L\xB2/(8 d)", "\u5747\u5E03\u8377\u8F7D\u7D22", "\u5C0F\u5782\u5EA6\u629B\u7269\u7EBF", "w=100:0:5000:N/m,L=20:1:200:m,d=2:0.1:20:m", "w*L*L/(8*d)", "H", "N", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u677F", "\u56DB\u8FB9\u7B80\u652F\u677F\u4E2D\u5FC3\u6320\u5EA6\u7CFB\u6570\uFF0C\u8FD9\u91CC\u7ED9\u67F1\u9762\u521A\u5EA6 D=E h\xB3/12(1\u2212\u03BD\xB2)", "\u8584\u677F\u521A\u5EA6", "\u5404\u5411\u540C\u6027", "E=30e9:1e9:210e9:Pa,h=0.1:0.005:0.5:m,nu=0.2:0:0.45:\u2014", "E*h*h*h/(12*(1-nu*nu))", "D", "N\xB7m"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u58F3", "\u8584\u819C\u73AF\u5411\u5E94\u529B p r / wall", "\u8584\u58C1\u5706\u7B52", "\u5185\u538B\u3002wall \u662F\u58C1\u539A\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "p=1e6:0:2e7:Pa,rad=0.5:0.01:5:m,wall=0.01:0.001:0.1:m", "p*rad/wall/1e6", "\u03C3", "MPa", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u8282\u70B9", "\u87BA\u6813\u6297\u526A n \u03C0 d\xB2 \u03C4 /4", "\u87BA\u6813\u6297\u526A", "n \u4E2A\u526A\u5207\u9762", "n=2:1:6:\u2014,d=0.02:0.006:0.05:m,tau=1e8:1e6:5e8:Pa", "n*pi*d*d*tau/4", "V", "N", "engineering"),
  r8("\u7ED3\u6784\u5DE5\u7A0B\xB7\u652F\u5EA7", "\u7B80\u652F\u6881\u652F\u5EA7\u53CD\u529B wL/2", "\u7B80\u652F\u6881", "\u5747\u5E03\u8377\u8F7D", "w=10:0:500:kN/m,L=8:0.5:40:m", "w*L/2", "R", "kN", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u571F\u538B\u529B", "Ka=(1\u2212sin\u03C6)/(1+sin\u03C6)", "Rankine \u4E3B\u52A8\u571F\u538B\u529B\u7CFB\u6570", "\u65E0\u7C98\u6027\u3001\u5899\u80CC\u7AD6\u76F4\u5149\u6ED1", "phi=30:5:45:deg", "(1-sin(phi*pi/180))/(1+sin(phi*pi/180))", "Ka", "\u2014", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u8FB9\u5761\u7A33\u5B9A", "\u65E0\u9650\u8FB9\u5761\u5B89\u5168\u7CFB\u6570 tan\u03C6/tan\u03B2", "\u65E0\u9650\u8FB9\u5761", "\u5E72\u5761\u3001\u65E0\u7C98\u805A", "phi=32:5:45:deg,beta=20:1:40:deg", "tan(phi*pi/180)/tan(beta*pi/180)", "Fs", "\u2014", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u5730\u57FA\u6C89\u964D", "\u4E00\u7EF4\u538B\u7F29 s= (\u0394\u03C3/E) H", "\u4E00\u7EF4\u6C89\u964D", "\u7EBF\u5F39\u6027\u538B\u7F29\u6A21\u91CF", "ds=50:0:500:kPa,E=5:0.2:50:MPa,H=5:0.2:40:m", "ds*H/E/1000", "s", "m"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u56FA\u7ED3", "\u65F6\u95F4\u56E0\u5B50 Tv=cv t/H\xB2", "Terzaghi \u4E00\u7EF4\u56FA\u7ED3", "\u53CC\u9762\u6216\u5355\u9762\u6392\u6C34\u7684\u6392\u6C34\u8DDD\u79BB H", "cv=1e-7:1e-10:1e-4:m2/s,tt=1e6:1:1e9:s,H=2:0.1:20:m", "cv*tt/(H*H)", "Tv", "\u2014", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u526A\u5207\u5F3A\u5EA6", "Mohr\u2013Coulomb \u03C4=c+\u03C3 tan\u03C6", "\u6297\u526A\u5F3A\u5EA6", "\u6709\u6548\u5E94\u529B\u6216\u603B\u5E94\u529B\u53C2\u6570\u5DF2\u9009\u5B9A", "c=10:0:200:kPa,sig=100:0:1000:kPa,phi=25:0:45:deg", "c+sig*tan(phi*pi/180)", "\u03C4", "kPa", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u6E17\u6D41", "\u8FBE\u897F v=k i", "\u8FBE\u897F\u5B9A\u5F8B", "\u5C42\u6D41", "k=1e-5:1e-9:0.01:m/s,i=0.1:0:2:\u2014", "k*i", "v", "m/s", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u6321\u571F\u5899", "Pa=\xBD \u03B3 H\xB2 Ka", "Rankine \u5408\u529B", "\u65E0\u7C98\u6027\u3001\u5355\u4F4D\u5BBD\u5EA6", "gamma=18:10:22:kN/m3,H=5:0.5:20:m,Ka=0.33:0.1:0.8:\u2014", "0.5*gamma*H*H*Ka", "Pa", "kN/m", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u6869\u57FA", "\u7AEF\u963B Q=qp Ap", "\u6869\u7AEF\u627F\u8F7D\u529B", "\u7AEF\u963B\u5DF2\u7ED9\u5B9A\uFF0C\u4E0D\u662F\u89C4\u8303\u9A8C\u7B97\u6D41\u7A0B", "qp=2000:0:2e4:kPa,Ap=0.2:0.01:2:m2", "qp*Ap", "Q", "kN"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u96A7\u9053", "\u4E0A\u8986\u538B\u529B \u03C1 g h", "\u7AD6\u5411\u5730\u538B", "\u5747\u5300", "rho=2200:1500:2800:kg/m3,h=20:1:500:m", "rho*g*h/1000", "p", "kPa", "engineering"),
  r8("\u5CA9\u571F\u5DE5\u7A0B\xB7\u5730\u9707\u6DB2\u5316", "\u5FAA\u73AF\u5E94\u529B\u6BD4 CSR \u4E0E\u6297\u529B\u6BD4 CRR \u7684\u5B89\u5168\u7CFB\u6570 CRR/CSR", "\u6DB2\u5316\u5B89\u5168\u7CFB\u6570\u5B9A\u4E49", "CSR\u3001CRR \u5DF2\u7531\u8BD5\u9A8C\u6216\u7B80\u5316\u6CD5\u7ED9\u51FA", "CRR=0.3:0:1:\u2014,CSR=0.2:0.01:1:\u2014", "CRR/CSR", "Fs", "\u2014"),
  r8("\u6865\u6881\xB7\u6881\u6865", "\u7B80\u652F\u8DE8\u4E2D\u5F2F\u77E9 w L\xB2/8", "\u7B80\u652F\u6881", "\u5747\u5E03", "w=20:0:200:kN/m,L=20:2:80:m", "w*L*L/8", "M", "kN\xB7m", "engineering"),
  r8("\u6865\u6881\xB7\u62F1\u6865", "\u4E09\u94F0\u62F1\u63A8\u529B H=w L\xB2/(8 f)", "\u5747\u5E03\u8377\u8F7D\u4E09\u94F0\u62F1", "\u77E2\u9AD8 f", "w=20:0:200:kN/m,L=40:5:200:m,f=8:1:40:m", "w*L*L/(8*f)", "H", "kN", "engineering"),
  r8("\u6865\u6881\xB7\u659C\u62C9\u6865", "\u62C9\u7D22\u529B\u7684\u7AD6\u5411\u5206\u91CF T sin\u03B8 = \u8282\u70B9\u8377\u8F7D", "\u659C\u62C9\u7D22", "\u4E00\u6839\u7D22", "W=500:0:1e4:kN,theta=40:10:80:deg", "W/sin(theta*pi/180)", "T", "kN", "engineering"),
  r8("\u6865\u6881\xB7\u60AC\u7D22\u6865", "\u4E3B\u7F06\u6C34\u5E73\u529B H=w L\xB2/(8 d)", "\u60AC\u7D22", "\u5747\u5E03", "w=30:0:300:kN/m,L=200:20:2000:m,d=20:2:200:m", "w*L*L/(8*d)", "H", "kN", "engineering"),
  r8("\u6865\u6881\xB7\u5F71\u54CD\u7EBF", "\u7B80\u652F\u6881\u8DE8\u4E2D\u5F2F\u77E9\u5F71\u54CD\u7EBF\u5CF0\u503C L/4", "\u5F71\u54CD\u7EBF", "\u5355\u4F4D\u529B", "L=20:2:100:m", "L/4", "I", "m", "engineering"),
  r8("\u6865\u6881\xB7\u8F66\u8F86\u8377\u8F7D", "\u8F66\u9053\u8377\u8F7D\u96C6\u4E2D\u529B", "\u8F66\u8F86\u8377\u8F7D", "\u8F93\u5165\u8BBE\u8BA1\u8377\u8F7D\u503C", "P=180:0:2000:kN", "P", "P", "kN"),
  r8("\u6865\u6881\xB7\u98CE\u81F4\u632F\u52A8", "\u6DA1\u8131\u9891\u7387 f=St v/D", "Strouhal", "St \u7ED9\u5B9A", "St=0.2:0.05:0.4:\u2014,v=20:0:80:m/s,D=2:0.05:20:m", "St*v/D", "f", "Hz", "engineering"),
  r8("\u6865\u6881\xB7\u5730\u9707\u54CD\u5E94", "\u5355\u81EA\u7531\u5EA6\u8C31\u52A0\u901F\u5EA6\u4E0B\u7684\u57FA\u5E95\u526A\u529B m Sa", "\u53CD\u5E94\u8C31", "\u5355\u81EA\u7531\u5EA6", "m=1e6:1e3:1e8:kg,Sa=2:0:20:m/s2", "m*Sa/1000", "V", "kN", "engineering"),
  r8("\u6865\u6881\xB7\u75B2\u52B3", "\u5E94\u529B\u5E45\u5FAA\u73AF\u6BD4 n/N", "Miner", "\u4E00\u7EA7", "n=1e5:0:1e9:\u2014,N=2e6:1:1e10:\u2014", "n/N", "D", "\u2014"),
  r8("\u6865\u6881\xB7\u5065\u5EB7\u76D1\u6D4B", "\u6320\u5EA6\u76F8\u5BF9\u8DE8\u5EA6", "\u76D1\u6D4B\u6307\u6807", "\u8DE8\u4E2D\u6320\u5EA6", "delta=0.02:0:1:m,L=30:5:200:m", "delta/L", "\u03B4/L", "\u2014", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u5355\u81EA\u7531\u5EA6\u54CD\u5E94\u8C31", "\u62DF\u52A0\u901F\u5EA6 Sa=\u03C9\xB2 Sd", "\u53CD\u5E94\u8C31\u5173\u7CFB", "\u5F39\u6027", "w=10:0.2:100:rad/s,Sd=0.02:0:0.5:m", "w*w*Sd", "Sa", "m/s\xB2", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u591A\u81EA\u7531\u5EA6\u65F6\u7A0B", "\u7B2C\u4E00\u632F\u578B\u53C2\u4E0E\u7CFB\u6570\u7684\u793A\u610F\uFF0C\u8D28\u91CF\u5F52\u4E00\u540E \u0393=\u03A3m \u03C6 / \u03A3m \u03C6\xB2", "\u632F\u578B\u53C2\u4E0E\u7CFB\u6570", "\u4E24\u5C42\u7B49\u8D28\u91CF\u3001\u632F\u578B (1, \u03C62)", "phi2=0.5:-2:2:\u2014", "(1+phi2)/(1+phi2*phi2)", "\u0393", "\u2014"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u5C42\u95F4\u4F4D\u79FB", "\u5C42\u95F4\u4F4D\u79FB\u89D2 \u03B4/h", "\u5C42\u95F4\u4F4D\u79FB\u89D2", "\u4E00\u5C42", "d=0.01:0:0.2:m,h=3:2:6:m", "d/h", "\u03B8", "\u2014", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u9694\u9707", "\u9694\u9707\u5468\u671F 2\u03C0 \u221A(m/k)", "\u9694\u9707\u5468\u671F", "\u5355\u81EA\u7531\u5EA6", "m=1e5:1e3:1e7:kg,k=1e6:1e4:1e8:N/m", "2*pi*sqrt(m/k)", "T", "s", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u6D88\u80FD", "\u7B49\u6548\u963B\u5C3C\u6BD4 \u03B6eq=E_d/(4\u03C0 E_s)", "\u6EDE\u56DE\u8017\u80FD", "\u4E00\u5468\u80FD\u91CF\u5DF2\u7ED9\u5B9A", "Ed=1000:0:1e6:J,Es=5000:1:1e7:J", "Ed/(4*pi*Es)", "\u03B6", "\u2014"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u573A\u5730\u6548\u5E94", "\u8986\u76D6\u5C42\u5353\u8D8A\u5468\u671F 4H/Vs", "\u56DB\u5206\u4E4B\u4E00\u6CE2\u957F", "\u5355\u8986\u76D6\u5C42", "H=30:1:200:m,Vs=200:50:1500:m/s", "4*H/Vs", "T", "s", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u6DB2\u5316", "\u5B89\u5168\u7CFB\u6570 CRR/CSR", "\u6DB2\u5316\u5224\u522B\u7684\u6BD4\u503C", "\u6BD4\u503C\u7684\u5B9A\u4E49", "CRR=0.25:0:1:\u2014,CSR=0.2:0.01:1:\u2014", "CRR/CSR", "Fs", "\u2014"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u5012\u584C", "\u4F4D\u79FB\u5EF6\u6027 \u03BC=\u03B4u/\u03B4y", "\u5EF6\u6027\u7CFB\u6570", "\u5C48\u670D\u4E0E\u6781\u9650\u4F4D\u79FB", "du=0.2:0:2:m,dy=0.05:0.001:0.5:m", "du/dy", "\u03BC", "\u2014", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7Pushover", "\u57FA\u5E95\u526A\u529B-\u9876\u70B9\u4F4D\u79FB\u7684\u5272\u7EBF\u521A\u5EA6 V/\u03B4", "\u63A8\u8986\u66F2\u7EBF\u5272\u7EBF", "\u4E00\u4E2A\u70B9", "V=500:0:1e5:kN,d=0.1:0.001:2:m", "V/d", "K", "kN/m", "engineering"),
  r8("\u5730\u9707\u5DE5\u7A0B\xB7\u5730\u9707\u6CE2", "\u8D70\u65F6 t=x/v", "\u4F53\u6CE2\u8D70\u65F6", "\u5E38\u901F\u5EA6", "x=10:0:500:km,v=5:0.5:10:km/s", "x/v", "t", "s", "engineering")
];

// js/lab/rows/engd.js
var r9 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "principle") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var ENGD = [
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u7FFC\u578B", "\u5347\u529B L=\xBD \u03C1 v\xB2 c Cl", "\u7FFC\u578B\u5347\u529B", "\u5355\u4F4D\u5C55\u957F\u3001Cl \u7ED9\u5B9A", "rho=1.2:0.2:1.5:kg/m3,v=50:0:200:m/s,c=1:0.1:5:m,Cl=0.5:0:2:\u2014", "0.5*rho*v*v*c*Cl", "L", "N/m", "engineering"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u673A\u7FFC", "\u5347\u529B L=\xBD \u03C1 v\xB2 S Cl", "\u673A\u7FFC\u5347\u529B", "Cl \u7ED9\u5B9A", "rho=1.2:0.2:1.5:kg/m3,v=60:0:250:m/s,S=20:0.5:200:m2,Cl=0.4:0:2:\u2014", "0.5*rho*v*v*S*Cl", "L", "N", "engineering"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u5347\u529B\u7EBF", "\u692D\u5706\u7FFC\u8BF1\u5BFC\u963B\u529B\u56E0\u5B50 1/(\u03C0 AR)", "Prandtl \u5347\u529B\u7EBF", "\u692D\u5706\u73AF\u91CF", "AR=8:2:20:\u2014", "1/(pi*AR)", "k", "\u2014", "engineering"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u6DA1\u683C", "\u6DA1\u683C\u662F\u5347\u529B\u7EBF\u7684\u79BB\u6563\uFF1B\u8FD9\u91CC\u4FDD\u7559\u5C55\u5F26\u6BD4\u8BF1\u5BFC\u56E0\u5B50", "\u6DA1\u683C\u6CD5\u7684\u8BF1\u5BFC\u963B\u529B\u56E0\u5B50", "\u4E0D\u662F\u7F51\u683C\u751F\u6210", "AR=6:2:20:\u2014", "1/(pi*AR)", "k", "\u2014"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u8BF1\u5BFC\u963B\u529B", "Cdi=Cl\xB2/(\u03C0 AR e)", "\u8BF1\u5BFC\u963B\u529B", "Oswald \u6548\u7387 e", "Cl=0.5:0:1.5:\u2014,AR=8:2:20:\u2014,e=0.8:0.5:1:\u2014", "Cl*Cl/(pi*AR*e)", "Cdi", "\u2014", "engineering"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u5931\u901F", "\u5931\u901F\u8FCE\u89D2\u5904 Cl \u4E0D\u518D\u7EBF\u6027\uFF1B\u8FD9\u91CC\u7ED9\u5931\u901F\u8FCE\u89D2\u8F93\u5165", "\u5931\u901F", "\u8FCE\u89D2\u7531\u5B9E\u9A8C\u6216\u7FFC\u578B\u6570\u636E\u7ED9\u5B9A", "alpha=15:0:25:deg", "alpha", "\u03B1s", "\xB0"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u6FC0\u6CE2", "\u6B63\u6FC0\u6CE2\u538B\u6BD4 1+2\u03B3/(\u03B3+1) (M\xB2\u22121)", "\u6B63\u6FC0\u6CE2", "\u91CF\u70ED\u5B8C\u5168\u6C14\u4F53", "M=2:1:6:\u2014,gamma=1.4:1.1:1.67:\u2014", "1+2*gamma/(gamma+1)*(M*M-1)", "p2/p1", "\u2014", "engineering"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u8FB9\u754C\u5C42", "Blasius \u03B4/x=5/\u221ARex", "\u5E73\u677F\u5C42\u6D41\u8FB9\u754C\u5C42", "\u96F6\u538B\u529B\u68AF\u5EA6", "x=1:0.01:10:m,Rex=1e6:1e3:1e8:\u2014", "5*x/sqrt(Rex)", "\u03B4", "m"),
  r9("\u822A\u7A7A\u6C14\u52A8\xB7\u6C14\u52A8\u5F39\u6027", "\u98A4\u632F\u901F\u5EA6\u7684\u91CF\u7EA7\u4E0E\u626D\u8F6C\u521A\u5EA6\u76F8\u5173\uFF1B\u8FD9\u91CC\u7ED9\u6298\u51CF\u9891\u7387 k=\u03C9 b/v", "\u6298\u51CF\u9891\u7387", "\u4E0D\u662F\u98A4\u632F\u8FB9\u754C\u641C\u7D22", "w=20:0.1:200:rad/s,b=1:0.1:5:m,v=50:1:300:m/s", "w*b/v", "k", "\u2014"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u7EB5\u5411\u8FD0\u52A8", "\u9759\u7A33\u5B9A\u8981\u6C42 Cm_\u03B1<0\uFF0C\u8FD9\u91CC\u8F93\u51FA\u5BFC\u6570", "\u7EB5\u5411\u9759\u7A33\u5B9A", "\u5BFC\u6570\u7ED9\u5B9A", "Cma=-0.5:-3:1:\u2014", "Cma", "Cm\u03B1", "\u2014", "engineering"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u6A2A\u822A\u5411", "\u87BA\u65CB\u6A21\u6001\u8FD1\u4F3C\u5224\u636E Lb Nr\u2212Lr Nb \u7684\u7B26\u53F7", "\u6A2A\u822A\u5411\u6A21\u6001\u7684\u4E00\u79CD\u8FD1\u4F3C", "\u5BFC\u6570\u7ED9\u5B9A\uFF0C\u4E0D\u662F\u516D\u81EA\u7531\u5EA6\u4EFF\u771F", "Lb=-1:-5:5:\u2014,Nr=-0.2:-5:5:\u2014,Lr=0.1:-5:5:\u2014,Nb=0.2:-5:5:\u2014", "Lb*Nr-Lr*Nb", "\u0394", "\u2014"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u77ED\u5468\u671F", "\u77ED\u5468\u671F\u9891\u7387\u8FD1\u4F3C \u221A(\u2212(\u03C1 v\xB2 S c /2Iyy) Cm\u03B1)", "\u77ED\u5468\u671F", "\u963B\u5C3C\u53E6\u8BA1\uFF0C\u8FD9\u91CC\u7ED9\u9891\u7387\u91CF\u7EA7\u4E14 Cm\u03B1<0", "rho=1.2:0.2:1.4:kg/m3,v=60:10:200:m/s,S=16:1:40:m2,c=1.5:0.3:4:m,Iyy=2000:10:1e5:kgm2,Cma=-0.8:-3:-0.05:\u2014", "sqrt(max(0,-(rho*v*v*S*c/(2*Iyy))*Cma))", "\u03C9", "rad/s"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u957F\u5468\u671F", "\u6D6E\u6C89\u5468\u671F\u8FD1\u4F3C \u03C0 \u221A2 v/g", "phugoid", "\u65E0\u963B\u5C3C\u8FD1\u4F3C", "v=50:10:200:m/s", "pi*sqrt(2)*v/g", "T", "s", "engineering"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u87BA\u65CB", "\u87BA\u65CB\u6A21\u6001\u65F6\u95F4\u5E38\u6570\u7684\u7B26\u53F7\u7531\u6A2A\u822A\u5411\u5224\u636E\u7ED9\u51FA", "\u87BA\u65CB\u6A21\u6001", "\u5224\u636E Lb Nr\u2212Lr Nb", "Lb=-1:-5:5:\u2014,Nr=-0.3:-5:5:\u2014,Lr=0.2:-5:5:\u2014,Nb=0.1:-5:5:\u2014", "Lb*Nr-Lr*Nb", "crit", "\u2014"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u8377\u5170\u6EDA", "\u8377\u5170\u6EDA\u9891\u7387\u8FD1\u4F3C \u221A(Yb Nv+\u2026 ) \u7684\u4E3B\u5BFC\u9879 \u221A(v Nb /(2 something)) \u7528 \u221A|Nb|", "\u8377\u5170\u6EDA\u9891\u7387\u91CF\u7EA7", "\u5BFC\u6570\u5DF2\u65E0\u91CF\u7EB2\u5316\u5230\u9891\u7387\u5E73\u65B9", "Nb=4:0.1:40:\u2014", "sqrt(abs(Nb))", "\u03C9", "rad/s"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u7A33\u5B9A\u6027", "\u9759\u7A33\u5B9A\u88D5\u5EA6 (xn\u2212xcg)/c", "\u9759\u7A33\u5B9A\u88D5\u5EA6", "\u7126\u70B9\u5728\u91CD\u5FC3\u4E4B\u540E\u4E3A\u6B63", "xn=0.3:0:1:\u2014,xcg=0.25:0:1:\u2014", "xn-xcg", "sm", "\u2014", "engineering"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u64CD\u7EB5\u6027", "\u5347\u964D\u8235\u504F\u89D2\u914D\u5E73\u7684\u9759\u64CD\u7EB5\u5BFC\u6570\u6BD4", "\u64CD\u7EB5\u671F\u671B\u53C2\u6570", "\u5BFC\u6570\u7ED9\u5B9A", "Cmde=-1:-3:-0.05:\u2014,Cma=-0.8:-3:-0.05:\u2014", "Cma/Cmde", "\u03B4/\u03B1", "\u2014"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u914D\u5E73", "\u5E73\u98DE\u5347\u529B\u7B49\u4E8E\u91CD\u91CF", "\u914D\u5E73", "1g", "m=1000:10:5e4:kg", "m*g", "L", "N", "engineering"),
  r9("\u98DE\u884C\u529B\u5B66\xB7\u81EA\u52A8\u9A7E\u9A76", "\u59FF\u6001\u6BD4\u4F8B\u6307\u4EE4 u=Kp e", "\u81EA\u52A8\u9A7E\u9A76\u5185\u73AF", "\u6BD4\u4F8B", "Kp=2:0:20:\u2014,e=0.1:-1:1:rad", "Kp*e", "u", "\u2014", "engineering"),
  r9("\u63A8\u8FDB\xB7\u55B7\u6C14\u53D1\u52A8\u673A", "\u51C0\u63A8\u529B \u1E41(ve\u2212v0)", "\u55B7\u6C14\u63A8\u529B", "\u5145\u5206\u81A8\u80C0\u3001\u5FFD\u7565\u71C3\u6CB9\u8D28\u91CF", "md=20:0.1:500:kg/s,ve=600:0:2000:m/s,v0=200:0:400:m/s", "md*(ve-v0)", "F", "N", "engineering"),
  r9("\u63A8\u8FDB\xB7\u6DA1\u8F6E\u98CE\u6247", "\u6DB5\u9053\u6BD4 BPR", "\u6DA1\u6247", "\u7ED9\u5B9A", "BPR=6:0:15:\u2014", "BPR", "BPR", "\u2014", "engineering"),
  r9("\u63A8\u8FDB\xB7\u6DA1\u8F6E\u55B7\u6C14", "\u70ED\u6548\u7387\u7684\u5E03\u96F7\u987F\u5F62\u5F0F 1\u2212rp^((1\u2212\u03B3)/\u03B3)", "\u7406\u60F3\u5E03\u96F7\u987F", "\u7406\u60F3\u6C14\u4F53", "rp=15:1:40:\u2014,gamma=1.4:1.2:1.5:\u2014", "1-rp^((1-gamma)/gamma)", "\u03B7", "\u2014", "engineering"),
  r9("\u63A8\u8FDB\xB7\u51B2\u538B", "\u7406\u60F3\u51B2\u538B\u70ED\u6548\u7387\u540C\u6837\u968F\u538B\u6BD4\uFF1B\u538B\u6BD4\u6765\u81EA\u51B2\u538B M", "\u51B2\u538B\u53D1\u52A8\u673A\u7684\u7406\u60F3\u5FAA\u73AF\u6548\u7387", "\u6B63\u6FC0\u6CE2\u524D\u7684\u7B49\u71B5\u538B\u6BD4 (1+0.5(\u03B3\u22121)M\xB2)^{\u03B3/(\u03B3\u22121)} \u518D\u4EE3\u5165\u6548\u7387\u592A\u957F\uFF1B\u8FD9\u91CC\u76F4\u63A5\u7528\u603B\u538B\u6BD4", "rp=6:1:30:\u2014,gamma=1.4:1.2:1.5:\u2014", "1-rp^((1-gamma)/gamma)", "\u03B7", "\u2014"),
  r9("\u63A8\u8FDB\xB7\u706B\u7BAD", "\u0394v=ve ln(m0/m)", "\u9F50\u5965\u5C14\u79D1\u592B\u65AF\u57FA", "\u65E0\u91CD\u529B\u65E0\u963B\u529B", "ve=3000:100:5000:m/s,m0=1000:1:1e6:kg,m=400:1:1e6:kg", "ve*ln(m0/m)", "\u0394v", "m/s", "engineering"),
  r9("\u63A8\u8FDB\xB7\u6BD4\u51B2", "Isp=ve/g", "\u6BD4\u51B2\u5B9A\u4E49", "\u91CD\u91CF\u6BD4\u51B2", "ve=3000:100:5000:m/s", "ve/g", "Isp", "s", "engineering"),
  r9("\u63A8\u8FDB\xB7\u63A8\u529B", "F=\u1E41 ve", "\u7406\u60F3\u63A8\u529B", "\u771F\u7A7A\u3001\u65E0\u73AF\u5883\u538B\u529B\u9879", "md=10:0:500:kg/s,ve=2500:100:5000:m/s", "md*ve", "F", "N", "engineering"),
  r9("\u63A8\u8FDB\xB7\u71C3\u70E7\u5BA4", "\u7279\u5F81\u901F\u5EA6 c*=p At / \u1E41", "\u7279\u5F81\u901F\u5EA6\u5B9A\u4E49", "\u5589\u90E8\u58C5\u585E", "p=2e6:1e5:2e7:Pa,At=0.01:1e-4:0.2:m2,md=5:0.01:200:kg/s", "p*At/md", "c*", "m/s", "engineering"),
  r9("\u63A8\u8FDB\xB7\u55B7\u7BA1", "\u63A8\u529B\u7CFB\u6570\u7684\u7406\u60F3\u771F\u7A7A\u4E0A\u9650 (\u03B3 \u51FD\u6570) \u8FD9\u91CC\u7528 ve/c*", "\u55B7\u7BA1", "c* \u4E0E ve \u7ED9\u5B9A", "ve=3000:100:5000:m/s,cs=1500:100:3000:m/s", "ve/cs", "Cf~", "\u2014"),
  r9("\u63A8\u8FDB\xB7\u63A8\u8FDB\u6548\u7387", "\u55B7\u6C14\u63A8\u8FDB\u6548\u7387 2/(1+ve/v0)", "\u63A8\u8FDB\u6548\u7387", "ve>v0", "ve=600:10:3000:m/s,v0=200:1:400:m/s", "2/(1+ve/v0)", "\u03B7p", "\u2014", "engineering"),
  r9("\u8F68\u9053\xB7\u5F00\u666E\u52D2", "T\xB2=4\u03C0\xB2 a\xB3/(G M)", "\u5F00\u666E\u52D2\u7B2C\u4E09\u5B9A\u5F8B", "\u4E24\u4F53", "a=7e6:6.4e6:5e7:m,M=5.97e24:1e22:2e30:kg", "sqrt(4*pi*pi*a*a*a/(Ggrav*M))", "T", "s", "engineering"),
  r9("\u8F68\u9053\xB7\u53CC\u692D\u5706", "\u970D\u66FC\u8F6C\u79FB\u7684\u534A\u957F\u8F74 (r1+r2)/2", "\u970D\u66FC\u8F6C\u79FB", "\u5171\u9762\u5706\u8F68\u9053", "r1=7e6:6.4e6:5e7:m,r2=4e7:7e6:1e8:m", "(r1+r2)/2", "a", "m", "engineering"),
  r9("\u8F68\u9053\xB7\u9003\u9038", "vesc=\u221A(2GM/r)", "\u9003\u9038\u901F\u5EA6", "\u4E24\u4F53", "M=5.97e24:1e20:2e30:kg,rad=6.37e6:1e5:1e8:m", "sqrt(2*Ggrav*M/rad)", "vesc", "m/s", "engineering"),
  r9("\u8F68\u9053\xB7\u4EA4\u4F1A", "\u76F8\u4F4D\u89D2\u5DEE\u5BF9\u5E94\u7684\u65F6\u95F4 \u0394t=\u0394\u03B8/n", "\u540C\u8F68\u9053\u8FFD\u8D76", "\u5706\u8F68\u9053\u5E73\u5747\u8FD0\u52A8 n", "dth=0.5:0:6.28:rad,n=0.001:1e-5:0.01:rad/s", "dth/n", "\u0394t", "s", "engineering"),
  r9("\u8F68\u9053\xB7\u6444\u52A8", "J2 \u5F15\u8D77\u7684\u4EA4\u70B9\u8FDB\u52A8\u91CF\u7EA7 n J2 (R/p)\xB2", "J2 \u8FDB\u52A8\u7684\u6BD4\u4F8B", "\u4E0D\u662F\u5B8C\u6574\u6444\u52A8\u79EF\u5206", "n=0.001:1e-5:0.01:rad/s,J2=0.001:0:0.01:\u2014,R=6371e3:1e6:1e7:m,p=7e6:6.4e6:5e7:m", "n*J2*(R/p)^2", "\u03A9\u0307", "rad/s"),
  r9("\u8F68\u9053\xB7\u592A\u9633\u540C\u6B65", "\u592A\u9633\u540C\u6B65\u8981\u6C42\u4EA4\u70B9\u8FDB\u52A8 2\u03C0/\u5E74", "\u592A\u9633\u540C\u6B65\u7684\u8FDB\u52A8\u7387", "\u76EE\u6807\u8FDB\u52A8\u7387", "year=3.15576e7:3e7:4e7:s", "2*pi/year", "\u03A9\u0307", "rad/s", "engineering"),
  r9("\u8F68\u9053\xB7\u5730\u7403\u540C\u6B65", "\u540C\u6B65\u534A\u5F84 (G M T\xB2/4\u03C0\xB2)^{1/3}\uFF0CT=1 \u6052\u661F\u65E5", "\u5730\u7403\u540C\u6B65", "\u5706\u8F68\u9053\u3001T=86164 s", "M=5.97e24:5e24:6e24:kg", "(Ggrav*M*86164*86164/(4*pi*pi))^(1/3)", "r", "m", "engineering"),
  r9("\u8F68\u9053\xB7\u62C9\u683C\u6717\u65E5\u70B9", "\u5730\u6708 L1 \u5230\u5C0F\u5929\u4F53\u7684\u8DDD\u79BB\u8FD1\u4F3C R (m/(3M))^{1/3}", "Hill \u534A\u5F84\u8FD1\u4F3C L1", "\u5706\u578B\u9650\u5236\u6027\u4E09\u4F53", "R=3.84e8:1e7:1e9:m,m=7.3e22:1e20:1e24:kg,M=5.97e24:1e23:2e30:kg", "R*(m/(3*M))^(1/3)", "d", "m"),
  r9("\u8F68\u9053\xB7\u518D\u5165", "\u5F39\u9053\u7CFB\u6570\u76F8\u5173\u7684\u5CF0\u503C\u70ED\u6D41\u91CF\u7EA7\u4E0D\u5728\u8FD9\u91CC\u62DF\u5408\uFF1B\u51CF\u901F a=\xBD \u03C1 v\xB2 Cd A/m", "\u518D\u5165\u51CF\u901F", "\u7ED9\u5B9A\u5BC6\u5EA6\u7684\u77AC\u65F6\u503C\uFF0C\u4E0D\u662F\u70ED\u9632\u62A4\u8BBE\u8BA1", "rho=0.01:1e-6:1.2:kg/m3,v=7000:100:11000:m/s,Cd=1:0.2:2:\u2014,A=1:0.01:20:m2,m=100:1:1e4:kg", "0.5*rho*v*v*Cd*A/m", "a", "m/s\xB2"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u5747\u5300\u6D41", "\u66FC\u5B81 v=(1/n) R^{2/3} S^{1/2}", "Manning", "\u5747\u5300\u6D41\u3001SI", "n=0.015:0.008:0.08:\u2014,R=1:0.05:10:m,S=0.001:1e-5:0.05:\u2014", "(1/n)*R^(2/3)*sqrt(S)", "v", "m/s", "engineering"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u975E\u5747\u5300\u6D41", "\u6BD4\u80FD E=y+v\xB2/(2g)", "\u6BD4\u80FD", "\u68F1\u67F1\u6E20\u9053\u5C40\u90E8", "y=1:0.05:10:m,v=1:0:10:m/s", "y+v*v/(2*g)", "E", "m", "engineering"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u6C34\u9762\u7EBF", "Fr \u4E0E 1 \u7684\u5DEE\u51B3\u5B9A\u6C34\u9762\u7EBF\u7C7B\u578B\u7684\u7B26\u53F7 Fr\u22121", "\u7F13\u6D41/\u6025\u6D41", "\u5C40\u90E8 Fr", "Fr=0.6:0:5:\u2014", "Fr-1", "Fr\u22121", "\u2014"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u5830\u6D41", "\u77E9\u5F62\u8584\u58C1\u5830 Q=Cd \u221A(2g) b h^{3/2}", "\u5830\u6D41", "\u81EA\u7531\u51FA\u6D41", "Cd=0.6:0.4:0.8:\u2014,b=2:0.1:20:m,h=0.3:0.01:2:m", "Cd*sqrt(2*g)*b*h^1.5", "Q", "m\xB3/s"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u6025\u6D41", "Fr>1", "\u6025\u6D41\u5B9A\u4E49", "Fr", "v=3:0:15:m/s,y=0.4:0.05:5:m", "v/sqrt(g*y)", "Fr", "\u2014", "engineering"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u7F13\u6D41", "Fr<1", "\u7F13\u6D41\u5B9A\u4E49", "Fr", "v=0.8:0:5:m/s,y=2:0.1:10:m", "v/sqrt(g*y)", "Fr", "\u2014", "engineering"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u4E34\u754C\u6D41", "\u77E9\u5F62\u6E20 yc=(q\xB2/g)^{1/3}", "\u4E34\u754C\u6C34\u6DF1", "\u77E9\u5F62\u3001\u5355\u5BBD\u6D41\u91CF q", "q=1:0.01:20:m2/s", "(q*q/g)^(1/3)", "yc", "m", "engineering"),
  r9("\u660E\u6E20\u6C34\u529B\u5B66\xB7\u5F17\u52B3\u5FB7\u6570", "Fr=v/\u221A(g y)", "\u5F17\u52B3\u5FB7\u6570", "\u77E9\u5F62", "v=1:0:10:m/s,y=1:0.05:8:m", "v/sqrt(g*y)", "Fr", "\u2014", "engineering"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u91CD\u529B\u575D", "\u6297\u6ED1\u5B89\u5168\u7CFB\u6570 (f W)/H \u7684\u7B80\u5316", "\u91CD\u529B\u575D\u6297\u6ED1", "\u53EA\u8BA1\u6469\u64E6\u3001\u4E0D\u8BA1\u626C\u538B\u529B\u7684\u6559\u5B66\u5F0F", "f=0.7:0.3:1:\u2014,W=1e6:1e3:1e8:kN,H=4e5:1:1e7:kN", "f*W/H", "Fs", "\u2014"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u62F1\u575D", "\u5706\u7B52\u62F1\u73AF\u5411\u5E94\u529B p r / wall", "\u8584\u62F1", "\u5355\u4F4D\u9AD8\u5EA6\u3002wall \u662F\u62F1\u539A\uFF0C\u4E0D\u662F\u4EFF\u771F\u65F6\u949F t", "p=1e6:0:5e6:Pa,rad=50:5:300:m,wall=5:0.5:30:m", "p*rad/wall/1e6", "\u03C3", "MPa"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u571F\u77F3\u575D", "\u6E17\u6D41\u6BD4\u964D i=H/L", "\u571F\u575D\u6E17\u6D41", "\u5E73\u5747\u6BD4\u964D", "H=20:0.5:150:m,L=80:5:500:m", "H/L", "i", "\u2014", "engineering"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u6EA2\u6D2A\u9053", "\u5830\u6D41 Q=C b h^{3/2}", "\u6EA2\u6D2A\u9053", "\u6D41\u91CF\u7CFB\u6570\u7ED9\u5B9A", "C=2:0.5:3:\u2014,b=20:1:200:m,h=2:0.1:15:m", "C*b*h^1.5", "Q", "m\xB3/s"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u6CC4\u6D2A\u6D1E", "\u6709\u538B\u5B54\u53E3 Q=Cd A \u221A(2gh)", "\u6CC4\u6D2A\u6D1E", "Cd \u7ED9\u5B9A", "Cd=0.7:0.4:0.95:\u2014,A=10:0.1:80:m2,h=30:0.5:200:m", "Cd*A*sqrt(2*g*h)", "Q", "m\xB3/s", "engineering"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u6D88\u80FD\u6C60", "\u6C34\u8DC3\u5171\u8F6D\u6C34\u6DF1\u6BD4", "\u6C34\u8DC3\u6D88\u80FD", "\u6C34\u5E73\u77E9\u5F62", "Fr=4:1:12:\u2014", "0.5*(-1+sqrt(1+8*Fr*Fr))", "y2/y1", "\u2014", "engineering"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u6E20\u9053", "\u66FC\u5B81\u6D41\u901F", "\u6E20\u9053", "\u6C34\u529B\u534A\u5F84\u7ED9\u5B9A", "n=0.02:0.01:0.05:\u2014,R=1:0.1:5:m,S=0.0005:1e-5:0.01:\u2014", "(1/n)*R^(2/3)*sqrt(S)", "v", "m/s", "engineering"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u6E21\u69FD", "\u69FD\u8EAB\u8377\u8F7D\u6309\u6C34\u91CD \u03C1 g h", "\u6E21\u69FD", "\u5355\u4F4D\u9762\u79EF\u6C34\u538B", "h=2:0.1:8:m", "1000*g*h", "p", "Pa", "engineering"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u5824\u9632", "\u5824\u9876\u8D85\u9AD8\u4F5C\u4E3A\u8F93\u5165", "\u5824\u9632", "\u8D85\u9AD8\u503C", "free=0.5:0:3:m", "free", "\u0394", "m"),
  r9("\u6C34\u5DE5\u7ED3\u6784\xB7\u6CF5\u7AD9", "\u8F74\u529F\u7387 \u03C1 g Q H/\u03B7", "\u6CF5\u7AD9", "\u6E05\u6C34", "Q=0.5:0.001:20:m3/s,H=10:0.5:100:m,eta=0.75:0.4:0.95:\u2014", "1000*g*Q*H/eta", "P", "W", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u5143\u80DE\u81EA\u52A8\u673A", "NaSch \u5E73\u5747\u573A q=\u03C1(1\u2212\u03C1)", "Nagel\u2013Schreckenberg \u7684 vmax=1 \u5E73\u5747\u573A", "\u968F\u673A\u51CF\u901F\u53E6\u8BA1", "rho=0.3:0:1:\u2014", "rho*(1-rho)", "q", "\u2014", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u8DDF\u9A70\u6A21\u578B", "\u671F\u671B\u95F4\u8DDD s=s0+v T", "\u8DDF\u9A70", "\u65F6\u8DDD T", "s0=2:0:10:m,v=15:0:40:m/s,T=1.5:0.2:4:s", "s0+v*T", "s", "m", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u6362\u9053", "\u95F4\u9699\u63A5\u53D7\uFF1A\u524D\u95F4\u9699\u5927\u4E8E\u6700\u5C0F\u95F4\u9699", "\u6362\u9053", "\u5E03\u5C14", "gap=20:0:100:m,gmin=10:1:40:m", "ge(gap,gmin)", "ok", "\u2014"),
  r9("\u4EA4\u901A\u6D41\xB7\u4FE1\u53F7\u914D\u65F6", "\u7EFF\u706F\u65F6\u95F4\u6BD4 g/C", "\u4FE1\u53F7\u914D\u65F6", "\u5468\u671F C", "g=30:1:120:s,C=90:20:200:s", "g/C", "g/C", "\u2014", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u6392\u961F", "M/M/1 \u5E73\u5747\u961F\u957F \u03C1/(1\u2212\u03C1)", "\u6392\u961F\u8BBA", "\u03C1<1", "lam=2:0:20:\u2014,mu=3:0.1:30:\u2014", "(lam/mu)/(1-lam/mu)", "L", "\u2014", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u901A\u884C\u80FD\u529B", "\u9971\u548C\u6D41\u7387 s", "\u901A\u884C\u80FD\u529B", "\u7ED9\u5B9A", "s=1800:200:3000:veh/h", "s", "s", "veh/h", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u4EA4\u901A\u6CE2", "\u6FC0\u6CE2\u901F\u5EA6 (q2\u2212q1)/(\u03C12\u2212\u03C11)", "LWR \u6FC0\u6CE2", "\u4E24\u5747\u5300\u6001", "q1=0.2:0:1:\u2014,q2=0.1:0:1:\u2014,k1=0.2:0:1:\u2014,k2=0.5:0:1:\u2014", "(q2-q1)/(k2-k1)", "w", "\u2014", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u8DEF\u5F84\u9009\u62E9", "Logit \u9009\u62E9\u6982\u7387", "\u8DEF\u5F84\u9009\u62E9", "\u4E24\u6761\u8DEF\u5F84\u7684\u8D39\u7528\u5DEE", "dC=1:-5:5:\u2014,theta=1:0.1:5:\u2014", "1/(1+exp(theta*dC))", "p1", "\u2014"),
  r9("\u4EA4\u901A\u6D41\xB7\u516C\u4EA4\u8C03\u5EA6", "\u8F66\u5934\u65F6\u8DDD H=T/n", "\u516C\u4EA4", "\u5747\u5300\u53D1\u8F66", "T=60:5:240:min,n=6:1:40:\u2014", "T/n", "H", "min", "engineering"),
  r9("\u4EA4\u901A\u6D41\xB7\u884C\u4EBA\u6D41", "\u57FA\u672C\u56FE q=\u03C1 v0 (1\u2212\u03C1/\u03C1jam)", "\u884C\u4EBA\u6D41 Greenshields \u578B", "\u4E09\u89D2\u5F62/\u629B\u7269\u7EBF\u57FA\u672C\u56FE\u7684\u4E00\u79CD", "rho=1:0:5:1/m2,v0=1.3:0.2:2:m/s,rjam=5:1:8:1/m2", "rho*v0*(1-rho/rjam)", "q", "1/ms"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7CSTR", "\u4E00\u7EA7\u8F6C\u5316\u7387 X=k\u03C4/(1+k\u03C4)", "Fogler, CSTR", "\u6052\u5BB9\u3001\u4E00\u7EA7\u3001\u7B49\u6E29", "k=0.2:0:10:1/s,tau=5:0:100:s", "k*tau/(1+k*tau)", "X", "\u2014", "engineering"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u95F4\u6B47\u91DC", "\u4E00\u7EA7 X=1\u2212e^{\u2212kt}", "\u95F4\u6B47\u53CD\u5E94\u5668", "\u6052\u5BB9\u4E00\u7EA7", "k=0.1:0:5:1/s", "1-exp(-k*t)", "X", "\u2014", "engineering"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u534A\u95F4\u6B47", "\u8FDB\u6599\u5E26\u6765\u7684\u7A00\u91CA\uFF0C\u6D53\u5EA6\u6309\u4F53\u79EF\u7EBF\u6027\u589E\u957F\u65F6\u7684\u793A\u610F C0 V0/(V0+v t)", "\u534A\u95F4\u6B47\u7A00\u91CA", "\u65E0\u53CD\u5E94\u7684\u8D28\u91CF\u8861\u7B97", "C0=1:0:10:\u2014,V0=1:0.1:10:m3,v=0.1:0:2:m3/s", "C0*V0/(V0+v*t)", "C", "\u2014"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u56FA\u5B9A\u5E8A", "\u4E00\u7EA7 PFR\uFF1AX=1\u2212e^{\u2212k\u03C4}", "PFR", "\u5E73\u63A8\u6D41\u3001\u4E00\u7EA7", "k=0.2:0:10:1/s,tau=4:0:100:s", "1-exp(-k*tau)", "X", "\u2014", "engineering"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u6D41\u5316\u5E8A", "\u6D41\u5316\u538B\u964D\u7B49\u4E8E\u5E8A\u91CD \u0394P= (1\u2212\u03B5) \u03C1 g H", "\u6D41\u5316\u5E8A\u538B\u964D", "\u5145\u5206\u6D41\u5316", "eps=0.5:0.3:0.9:\u2014,rho=1500:200:4000:kg/m3,H=1:0.05:10:m", "(1-eps)*rho*g*H", "\u0394P", "Pa", "engineering"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u9F13\u6CE1\u5854", "\u6C14\u542B\u7387\u4E0E\u8868\u89C2\u6C14\u901F\u7684\u7EBF\u6027\u793A\u610F \u03B5=vsg/ub", "\u9F13\u6CE1\u5854", "\u5747\u5300\u9F13\u6CE1\u7684\u7B80\u5316", "vsg=0.05:0:0.5:m/s,ub=0.25:0.05:1:m/s", "vsg/ub", "\u03B5", "\u2014"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u6EF4\u6D41\u5E8A", "\u8F6C\u5316\u7387\u4ECD\u7528\u4E00\u7EA7 PFR \u5F62\u5F0F", "\u6EF4\u6D41\u5E8A\u7684\u5E73\u63A8\u8FD1\u4F3C", "\u6DA6\u6E7F\u5B8C\u5168\u3001\u4E00\u7EA7", "k=0.05:0:2:1/s,tau=20:0:200:s", "1-exp(-k*tau)", "X", "\u2014"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u819C\u53CD\u5E94\u5668", "\u9009\u62E9\u6027\u900F\u8FC7\u4F7F\u8F6C\u5316\u8D85\u8FC7\u5E73\u8861\u7684\u793A\u610F\uFF0C\u8FD9\u91CC\u7ED9\u6E17\u900F\u901A\u91CF J=P \u0394p", "\u819C\u6E17\u900F", "\u6EB6\u89E3\u6269\u6563\uFF0C\u4E0D\u662F\u819C\u5236\u5907", "Perm=1e-6:1e-10:0.01:\u2014,dp=1:0:50:\u2014", "Perm*dp", "J", "\u2014"),
  r9("\u5316\u5DE5\u53CD\u5E94\u5668\xB7\u5FAE\u53CD\u5E94\u5668", "\u505C\u7559\u65F6\u95F4 \u03C4=V/v", "\u5FAE\u53CD\u5E94\u5668", "\u4F53\u79EF\u4E0E\u6D41\u91CF", "V=1e-6:1e-9:0.001:m3,vv=1e-7:1e-10:0.0001:m3/s", "V/vv", "\u03C4", "s", "engineering"),
  r9("\u5316\u5DE5\u5206\u79BB\xB7\u7CBE\u998F", "\u5168\u56DE\u6D41\u6700\u5C0F\u7406\u8BBA\u677F Fenske\uFF1ANmin=ln((xd/(1\u2212xd))/((1\u2212xb)/xb))/ln \u03B1 \u7684\u7B80\u5316\uFF0C\u03B1 \u4E0E\u7EC4\u6210\u7ED9\u5B9A\u65F6\u7528 Underwood \u4E0D\u5C55\u5F00\uFF1B\u8FD9\u91CC\u76F8\u5BF9\u6325\u53D1\u5EA6\u4E0B\u7684\u5206\u79BB\u56E0\u5B50", "Fenske \u65B9\u7A0B", "\u6052\u76F8\u5BF9\u6325\u53D1\u5EA6\u3001\u5168\u56DE\u6D41", "xd=0.95:0.5:0.999:\u2014,xb=0.05:0.001:0.5:\u2014,alpha=2:1.05:10:\u2014", "ln((xd/(1-xd))*((1-xb)/xb))/ln(alpha)", "Nmin", "\u2014", "engineering"),
  r9("\u5316\u5DE5\u5206\u79BB\xB7\u5438\u9644", "\u7EBF\u6027\u7B49\u6E29\u7EBF q=K c", "\u4EA8\u5229\u5438\u9644", "\u4F4E\u8986\u76D6", "K=2:0:100:\u2014,c=0.2:0:5:\u2014", "K*c", "q", "\u2014", "engineering"),
  r9("\u5316\u5DE5\u5206\u79BB\xB7\u819C\u5206\u79BB", "\u622A\u7559\u7387 R=1\u2212cp/cf", "\u819C\u5206\u79BB", "\u6D53\u5EA6\u5DF2\u6D4B", "cf=1:0.01:10:\u2014,cp=0.1:0:10:\u2014", "1-cp/cf", "R", "\u2014", "engineering"),
  r9("\u5316\u5DE5\u5206\u79BB\xB7\u79BB\u5FC3", "\u6C89\u964D\u901F\u5EA6 (\u0394\u03C1) d\xB2 \u03C9\xB2 r /(18 \u03BC)", "\u79BB\u5FC3\u6C89\u964D", "\u65AF\u6258\u514B\u65AF", "drho=200:0:2000:kg/m3,d=1e-5:1e-7:0.001:m,w=100:0:2000:rad/s,rad=0.1:0.01:0.5:m,mu=0.001:1e-4:0.1:Pa\xB7s", "drho*d*d*w*w*rad/(18*mu)", "v", "m/s"),
  r9("\u5316\u5DE5\u5206\u79BB\xB7\u8FC7\u6EE4", "Darcy \u8FC7\u6EE4 dV/dt=\u0394P A/(\u03BC (\u03B1 c V/A+Rm)) \u7684\u521D\u59CB\u901F\u7387 \u0394P A/(\u03BC Rm)", "\u8FC7\u6EE4", "\u521D\u671F\u6EE4\u997C\u53EF\u5FFD\u7565", "dP=1e5:0:1e6:Pa,A=1:0.01:20:m2,mu=0.001:1e-4:0.1:Pa\xB7s,Rm=1e10:1e8:1e13:1/m", "dP*A/(mu*Rm)", "Q", "m\xB3/s"),
  r9("\u5316\u5DE5\u5206\u79BB\xB7\u84B8\u53D1", "\u84B8\u53D1\u901F\u7387 Q/(\u03BB)", "\u84B8\u53D1", "\u6F5C\u70ED \u03BB", "Q=1e5:0:1e7:W,lam=2.3e6:1e6:3e6:J/kg", "Q/lam", "\u1E41", "kg/s", "engineering"),
  r9("\u5DE5\u4E1A\u5DE5\u7A0B\xB7\u770B\u677F", "\u770B\u677F\u6570\u91CF\u7684\u4E00\u79CD\u4F30\u8BA1 D L (1+\u03B1)/C", "\u770B\u677F\u5F20\u6570", "\u9700\u6C42\u3001\u63D0\u524D\u671F\u3001\u5BB9\u5668\u5BB9\u91CF", "D=100:1:10000:\u2014,L=2:0.1:30:\u2014,alpha=0.1:0:1:\u2014,C=20:1:500:\u2014", "D*L*(1+alpha)/C", "n", "\u2014"),
  r9("\u5DE5\u4E1A\u5DE5\u7A0B\xB7JIT", "\u8282\u62CD\u65F6\u95F4 \u53EF\u7528\u65F6\u95F4/\u9700\u6C42", "\u8282\u62CD", "\u5747\u5300\u9700\u6C42", "avail=480:1:2000:min,dem=240:1:5000:\u2014", "avail/dem", "takt", "min", "engineering"),
  r9("\u5DE5\u4E1A\u5DE5\u7A0B\xB7\u6D41\u6C34\u8F66\u95F4", "\u4E24\u673A\u6D41\u6C34\u7684 Johnson \u4E0D\u5728\u6B64\u641C\u7D22\uFF1B\u5B8C\u5DE5\u65F6\u95F4\u4E0B\u754C max(\u03A3p1, \u03A3p2)", "\u6D41\u6C34\u8F66\u95F4", "\u4E0B\u754C", "p1=30:0:500:\u2014,p2=40:0:500:\u2014", "max(p1,p2)", "LB", "\u2014"),
  r9("\u5DE5\u4E1A\u5DE5\u7A0B\xB7\u4F5C\u4E1A\u8F66\u95F4", "\u5173\u952E\u8DEF\u5F84\u957F\u5EA6", "\u4F5C\u4E1A\u8F66\u95F4", "\u8DEF\u5F84\u5DF2\u7ED9\u5B9A", "cp=50:0:1000:\u2014", "cp", "Cmax", "\u2014"),
  r9("\u5DE5\u4E1A\u5DE5\u7A0B\xB7\u8D28\u91CFSPC", "\u8FC7\u7A0B\u80FD\u529B Cp=(USL\u2212LSL)/(6\u03C3)", "\u8FC7\u7A0B\u80FD\u529B", "\u7A33\u5B9A\u3001\u6B63\u6001", "USL=10:0:100:\u2014,LSL=0:-50:50:\u2014,sig=0.5:0.01:10:\u2014", "(USL-LSL)/(6*sig)", "Cp", "\u2014", "engineering"),
  r9("\u5DE5\u4E1A\u5DE5\u7A0B\xB7\u4EBA\u56E0", "\u7167\u5EA6\u4E0E\u8DDD\u79BB\u7684\u5E73\u65B9\u53CD\u6BD4 E\u221D1/r\xB2", "\u70B9\u5149\u6E90\u7167\u5EA6", "\u4E00\u4E2A\u4EBA\u56E0\u7167\u660E\u7684\u51E0\u4F55\u5173\u7CFB", "E1=500:1:5000:lx,r=2:0.2:10:m", "E1/(r*r)", "E", "lx"),
  r9("\u6838\u5DE5\u7A0B\xB7\u53CD\u5E94\u5806\u4E34\u754C", "\u53CD\u5E94\u6027 \u03C1=(k\u22121)/k", "\u70B9\u5806\u53CD\u5E94\u6027\u7684\u5B9A\u4E49", "\u516C\u5F00\u5B9A\u4E49\uFF0C\u4E0D\u662F\u5806\u82AF\u8BBE\u8BA1", "k=1:0.5:1.5:\u2014", "(k-1)/k", "\u03C1", "\u2014"),
  r9("\u6838\u5DE5\u7A0B\xB7\u63A7\u5236\u68D2", "\u63A7\u5236\u68D2\u4EF7\u503C\u7528\u63D2\u5165\u7684\u53CD\u5E94\u6027\u8868\u793A", "\u53CD\u5E94\u6027\u4EF7\u503C\u7684\u5B9A\u4E49", "\u4EF7\u503C\u7531\u8F93\u5165\u7ED9\u51FA\uFF0C\u4E0D\u662F\u68D2\u8BBE\u8BA1", "rho=-0.01:-0.2:0:\u2014", "rho", "\u0394\u03C1", "\u2014"),
  r9("\u6838\u5DE5\u7A0B\xB7\u71C3\u8017", "\u71C3\u8017=\u91CA\u653E\u80FD\u91CF/\u91CD\u91D1\u5C5E\u8D28\u91CF", "\u71C3\u8017\u5B9A\u4E49", "\u5B9A\u4E49\u5F0F\uFF0C\u4E0D\u662F\u71C3\u6599\u7BA1\u7406", "E=3.6e6:0:1e8:J,m=1:0.01:100:kg", "E/m/8.64e7", "BU", "MWd/kg"),
  r9("\u6838\u5DE5\u7A0B\xB7\u70ED\u5DE5\u6C34\u529B", "\u5BF9\u6D41 q=h \u0394T", "\u725B\u987F\u51B7\u5374", "\u6362\u70ED\u7CFB\u6570\u7ED9\u5B9A\uFF0C\u4E0D\u662F\u4E34\u754C\u70ED\u6D41\u5BC6\u5EA6\u8BBE\u8BA1", "h=5000:10:1e5:W/m2K,dT=10:0:200:K", "h*dT", "q", "W/m\xB2", "engineering"),
  r9("\u6838\u5DE5\u7A0B\xB7\u5B89\u5168\u58F3", "\u6CC4\u6F0F\u7387\u5B9A\u4E49", "\u5B89\u5168\u58F3", "\u6CC4\u6F0F\u5206\u6570\u7531\u8F93\u5165\u7ED9\u51FA", "L=0.1:0:5:%/day", "L", "L", "%/day"),
  r9("\u6838\u5DE5\u7A0B\xB7\u6838\u5E9F\u6599", "\u653E\u5C04\u6027\u6D3B\u5EA6 A=A0 e^{\u2212\u03BB t}", "\u6307\u6570\u8870\u53D8", "\u5355\u4E00\u6838\u7D20", "A0=1:0:1e6:\u2014,lam=0.01:0.0001:2:1/y", "A0*exp(-lam*t)", "A", "\u2014", "engineering"),
  r9("\u6838\u5DE5\u7A0B\xB7\u6838\u805A\u53D8", "\u52B3\u900A\u4E09\u4E58\u79EF n \u03C4 T", "Lawson \u5224\u636E\u7684\u4E09\u4E58\u79EF", "\u516C\u5F00\u5224\u636E\u7684\u4E58\u79EF\uFF0C\u4E0D\u662F\u88C5\u7F6E\u8BBE\u8BA1", "n=1e20:1e16:1e22:1/m3,tau=1:0.001:100:s,T=10:1:50:keV", "n*tau*T", "n\u03C4T", "keV\xB7s/m\xB3"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7ECG", "\u5FC3\u7387 60/RR", "\u5FC3\u7535\u5468\u671F", "\u4E0D\u662F\u8BCA\u65AD", "RR=0.8:0.3:2:s", "60/RR", "HR", "1/min", "engineering"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7\u8D77\u640F\u5668", "\u8D77\u640F\u9891\u7387", "\u8D77\u640F\u5668\u8BBE\u5B9A\u9891\u7387", "\u8BBE\u5B9A\u503C\uFF0C\u4E0D\u662F\u4E34\u5E8A\u7F16\u7A0B\u6B65\u9AA4", "f=60:30:180:1/min", "f", "f", "1/min"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7\u6B65\u6001", "\u6B65\u901F=\u6B65\u957F\xD7\u6B65\u9891", "\u6B65\u6001", "\u5E73\u5747", "step=0.7:0.2:1.2:m,cad=110:40:200:1/min", "step*cad/60", "v", "m/s", "engineering"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7\u5047\u80A2", "\u5173\u8282\u529B\u77E9 \u03C4=m g l sin\u03B8 \u7684\u9759\u529B\u77E9", "\u5047\u80A2\u9759\u529B\u5B66", "\u51C6\u9759\u6001", "m=2:0.1:10:kg,l=0.3:0.05:0.6:m,theta=0.5:0:1.5:rad", "m*g*l*sin(theta)", "\u03C4", "N\xB7m"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7\u533B\u5B66\u6210\u50CF", "CT \u6570 (\u03BC\u2212\u03BCw)/\u03BCw \xD71000", "Hounsfield \u5B9A\u4E49", "\u7EBF\u6027\u8870\u51CF\u7CFB\u6570", "mu=0.2:0:1:1/cm,muw=0.19:0.05:0.3:1/cm", "(mu-muw)/muw*1000", "HU", "HU", "engineering"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7\u751F\u7269\u6750\u6599", "\u6DF7\u5408\u5F8B\u6A21\u91CF", "\u590D\u5408\u6750\u6599", "\u7B49\u5E94\u53D8", "Ef=20:0.1:200:GPa,Em=0.01:0.001:5:GPa,Vf=0.3:0:1:\u2014", "Ef*Vf+Em*(1-Vf)", "E", "GPa"),
  r9("\u751F\u7269\u533B\u5B66\u5DE5\u7A0B\xB7\u7EC4\u7EC7\u5DE5\u7A0B", "\u6269\u6563\u8425\u517B\u7684\u957F\u5EA6 \u221A(D t)", "\u6269\u6563\u957F\u5EA6", "\u4E0D\u662F\u57F9\u517B\u65B9\u6848", "D=1e-9:1e-12:1e-7:m2/s,tt=3600:1:1e5:s", "sqrt(D*tt)", "x", "m"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u66DD\u6C14", "\u6C27\u4F20\u8D28 dC/dt=Kla(Cs\u2212C) \u7684\u7F3A\u53E3", "\u66DD\u6C14", "Kla \u7ED9\u5B9A", "Kla=0.1:0:2:1/s,Cs=9:0:14:mg/L,C=4:0:14:mg/L", "Kla*(Cs-C)", "rate", "mg/L/s", "engineering"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u7ED9\u6C34\u7BA1\u7F51", "\u6D77\u66FE-\u5A01\u5EC9\u6216\u8FBE\u897F\u7684\u6C34\u5934\u635F\u5931\uFF0C\u8FD9\u91CC\u7528\u8FBE\u897F", "\u7BA1\u7F51", "\u5355\u7BA1", "f=0.02:0.005:0.05:\u2014,L=100:1:5000:m,D=0.2:0.02:2:m,v=1:0:5:m/s", "f*(L/D)*v*v/(2*g)", "hf", "m", "engineering"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u6C61\u6C34\u5904\u7406", "\u4E00\u7EA7\u53BB\u9664 X=1\u2212e^{\u2212kt}", "\u5B8C\u5168\u6DF7\u5408\u7684\u4E00\u7EA7\u8FD1\u4F3C\u4E0D\u7528\uFF1B\u63A8\u6D41\u4E00\u7EA7", "\u4E00\u7EA7\u8870\u51CF\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 5 h", "k=0.2:0:5:1/h,t0=5:0:200:h", "1-exp(-k*t)", "X", "\u2014"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u56FA\u5E9F\u586B\u57CB", "\u4EA7\u6C14\u4E00\u9636 Q\u221De^{\u2212kt}", "\u586B\u57CB\u6C14\u4E00\u9636", "\u4E0D\u662F\u586B\u57CB\u8BBE\u8BA1", "k=0.05:0.001:0.5:1/y", "exp(-k*t)", "q/q0", "\u2014"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u571F\u58E4\u4FEE\u590D", "\u4E00\u9636\u8870\u51CF C=C0 e^{\u2212kt}", "\u4E00\u9636\u8870\u51CF", "\u4E0D\u662F\u836F\u5242\u914D\u65B9", "C0=10:0:1000:\u2014,k=0.1:0:2:1/d", "C0*exp(-k*t)", "C", "\u2014", "engineering"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u566A\u58F0", "\u58F0\u538B\u7EA7 20 log10(p/20\u03BCPa)", "\u58F0\u538B\u7EA7", "\u7A7A\u6C14", "p=0.02:1e-5:20:Pa", "20*log10(p/2e-5)", "L", "dB", "engineering"),
  r9("\u73AF\u5883\u5DE5\u7A0B\xB7\u73AF\u5883\u5BB9\u91CF", "\u96F6\u9636\u540C\u5316\u4E0B\u5141\u8BB8\u6392\u653E Q=k V (Cstd\u2212C)", "\u5B8C\u5168\u6DF7\u5408\u5BB9\u91CF\u7684\u7A33\u6001", "\u4E00\u7EA7\u540C\u5316 k\u3001\u4F53\u79EF V", "k=0.1:0:2:1/d,V=1e6:1:1e9:m3,Cs=1:0:10:\u2014,C=0.2:0:10:\u2014", "k*V*max(0,Cs-C)", "Q", "\u2014"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u76F4\u6D41\u7535\u673A", "Ea=K\u03C6 \u03C9", "\u76F4\u6D41\u7535\u673A", "K\u03C6 \u5408\u5E76", "K=0.3:0.001:2:\u2014,w=80:0:400:rad/s", "K*w", "Ea", "V", "engineering"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u540C\u6B65\u7535\u673A", "n=120 f/p", "\u540C\u6B65\u8F6C\u901F", "\u6781\u6570 p", "f=50:10:400:Hz,p=2:2:24:\u2014", "120*f/p", "n", "r/min", "engineering"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u53D1\u7535\u673A", "\u540C\u4E00\u53CD\u7535\u52BF\u5173\u7CFB", "\u540C\u6B65\u53D1\u7535\u673A\u7A7A\u8F7D\u7535\u52BF\u6B63\u6BD4\u8F6C\u901F", "K \u7ED9\u5B9A", "K=2:0.01:20:V\xB7s,w=314:0:400:rad/s", "K*w", "E", "V", "engineering"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u7535\u52A8\u673A\u542F\u52A8", "\u76F4\u63A5\u8D77\u52A8\u7535\u6D41\u500D\u6570\u7EA6\u7B49\u4E8E\u5835\u8F6C", "\u8D77\u52A8\u7535\u6D41", "\u500D\u6570\u7ED9\u5B9A", "In=10:0.1:500:A,kst=6:1:10:\u2014", "kst*In", "Ist", "A"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u8C03\u901F", "\u76F4\u6D41\u8C03\u538B n\u221DV", "\u8C03\u538B\u8C03\u901F", "\u78C1\u901A\u6052\u5B9A\u3001\u7A7A\u8F7D", "V=200:0:500:V,k=5:0.1:50:r/min/V", "k*V", "n", "r/min", "engineering"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u5236\u52A8", "\u5236\u52A8\u80FD\u91CF \xBD J \u03C9\xB2", "\u52A8\u80FD", "\u4E00\u6B21\u5236\u52A8", "J=0.2:0.001:50:kg\xB7m2,w=100:0:400:rad/s", "0.5*J*w*w", "E", "J", "engineering"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u78C1\u573A\u5B9A\u5411", "\u8F6C\u77E9 T= (3/2)(p/2) \u03BB iq \u7684\u6BD4\u4F8B", "\u8F6C\u5B50\u78C1\u573A\u5B9A\u5411\u7684\u8F6C\u77E9\u5F0F", "\u03BB\u3001iq \u7ED9\u5B9A\uFF0C\u4E0D\u662F\u77E2\u91CF\u63A7\u5236\u5B9E\u73B0\u6B65\u9AA4", "p=4:2:12:\u2014,lam=0.5:0:2:Wb,iq=5:-50:50:A", "1.5*(p/2)*lam*iq", "T", "N\xB7m"),
  r9("\u7535\u6C14\u7535\u673A\xB7\u635F\u8017", "\u94DC\u8017 I\xB2 R", "\u94DC\u8017", "\u4E00\u76F8\u7B49\u6548", "I=10:0:200:A,R=0.5:0.001:50:ohm", "I*I*R", "P", "W", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u6F6E\u6D41", "\u76F4\u6D41\u6F6E\u6D41 P=(\u03B8i\u2212\u03B8j)/x", "\u76F4\u6D41\u6F6E\u6D41", "\u4E00\u6761\u7EBF\u8DEF\u3001\u7535\u538B 1 pu", "thi=0.1:-1:1:rad,thj=0:-1:1:rad,x=0.2:0.01:2:pu", "(thi-thj)/x", "P", "pu", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u77ED\u8DEF", "\u4E09\u76F8\u77ED\u8DEF\u7535\u6D41 V/Z", "\u5BF9\u79F0\u77ED\u8DEF", "\u7535\u538B\u6E90\u540E\u963B\u6297", "V=1:0.5:1.2:pu,Z=0.2:0.01:2:pu", "V/Z", "I", "pu", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u7A33\u5B9A", "\u7B49\u9762\u79EF\u4E0D\u5728\u6B64\u79EF\u5206\uFF1B\u529F\u89D2\u66F2\u7EBF P=Pmax sin\u03B4", "\u529F\u89D2\u7279\u6027", "\u7ECF\u5178\u6A21\u578B", "Pmax=1:0:3:pu,delta=0.6:0:3.14:rad", "Pmax*sin(delta)", "P", "pu", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u7EE7\u7535\u4FDD\u62A4", "\u8FC7\u6D41\u6574\u5B9A\u500D\u6570", "\u8FC7\u6D41\u4FDD\u62A4", "\u6574\u5B9A\u503C\u76F8\u5BF9\u989D\u5B9A", "Iset=1.2:0.5:10:\u2014,In=1:0.1:5:\u2014", "Iset/In", "k", "\u2014"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u65E0\u529F\u8865\u507F", "Q=V\xB2/X \u7684\u7535\u5BB9\u5668\u65E0\u529F", "\u5E76\u8054\u7535\u5BB9", "\u989D\u5B9A\u7535\u538B", "V=1:0.5:1.2:pu,X=5:0.1:50:pu", "V*V/X", "Q", "pu", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u7ECF\u6D4E\u8C03\u5EA6", "\u7B49\u5FAE\u589E\u7387 \u03BB=b+2 c P \u7684\u4E8C\u6B21\u8D39\u7528\u5BFC\u6570", "\u7ECF\u6D4E\u8C03\u5EA6", "\u4E00\u53F0\u673A\u7EC4\u7684\u5FAE\u589E\u6210\u672C", "b=10:0:100:\u2014,c=0.01:0:1:\u2014,P=50:0:500:\u2014", "b+2*c*P", "\u03BB", "\u2014", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u5FAE\u7535\u7F51", "\u529F\u7387\u5E73\u8861 Pgen\u2212Pload", "\u529F\u7387\u5E73\u8861", "\u5355\u4E00\u6BCD\u7EBF", "Pg=100:0:1000:kW,Pl=80:0:1000:kW", "Pg-Pl", "\u0394P", "kW", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u914D\u7535\u7F51", "\u7535\u538B\u964D\u8FD1\u4F3C \u0394V=PR+QX", "\u8F90\u5C04\u7F51\u7535\u538B\u964D", "\u4E00\u6761\u652F\u8DEF", "P=0.2:0:2:pu,R=0.05:0:1:pu,Q=0.1:-1:1:pu,X=0.1:0:1:pu", "P*R+Q*X", "\u0394V", "pu", "engineering"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u6545\u969C\u5B9A\u4F4D", "\u963B\u6297\u6CD5\u8DDD\u79BB x=V/I \u7684\u7535\u6297\u90E8\u5206\uFF0C\u8FD9\u91CC\u7528 |V|/|I|", "\u6545\u969C\u6D4B\u8DDD\u7684\u963B\u6297", "\u91D1\u5C5E\u6027\u6545\u969C\u7684\u7B80\u5316", "V=0.5:0:1.2:\u2014,I=2:0.1:20:\u2014", "V/I", "Z", "\u2014"),
  r9("\u7535\u529B\u7CFB\u7EDF\xB7\u65B0\u80FD\u6E90\u5E76\u7F51", "\u9006\u53D8\u5668\u7535\u6D41\u9650\u5E45", "\u5E76\u7F51\u9006\u53D8\u5668", "\u7535\u6D41\u6307\u4EE4\u4E0E\u9650\u503C", "Icmd=1.2:0:2:\u2014,Imax=1:0.1:2:\u2014", "min(Icmd,Imax)", "I", "pu", "engineering"),
  r9("\u80FD\u6E90\xB7\u98CE\u7535", "\u53EF\u7528\u98CE\u529F\u7387 \xBD \u03C1 A v\xB3", "\u98CE\u529F\u7387", "\u6765\u6D41\uFF0C\u672A\u4E58 Cp", "rho=1.2:0.8:1.4:kg/m3,A=1000:1:20000:m2,v=8:0:25:m/s", "0.5*rho*A*v*v*v", "P", "W", "engineering"),
  r9("\u80FD\u6E90\xB7\u50A8\u80FD", "\u7535\u6C60\u80FD\u91CF E=\u222BV I dt \u7684\u6052\u6D41\u8FD1\u4F3C V I t", "\u50A8\u80FD", "\u6052\u529F\u7387\u653E\u7535\u7684\u80FD\u91CF", "V=400:10:1000:V,I=50:0:500:A,tt=1:0:10:h", "V*I*tt/1000", "E", "kWh", "engineering"),
  r9("\u80FD\u6E90\xB7\u71C3\u6C14\u8F6E\u673A", "\u7406\u60F3\u5E03\u96F7\u987F\u6548\u7387", "\u5E03\u96F7\u987F\u5FAA\u73AF", "\u51B7\u7A7A\u6C14\u6807\u51C6", "rp=12:1:40:\u2014,gamma=1.4:1.2:1.5:\u2014", "1-rp^((1-gamma)/gamma)", "\u03B7", "\u2014", "engineering"),
  r9("\u80FD\u6E90\xB7\u84B8\u6C7D\u5FAA\u73AF", "\u6717\u80AF\u6548\u7387 1\u2212Qc/Qh \u7684\u5B9A\u4E49", "\u6717\u80AF\u5FAA\u73AF", "\u5438\u70ED\u653E\u70ED\u5DF2\u7ED9\u5B9A", "Qh=1000:1:5000:kJ/kg,Qc=600:1:4000:kJ/kg", "1-Qc/Qh", "\u03B7", "\u2014", "engineering"),
  r9("\u80FD\u6E90\xB7\u751F\u7269\u8D28", "\u70ED\u503C\u91CA\u653E m HHV", "\u70ED\u503C", "\u5B8C\u5168\u71C3\u70E7\u7684\u70ED\u503C\u5B9A\u4E49\uFF0C\u4E0D\u662F\u71C3\u70E7\u7EC4\u7EC7", "m=1:0:100:kg,HHV=18:5:30:MJ/kg", "m*HHV", "Q", "MJ", "engineering"),
  r9("\u80FD\u6E90\xB7\u5730\u70ED", "\u5BFC\u70ED q=\u03BA \u0394T/L", "\u5730\u70ED\u4F20\u5BFC", "\u7A33\u6001", "kappa=2:0.2:6:W/mK,dT=20:0:200:K,L=100:1:5000:m", "kappa*dT/L", "q", "W/m\xB2", "engineering"),
  r9("\u80FD\u6E90\xB7\u6F6E\u6C50", "\u6F6E\u5DEE\u52BF\u80FD \u03C1 g A (\u0394h)\xB2/2 \u7684\u6BD4\u4F8B", "\u6F6E\u6C50\u80FD", "\u5355\u5E93\u3001\u9762\u79EF\u7ED9\u5B9A", "A=1e6:1e3:1e9:m2,dh=3:0:12:m", "1000*g*A*dh*dh/2", "E", "J"),
  r9("\u80FD\u6E90\xB7\u6C22\u80FD", "\u7535\u89E3\u6C34\u7406\u8BBA\u7535\u538B 1.23 V \u7684\u80FD\u91CF\u5F53\u91CF", "\u6C34\u5206\u89E3\u7684\u53EF\u9006\u7535\u538B", "\u6807\u51C6\u72B6\u6001\u7684\u5B9A\u4E49\u7535\u538B\uFF0C\u4E0D\u662F\u7535\u89E3\u69FD\u8BBE\u8BA1", "V=1.23:1:2:V", "V", "E", "V", "engineering"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u7206\u7834", "\u632F\u52A8\u6CE2\u8D70\u65F6 t=r/v", "\u5F39\u6027\u6CE2\u8D70\u65F6", "\u5E38\u901F\u5EA6\uFF0C\u4E0D\u662F\u88C5\u836F\u8BBE\u8BA1", "rad=50:1:2000:m,v=3000:200:6000:m/s", "rad/v", "t", "s", "engineering"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u901A\u98CE", "\u6240\u9700\u98CE\u91CF Q=q/c \u7A00\u91CA", "\u901A\u98CE\u7A00\u91CA", "\u7A33\u6001\u5B8C\u5168\u6DF7\u5408", "q=0.01:0:5:m3/s,c=0.005:0.0001:0.05:\u2014", "q/c", "Q", "m\xB3/s"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u63D0\u5347", "\u94A2\u4E1D\u7EF3\u9759\u5F20\u529B\u542B\u7F50\u7B3C\u91CD (m+mpay) g", "\u63D0\u5347", "\u9759\u529B", "m=2000:10:2e4:kg,mp=5000:0:3e4:kg", "(m+mp)*g", "T", "N", "engineering"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u9009\u77FF", "\u56DE\u6536\u7387 C c /(F f)", "\u4E8C\u4EA7\u54C1\u56DE\u6536\u7387", "\u8D28\u91CF\u4E0E\u54C1\u4F4D", "C=10:0:100:\u2014,cc=0.4:0:1:\u2014,F=100:1:1000:\u2014,f=0.05:0.001:1:\u2014", "C*cc/(F*f)", "\u03B5", "\u2014", "engineering"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u6D6E\u9009", "\u4E00\u9636\u6D6E\u9009\u56DE\u6536 R=1\u2212e^{\u2212kt}", "\u7ECF\u5178\u4E00\u9636\u6D6E\u9009", "\u901F\u7387\u5E38\u6570\u7ED9\u5B9A\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 2 min", "k=0.5:0:5:1/min,t0=2:0:60:min", "1-exp(-k*t)", "R", "\u2014"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u70E7\u7ED3", "\u70E7\u7ED3\u65F6\u95F4\u7684\u6269\u6563\u5C3A\u5EA6 \u221A(Dt)", "\u70E7\u7ED3", "\u4E0D\u662F\u914D\u6599", "D=1e-8:1e-12:1e-4:m2/s,tt=60:1:5000:s", "sqrt(D*tt)", "x", "m"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u9AD8\u7089", "\u95F4\u63A5\u8FD8\u539F\u7684\u6C14\u4F53\u5229\u7528\u7387 CO2/(CO+CO2)", "\u7164\u6C14\u5229\u7528\u7387\u5B9A\u4E49", "\u6210\u5206\u5DF2\u5206\u6790", "co2=0.2:0:0.5:\u2014,co=0.2:0.01:0.5:\u2014", "co2/(co+co2)", "\u03B7", "\u2014"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u8F6C\u7089", "\u4F9B\u6C27\u5F3A\u5EA6", "\u8F6C\u7089", "\u5F3A\u5EA6\u7531\u8F93\u5165\u7ED9\u51FA\uFF0C\u4E0D\u662F\u5439\u70BC\u5236\u5EA6", "q=3:0:6:m3/min/t", "q", "q", "\u2014"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u8FDE\u94F8", "\u51DD\u56FA\u58F3\u539A\u5EA6\u7684\u629B\u7269\u7EBF k \u221At", "\u8FDE\u94F8\u576F\u58F3", "\u629B\u7269\u7EBF\u5E38\u6570\u7ED9\u5B9A", "k=0.002:0.0001:0.01:m/s0.5,tt=30:0:200:s", "k*sqrt(tt)", "s", "m"),
  r9("\u77FF\u4E1A\u51B6\u91D1\xB7\u8F67\u5236", "\u538B\u4E0B\u7387 (h0\u2212h1)/h0", "\u8F67\u5236", "\u4E00\u9053\u6B21", "h0=20:0.1:200:mm,h1=15:0.1:200:mm", "(h0-h1)/h0", "r", "\u2014", "engineering"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u7EBA\u7EB1", "\u7275\u4F38\u6BD4 E=v2/v1", "\u7275\u4F38", "\u8868\u9762\u901F\u5EA6", "v2=20:0.1:200:m/min,v1=2:0.1:50:m/min", "v2/v1", "E", "\u2014", "engineering"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u7EC7\u9020", "\u7EAC\u5BC6", "\u7EC7\u9020", "\u6BCF\u5398\u7C73\u7EAC\u7EB1\u6839\u6570", "picks=20:1:80:1/cm", "picks", "p", "1/cm"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u9488\u7EC7", "\u7EBF\u5708\u957F\u5EA6", "\u9488\u7EC7", "\u8F93\u5165\u7EBF\u5708\u957F\u5EA6", "l=3:0.5:10:mm", "l", "l", "mm"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u67D3\u6574", "\u4E0A\u67D3\u7387 1\u2212e^{\u2212kt} \u7684\u4E00\u9636", "\u4E0A\u67D3", "\u4E00\u9636\uFF0C\u4E0D\u662F\u67D3\u6D74\u914D\u65B9\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 10 min", "k=0.1:0:2:1/min,t0=10:0:240:min", "1-exp(-k*t)", "R", "\u2014"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u670D\u88C5CAD", "\u653E\u7801\u6863\u5DEE", "\u653E\u7801", "\u4E00\u6863", "delta=4:0:20:mm", "delta", "\u0394", "mm"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u6740\u83CC", "F \u503C \u222B10^{(T\u2212Tref)/z} dt \u7684\u6052\u6E29\u5F0F", "\u70ED\u6740\u83CC F \u503C", "\u6052\u6E29\u3001\u4E0D\u662F\u6740\u83CC\u5DE5\u827A\u8BBE\u8BA1\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 1 min", "T=121:60:140:C,Tref=121:100:130:C,z=10:5:20:C,t0=1:0:60:min", "10^((T-Tref)/z)*t", "F", "min"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u51B7\u85CF", "\u51B7\u5374\u725B\u987F\u5B9A\u5F8B T\u2212Ta=(T0\u2212Ta)e^{\u2212kt}", "\u51B7\u5374", "\u96C6\u603B", "T0=25:-20:80:C,Ta=4:-30:20:C,k=0.1:0.001:2:1/h", "Ta+(T0-Ta)*exp(-k*t)", "T", "\xB0C", "engineering"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u53D1\u9175", "Monod \u03BC=\u03BCmax S/(Ks+S)", "Monod", "\u6BD4\u751F\u957F\u901F\u7387\uFF0C\u4E0D\u662F\u53D1\u9175\u914D\u65B9", "um=0.4:0:2:1/h,S=2:0:50:\u2014,Ks=0.5:0.01:10:\u2014", "um*S/(Ks+S)", "\u03BC", "1/h", "engineering"),
  r9("\u7EBA\u7EC7\u98DF\u54C1\xB7\u6324\u538B", "\u8D28\u91CF\u6D41\u91CF \u03C1 A v", "\u6324\u538B", "\u5145\u6EE1", "rho=1000:200:1500:kg/m3,A=1e-4:1e-6:0.01:m2,v=0.1:0:2:m/s", "rho*A*v", "\u1E41", "kg/s", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u704C\u6E89", "\u704C\u6C34\u5B9A\u989D\u4E0B\u7684\u6D41\u91CF Q=A d / t", "\u704C\u6E89", "\u5747\u5300", "A=1000:1:1e6:m2,d=0.05:0:0.3:m,duration=3600:60:1e5:s", "A*d/duration", "Q", "m\xB3/s", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u6E29\u5BA4", "\u7A33\u6001\u70ED\u635F\u5931 U A \u0394T", "\u6E29\u5BA4\u70ED\u635F\u5931", "\u4F20\u70ED\u7CFB\u6570\u7ED9\u5B9A", "U=4:0.2:10:W/m2K,A=200:1:5000:m2,dT=10:0:40:K", "U*A*dT", "Q", "W", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u62D6\u62C9\u673A", "\u7275\u5F15\u529B F=P/v", "\u7275\u5F15", "\u529F\u7387\u4E0E\u901F\u5EA6", "P=2e4:0:2e5:W,v=2:0.1:10:m/s", "P/v", "F", "N", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u87BA\u65CB\u6868", "\u7406\u60F3\u52A8\u91CF\u7406\u8BBA\u6548\u7387 2/(1+\u221A(1+Ct)) \u7684\u7B80\u5316\uFF0C\u8FD9\u91CC\u7528\u8FDB\u901F\u6BD4 J=v/(n D)", "\u87BA\u65CB\u6868\u8FDB\u901F\u6BD4", "\u5B9A\u4E49", "v=5:0:20:m/s,n=10:0.1:50:1/s,D=1:0.1:6:m", "v/(n*D)", "J", "\u2014", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u7A33\u6027", "\u521D\u7A33\u6027\u9AD8\u5EA6 GM", "\u8239\u8236\u521D\u7A33\u6027", "GM \u7531\u8F93\u5165\uFF0C\u5C0F\u89D2", "GM=0.5:-1:3:m,phi=0.1:0:0.4:rad,Delta=1e6:1e3:1e8:N", "Delta*GM*phi", "M", "N\xB7m"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u5236\u52A8", "\u5236\u52A8\u8DDD\u79BB v\xB2/(2a)", "\u5300\u51CF\u901F", "\u9644\u7740\u5141\u8BB8\u7684\u5E38\u51CF\u901F\u5EA6", "v=20:0:50:m/s,a=6:0.5:12:m/s2", "v*v/(2*a)", "s", "m", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u8F6C\u5411", "\u963F\u514B\u66FC\u8F6C\u5F2F\u66F2\u7387\u8FD1\u4F3C L/R=tan\u03B4\uFF0CR=L/tan\u03B4", "\u963F\u514B\u66FC\u8F6C\u5411", "\u4F4E\u901F\u3001\u5916\u8F6E\u8F6C\u89D2", "L=2.5:1:6:m,delta=0.2:0.01:0.6:rad", "L/tan(delta)", "R", "m", "engineering"),
  r9("\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u78B0\u649E", "\u5B8C\u5168\u975E\u5F39\u6027\u5171\u540C\u901F\u5EA6", "\u4E00\u7EF4\u78B0\u649E", "\u8F66\u8F86\u5BF9\u5FC3\u7684\u5B8C\u5168\u975E\u5F39\u6027\u6781\u9650", "m1=1500:200:5000:kg,u1=10:0:40:m/s,m2=1000:200:5000:kg,u2=0:-20:20:m/s", "(m1*u1+m2*u2)/(m1+m2)", "v", "m/s", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u8F6E\u8F68", "\u8815\u6ED1\u529B\u7684\u7EBF\u6027\u659C\u7387\uFF0C\u8FD9\u91CC\u7ED9\u51FA\u8F6E\u91CD", "\u8F6E\u8F68", "\u9759\u8F6E\u91CD", "m=1e4:100:3e4:kg", "m*g", "N", "N", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u9053\u5C94", "\u8F99\u53C9\u89D2", "\u9053\u5C94", "\u89D2\u5EA6\u8F93\u5165", "ang=6:1:15:deg", "ang", "\u03B1", "\xB0"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u4FE1\u53F7", "\u5236\u52A8\u8DDD\u79BB\u5185\u7684\u95ED\u585E\u5206\u533A\u957F\u5EA6\u4E0B\u754C", "\u4FE1\u53F7", "\u7528\u5236\u52A8\u8DDD\u79BB\u4F5C\u4E3A\u5206\u533A\u4E0B\u754C\u7684\u6559\u5B66\u6BD4\u8F83", "v=30:0:100:m/s,a=0.8:0.2:1.5:m/s2", "v*v/(2*a)", "s", "m"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u5217\u8F66\u7275\u5F15", "\u52A0\u901F\u5EA6 (F\u2212R)/m", "\u7275\u5F15", "\u963B\u529B R \u7ED9\u5B9A", "F=2e5:0:1e6:N,R=5e4:0:5e5:N,m=4e5:1e4:1e6:kg", "(F-R)/m", "a", "m/s\xB2", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u5236\u52A8", "\u5236\u52A8\u8DDD\u79BB v\xB2/(2a)", "\u5236\u52A8", "\u5E38\u51CF\u901F\u5EA6", "v=40:0:100:m/s,a=1:0.2:2:m/s2", "v*v/(2*a)", "s", "m", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u5EFA\u7B51\u70ED\u5DE5", "\u5BFC\u70ED q=\u03BB \u0394T/d", "\u5E73\u58C1\u5BFC\u70ED", "\u7A33\u6001", "lam=0.5:0.02:3:W/mK,dT=20:0:50:K,d=0.2:0.01:1:m", "lam*dT/d", "q", "W/m\xB2", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u91C7\u5149", "\u70B9\u5149\u6E90\u7167\u5EA6 I cos\u03B8 / r\xB2", "\u7167\u5EA6", "\u70B9\u5149\u6E90", "I=1000:0:1e5:cd,theta=0.3:0:1.2:rad,rad=3:0.2:20:m", "I*cos(theta)/(rad*rad)", "E", "lx", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u6D4B\u7ED8GPS", "\u4F2A\u8DDD\u5B9A\u4F4D\u7684\u51E0\u4F55\uFF1A\u65F6\u949F\u504F\u5DEE\u7B49\u6548\u8DDD\u79BB c \u0394t", "GNSS \u4F2A\u8DDD", "\u4E00\u4E2A\u65F6\u949F\u5DEE", "dt=1e-7:0:1e-5:s", "c0*dt", "\u03C1", "m", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u7ED3\u6784\u76D1\u6D4B", "\u5E94\u53D8 \u03B5=\u0394L/L", "\u76D1\u6D4B\u5E94\u53D8", "\u6807\u8DDD L", "dL=0.001:0:0.05:m,L=1:0.05:10:m", "dL/L", "\u03B5", "\u2014", "engineering"),
  r9("\u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168\xB7\u5B89\u5168\u758F\u6563", "\u758F\u6563\u65F6\u95F4 \u4EBA\u6570/(\u95E8\u5BBD\xD7\u6D41\u7387)", "\u758F\u6563", "\u7A33\u6001\u4EBA\u6D41", "N=200:1:5000:\u2014,w=2:0.5:10:m,flow=1:0.2:2:1/ms", "N/(w*flow)", "t", "s", "engineering"),
  r9("\u5FAE\u79EF\u5206\xB7\u5BFC\u6570", "d/dx (x^n)=n x^{n\u22121}", "\u5E42\u51FD\u6570\u5BFC\u6570", "n \u4E3A\u5B9E\u6570\u3001x>0 \u5F53 n \u975E\u6574\u6570", "x=2:0.01:10:\u2014,n=3:-5:8:\u2014", "n*x^(n-1)", "y\u2032", "\u2014", "engineering"),
  r9("\u5FAE\u79EF\u5206\xB7\u5085\u91CC\u53F6\u7EA7\u6570", "\u65B9\u6CE2 bn=4/(n\u03C0)\uFF0Cn \u5947\u6570", "\u5085\u91CC\u53F6\u7EA7\u6570", "\u5947\u6B21\u8C10\u6CE2", "n=1:1:21:\u2014", "4/(max(1,2*floor((n-1)/2)+1)*pi)", "bn", "\u2014", "engineering"),
  r9("\u5FAE\u79EF\u5206\xB7\u5FAE\u5206\u65B9\u7A0B", "y\u2032=\u2212k y \u7684\u89E3 y0 e^{\u2212kt}", "\u4E00\u9636\u7EBF\u6027", "\u5E38\u7CFB\u6570", "y0=1:-5:5:\u2014,k=0.5:0:5:\u2014", "y0*exp(-k*t)", "y", "\u2014", "engineering"),
  r9("\u5FAE\u79EF\u5206\xB7\u504F\u5FAE\u5206", "\u6CE2\u52A8\u65B9\u7A0B\u884C\u6CE2\u76F8\u901F\u5EA6 c", "\u504F\u5FAE\u5206\u65B9\u7A0B", "c \u7ED9\u5B9A", "c=2:0:20:\u2014", "c", "c", "\u2014"),
  r9("\u5FAE\u79EF\u5206\xB7\u53D8\u5206", "\u6700\u901F\u964D\u7EBF\u4E0D\u5728\u6B64\u6570\u503C\u6C42\u89E3\uFF1B\u76F4\u7EBF\u8DEF\u5F84\u957F\u5EA6 \u221A(\u0394x\xB2+\u0394y\xB2)", "\u53D8\u5206\u5BF9\u6BD4\u7528\u7684\u76F4\u7EBF\u957F\u5EA6", "\u7AEF\u70B9", "dx=1:-5:5:\u2014,dy=1:-5:5:\u2014", "sqrt(dx*dx+dy*dy)", "L", "\u2014", "engineering"),
  r9("\u5FAE\u79EF\u5206\xB7\u6570\u503C\u79EF\u5206", "\u68AF\u5F62\u516C\u5F0F (b\u2212a)(f(a)+f(b))/2", "\u68AF\u5F62\u6CD5\u5219", "\u4E00\u6BB5\u3001f(x)=x\xB2", "a=0:-5:5:\u2014,b=1:-5:5:\u2014", "(b-a)*(a*a+b*b)/2", "I", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u77E9\u9635\u4E58\u6CD5", "2\xD72 \u4F5C\u7528\u4E8E\u5411\u91CF\u7684\u7B2C\u4E00\u5206\u91CF", "\u77E9\u9635\u4E58\u6CD5", "2\xD72", "a=1:-5:5:\u2014,b=2:-5:5:\u2014,x=1:-5:5:\u2014,y=0:-5:5:\u2014", "a*x+b*y", "y1", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u5947\u5F02\u503C", "2\xD72 \u5BF9\u89D2\u9635\u7684\u6700\u5927\u5947\u5F02\u503C max(|a|,|d|)", "\u5947\u5F02\u503C", "\u5DF2\u662F\u5BF9\u89D2", "a=3:-10:10:\u2014,d=1:-10:10:\u2014", "max(abs(a),abs(d))", "\u03C3", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u7EBF\u6027\u53D8\u6362", "\u884C\u5217\u5F0F ad\u2212bc \u662F\u9762\u79EF\u7F29\u653E", "\u884C\u5217\u5F0F", "2\xD72", "a=2:-5:5:\u2014,b=1:-5:5:\u2014,c=0:-5:5:\u2014,d=1:-5:5:\u2014", "a*d-b*c", "det", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u5411\u91CF\u7A7A\u95F4", "\u4E8C\u7EF4\u5411\u91CF\u8303\u6570", "\u6B27\u6C0F\u8303\u6570", "R\xB2", "x=3:-10:10:\u2014,y=4:-10:10:\u2014", "sqrt(x*x+y*y)", "||v||", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u6B63\u4EA4\u5316", "Gram\u2013Schmidt \u7B2C\u4E8C\u5411\u91CF\u51CF\u53BB\u6295\u5F71\u540E\u7684\u8303\u6570", "Gram\u2013Schmidt", "\u4E24\u4E2A\u4E8C\u7EF4\u5411\u91CF", "x1=1:-5:5:\u2014,y1=0:-5:5:\u2014,x2=1:-5:5:\u2014,y2=1:-5:5:\u2014", "sqrt(max(0,(x2-x1*(x1*x2+y1*y2)/(x1*x1+y1*y1+1e-12))^2+(y2-y1*(x1*x2+y1*y2)/(x1*x1+y1*y1+1e-12))^2))", "||u2||", "\u2014"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u6700\u5C0F\u4E8C\u4E58", "\u8FC7\u539F\u70B9\u7684\u4E00\u5143\u659C\u7387 \u03A3xy/\u03A3x\xB2\uFF0C\u4E24\u70B9\u4E0D\u5C55\u5F00\uFF1B\u4E00\u5217\u65F6 b=y/x", "\u6700\u5C0F\u4E8C\u4E58", "\u5355\u70B9\u8FC7\u539F\u70B9", "x=2:0.1:10:\u2014,y=5:-20:20:\u2014", "y/x", "b", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7PCA", "2\xD72 \u6700\u5927\u7279\u5F81\u503C", "\u4E3B\u6210\u5206", "\u534F\u65B9\u5DEE [[a,b],[b,d]]", "a=2:-5:5:\u2014,b=0.4:-5:5:\u2014,d=1:-5:5:\u2014", "((a+d)+sqrt(max(0,(a+d)^2-4*(a*d-b*b))))/2", "\u03BB", "\u2014", "engineering"),
  r9("\u7EBF\u6027\u4EE3\u6570\xB7\u77E9\u9635\u5206\u89E3", "\u5BF9\u89D2\u9635\u7684\u6761\u4EF6\u6570 |\u03BBmax/\u03BBmin|", "\u6761\u4EF6\u6570", "\u5BF9\u89D2", "a=4:0.1:20:\u2014,d=1:0.1:20:\u2014", "max(abs(a),abs(d))/min(abs(a),abs(d))", "\u03BA", "\u2014", "engineering"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7\u76F8\u56FE", "\u4E00\u7EF4 \u1E8B=a x \u7684\u5E73\u8861\u5728 0\uFF0C\u659C\u7387 a", "\u76F8\u7EBF", "\u7EBF\u6027", "a=-0.5:-5:5:\u2014", "a", "a", "\u2014", "engineering"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7\u7A33\u5B9A\u6027", "\u7EBF\u6027\u5316\u7279\u5F81\u503C\u5B9E\u90E8", "\u7EBF\u6027\u7A33\u5B9A\u6027", "\u4E00\u7EF4", "a=-0.2:-5:5:\u2014", "a", "\u03BB", "\u2014", "engineering"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7\u5206\u5C94", "\u903B\u8F91\u65AF\u8C1B r", "\u500D\u5468\u671F", "\u6620\u5C04\u53C2\u6570", "r=3:0:4:\u2014", "r", "r", "\u2014"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7\u6D1B\u4F26\u8328", "\u76F8\u4F53\u79EF\u6536\u7F29 \u2212(\u03C3+1+\u03B2)", "Lorenz 1963", "\u6563\u5EA6", "sigma=10:0:30:\u2014,beta=2.667:0:10:\u2014", "-(sigma+1+beta)", "div", "\u2014"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7Rossler", "\u5E73\u8861 z=c\u2212\u221A(c\xB2\u22124ab)", "R\xF6ssler \u5E73\u8861", "c\xB2\u22654ab", "a=0.2:0:1:\u2014,b=0.2:0:2:\u2014,c=5.7:0:20:\u2014", "c-sqrt(max(0,c*c-4*a*b))", "z", "\u2014"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7Logistic\u6620\u5C04", "x\u2192r x (1\u2212x)", "\u903B\u8F91\u65AF\u8C1B\u6620\u5C04", "\u4E00\u6B21\u8FED\u4EE3", "r=3.2:0:4:\u2014,x=0.4:0:1:\u2014", "r*x*(1-x)", "x\u2032", "\u2014", "engineering"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7H\xE9non\u6620\u5C04", "x\u2032=1\u2212a x\xB2+y", "H\xE9non", "\u4E00\u6B21\u8FED\u4EE3\u7684 x", "a=1.4:0:2:\u2014,b=0.3:-1:1:\u2014,x=0: -1:1:\u2014,y=0:-1:1:\u2014", "1-a*x*x+y", "x\u2032", "\u2014", "engineering"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7\u6DF7\u6C8C", "r=4 \u65F6\u674E\u96C5\u666E\u8BFA\u592B\u6307\u6570 ln2", "\u903B\u8F91\u65AF\u8C1B r=4", "\u8BE5\u53C2\u6570", "s=1:0:1:\u2014", "ln2*max(s,0.5)/max(s,0.5)", "\u03BB", "\u2014"),
  r9("\u52A8\u529B\u7CFB\u7EDF\xB7\u5206\u5F62", "\u76D2\u7EF4 ln N/ln(1/\u03B5)", "\u76D2\u8BA1\u6570", "\u4E00\u79CD\u8986\u76D6", "N=80:1:1e6:\u2014,eps=0.1:0.001:0.5:\u2014", "ln(N)/ln(1/eps)", "D", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u5355\u7EAF\u5F62", "\u8BE5\u53EF\u884C\u57DF\u9876\u70B9\u6700\u4F18 z*=3", "\u7EBF\u6027\u89C4\u5212", "max 3x+2y, x+y\u22641", "z=3:0:10:\u2014", "z", "z*", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u5BF9\u5076", "\u5F3A\u5BF9\u5076\u65F6\u5BF9\u5076\u95F4\u9699\u4E3A 0", "\u5BF9\u5076", "\u5DF2\u8FBE\u6700\u4F18\u7684\u95F4\u9699", "gap=0:0:10:\u2014", "gap", "gap", "\u2014"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u6700\u77ED\u8DEF", "\u677E\u5F1B d(v)\u2264d(u)+w", "Dijkstra/Bellman", "\u975E\u8D1F", "du=2:0:100:\u2014,w=3:0:50:\u2014", "du+w", "d", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u6700\u5C0F\u751F\u6210\u6811", "n \u4E2A\u9876\u70B9\u7684\u6811\u6709 n\u22121 \u6761\u8FB9", "\u751F\u6210\u6811", "\u8FDE\u901A\u65E0\u5411", "n=6:1:40:\u2014", "n-1", "edges", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u6700\u5927\u6D41", "\u5BB9\u91CF\u7EA6\u675F\u4E0B\u7684\u4E00\u6761\u5272", "\u6700\u5927\u6D41\u6700\u5C0F\u5272", "\u4E00\u6761\u5272\u7684\u5BB9\u91CF", "c=5:0:100:\u2014", "c", "cut", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u5339\u914D", "\u4E8C\u5206\u56FE\u6700\u5927\u5339\u914D\u4E0D\u8D85\u8FC7\u8F83\u5C0F\u4E00\u4FA7", "\u5339\u914D", "K\xF6nig", "L=4:0:20:\u2014,R=5:0:20:\u2014", "min(L,R)", "M", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u7740\u8272", "\u5B8C\u5168\u56FE\u8272\u6570\u7B49\u4E8E\u9876\u70B9\u6570", "\u56FE\u7740\u8272", "\u5B8C\u5168\u56FE", "n=4:1:12:\u2014", "n", "\u03C7", "\u2014", "engineering"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u65C5\u884C\u5546", "Held\u2013Karp \u72B6\u6001\u6570 n 2^n \u7684\u91CF\u7EA7", "TSP DP", "n \u5C0F", "n=6:2:12:\u2014", "n*2^n", "states", "\u2014"),
  r9("\u4F18\u5316\u56FE\u8BBA\xB7\u7F51\u7EDC\u6D41", "\u5B88\u6052\uFF1A\u6D41\u5165=\u6D41\u51FA\u65F6\u6B8B\u5DEE 0", "\u7F51\u7EDC\u6D41", "\u4E00\u4E2A\u8282\u70B9", "inn=3:0:50:\u2014,out=3:0:50:\u2014", "inn-out", "bal", "\u2014", "engineering"),
  r9("\u53CD\u5E94\xB7\u4E00\u7EA7\u53CD\u5E94", "c=c0 e^{\u2212kt}", "\u4E00\u7EA7\u53CD\u5E94", "\u7B49\u6E29\u3001\u6052\u5BB9", "c0=1:0:10:\u2014,k=0.2:0:5:1/s", "c0*exp(-k*t)", "c", "\u2014", "engineering"),
  r9("\u53CD\u5E94\xB7\u53EF\u9006", "\u5E73\u8861\u5E38\u6570 K=cf/cb \u7684\u5B9A\u4E49\uFF0C\u5F1B\u8C6B", "\u53EF\u9006\u53CD\u5E94", "\u6D53\u5EA6\u6BD4", "cf=0.4:0:5:\u2014,cb=0.2:0.01:5:\u2014", "cf/cb", "K", "\u2014", "engineering"),
  r9("\u53CD\u5E94\xB7\u5E73\u884C", "\u9009\u62E9\u6027 k1/(k1+k2)", "\u5E73\u884C\u4E00\u7EA7", "\u540C\u4E00\u53CD\u5E94\u7269", "k1=0.3:0:5:\u2014,k2=0.1:0:5:\u2014", "k1/(k1+k2)", "S", "\u2014", "engineering"),
  r9("\u53CD\u5E94\xB7\u8FDE\u4E32", "A\u2192B \u7684\u4E00\u7EA7\u5269\u4F59", "\u8FDE\u4E32\u53CD\u5E94\u7684\u7B2C\u4E00\u6B65", "\u53EA\u7ED9\u7B2C\u4E00\u6B65", "c0=1:0:10:\u2014,k=0.3:0:5:\u2014", "c0*exp(-k*t)", "cA", "\u2014"),
  r9("\u53CD\u5E94\xB7\u9176\u50AC\u5316", "Michaelis\u2013Menten v=Vmax S/(Km+S)", "\u7C73\u6C0F\u65B9\u7A0B", "\u51C6\u7A33\u6001", "Vmax=1:0:10:\u2014,S=2:0:50:\u2014,Km=1:0.01:20:\u2014", "Vmax*S/(Km+S)", "v", "\u2014", "engineering"),
  r9("\u53CD\u5E94\xB7\u94FE\u53CD\u5E94", "\u76F4\u94FE\u7684\u51C0\u901F\u7387\u7528\u6709\u6548\u4E00\u7EA7 k", "\u94FE\u53CD\u5E94\u7684\u6709\u6548\u901F\u7387", "\u6709\u6548\u5E38\u6570\u5DF2\u7ED9\u5B9A\uFF0C\u4E0D\u662F\u53CD\u5E94\u8DEF\u5F84\u8BBE\u8BA1", "c0=1:0:5:\u2014,k=0.05:0:2:\u2014", "c0*exp(-k*t)", "c", "\u2014"),
  r9("\u53CD\u5E94\xB7\u71C3\u70E7", "\u5F53\u91CF\u6BD4 \u03C6= (F/A)/(F/A)st", "\u5F53\u91CF\u6BD4", "\u8D28\u91CF\u6BD4\uFF0C\u4E0D\u662F\u71C3\u70E7\u7EC4\u7EC7", "FA=0.07:0:0.3:\u2014,FAst=0.068:0.01:0.2:\u2014", "FA/FAst", "\u03C6", "\u2014", "engineering"),
  r9("\u53CD\u5E94\xB7\u5149\u5316\u5B66", "\u91CF\u5B50\u4EA7\u989D \u03A6=\u53CD\u5E94\u5206\u5B50\u6570/\u5438\u6536\u5149\u5B50\u6570", "\u91CF\u5B50\u4EA7\u989D\u5B9A\u4E49", "\u8BA1\u6570\u5B9A\u4E49", "nr=10:0:1e6:\u2014,np=20:1:1e6:\u2014", "nr/np", "\u03A6", "\u2014", "engineering"),
  r9("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u7F13\u51B2", "Henderson\u2013Hasselbalch pH=pKa+log10(A/HA)", "\u7F13\u51B2", "\u5F31\u9178\u53CA\u5176\u5171\u8F6D\u78B1", "pKa=4.76:1:12:\u2014,A=0.1:0.001:1:\u2014,HA=0.1:0.001:1:\u2014", "pKa+log10(A/HA)", "pH", "\u2014", "engineering"),
  r9("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u6C89\u6DC0", "\u79BB\u5B50\u79EF\u4E0E Ksp \u7684\u6BD4", "\u6EB6\u5EA6\u79EF", "\u5224\u65AD\u8FC7\u9971\u548C\u7684\u6BD4\u503C", "IP=1e-8:1e-20:1:\u2014,Ksp=1e-10:1e-20:1:\u2014", "IP/Ksp", "S", "\u2014", "engineering"),
  r9("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u7EDC\u5408", "\u751F\u6210\u5E38\u6570 \u03B2= [ML]/([M][L])", "\u7EDC\u5408\u5E73\u8861", "\u6D53\u5EA6", "ML=0.01:0:1:\u2014,M=0.001:1e-6:1:\u2014,L=0.001:1e-6:1:\u2014", "ML/(M*L)", "\u03B2", "\u2014", "engineering"),
  r9("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u7535\u89E3", "\u6CD5\u62C9\u7B2C\u6C89\u79EF m=M I t /(n F)", "\u6CD5\u62C9\u7B2C\u7535\u89E3\u5B9A\u5F8B", "\u7535\u6D41\u6548\u7387 100%\uFF0C\u4E0D\u662F\u7535\u9540\u914D\u65B9\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 1 h", "M=0.0635:0.001:0.3:kg/mol,I=1:0:50:A,n=2:1:6:\u2014,t0=3600:0:2e4:s", "M*I*t/(n*96485)", "m", "kg", "engineering"),
  r9("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u7535\u9540", "\u540C\u4E00\u6CD5\u62C9\u7B2C\u5B9A\u5F8B\u7684\u6C89\u79EF\u8D28\u91CF", "\u7535\u9540\u7684\u6CD5\u62C9\u7B2C\u5173\u7CFB", "\u7535\u6D41\u6548\u7387 100%\uFF0C\u4E0D\u662F\u9540\u6DB2\u914D\u65B9\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 1 h", "M=0.058:0.001:0.2:kg/mol,I=2:0:50:A,n=2:1:4:\u2014,t0=3600:0:2e4:s", "M*I*t/(n*96485)", "m", "kg", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u5206\u5B50\u632F\u52A8", "\u8C10\u632F\u5B50\u80FD\u7EA7\u95F4\u9694 \u210F\u03C9", "\u5206\u5B50\u632F\u52A8", "\u8C10\u632F\u5B50\uFF0C\u03C9 \u7ED9\u5B9A", "nu=1e13:1e11:1e15:Hz", "hP*nu/qe", "\u0394E", "eV", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u8F6C\u52A8", "\u521A\u6027\u8F6C\u5B50\u80FD\u7EA7\u95F4\u9694 2 B (J+1)", "\u521A\u6027\u8F6C\u5B50", "J\u2192J+1", "B=1:0.01:20:cm-1,J=1:0:20:\u2014", "2*B*(J+1)", "\u0394E", "cm\u207B\xB9", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u7535\u5B50\u8DC3\u8FC1", "E=hc/\u03BB", "\u7535\u5B50\u8DC3\u8FC1\u80FD\u91CF", "\u771F\u7A7A\u6CE2\u957F", "lambda=500e-9:100e-9:800e-9:m", "hP*c0/(lambda*qe)", "E", "eV", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u7EA2\u5916", "\u6CE2\u6570 \u03BD\u0303=1/\u03BB", "\u7EA2\u5916", "\u6CE2\u957F", "lambda=5e-6:2e-6:20e-6:m", "0.01/lambda", "\u03BD", "cm\u207B\xB9", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u62C9\u66FC", "\u65AF\u6258\u514B\u65AF\u4F4D\u79FB", "\u62C9\u66FC", "\u6CE2\u6570\u5DEE", "n0=2e4:1e4:3e4:cm-1,nv=1000:0:4000:cm-1", "n0-nv", "\u03BDs", "cm\u207B\xB9", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u7D2B\u5916", "Beer\u2013Lambert A=\u03B5 c l", "\u7D2B\u5916\u5438\u6536", "\u7A00\u6EB6\u6DB2", "eps=1000:1:1e5:\u2014,c=1e-4:1e-7:0.01:\u2014,l=1:0.1:5:cm", "eps*c*l", "A", "\u2014", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u6838\u78C1", "\u5316\u5B66\u4F4D\u79FB \u03B4=(\u03BD\u2212\u03BDref)/\u03BDref \xD710^6", "NMR \u5316\u5B66\u4F4D\u79FB", "\u9891\u7387\u5DF2\u6D4B", "nu=400.1:1:1000:MHz,nref=400:1:1000:MHz", "(nu-nref)/nref*1e6", "\u03B4", "ppm", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u8D28\u8C31", "\u8D28\u8377\u6BD4 m/z", "\u8D28\u8C31", "\u8F93\u5165", "m=100:1:2000:u,z=1:1:4:\u2014", "m/z", "m/z", "u", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u6676\u4F53\u884D\u5C04", "\u5E03\u62C9\u683C n \u03BB=2 d sin\u03B8", "Bragg", "\u4E00\u7EA7", "lambda=1.54e-10:0.5e-10:3e-10:m,d=2e-10:0.5e-10:10e-10:m", "asin(min(1,lambda/(2*d)))*180/pi", "\u03B8", "\xB0", "engineering"),
  r9("\u7ED3\u6784\u4E0E\u5149\u8C31\xB7\u5206\u5B50\u8F68\u9053", "\u53CC\u539F\u5B50\u6210\u952E/\u53CD\u952E\u5206\u88C2 2|\u03B2|", "H\xFCckel \u53CC\u539F\u5B50", "\u5355\u53C2\u6570", "beta=1:0:5:eV", "2*abs(beta)", "\u0394E", "eV"),
  r9("\u751F\u6001\u751F\u7406\xB7Logistic\u589E\u957F", "N=K/(1+(K/N0\u22121)e^{\u2212rt})", "\u903B\u8F91\u65AF\u8C1B\u65B9\u7A0B\u89E3", "\u8FDE\u7EED\u3001\u5E38 r", "K=100:1:1e5:\u2014,N0=10:0.1:1e4:\u2014,rr=0.3:0:2:1/time", "K/(1+(K/N0-1)*exp(-rr*t))", "N", "\u2014", "engineering"),
  r9("\u751F\u6001\u751F\u7406\xB7\u79CD\u7FA4\u7ADE\u4E89", "Lotka\u2013Volterra \u7ADE\u4E89\u5E73\u8861 N1=(K1\u2212a K2)/(1\u2212a b)", "\u7ADE\u4E89\u6A21\u578B\u5E73\u8861", "1\u2212ab>0 \u624D\u7A33\u5B9A\u5171\u5B58", "K1=100:1:1000:\u2014,K2=80:1:1000:\u2014,a=0.4:0:1.2:\u2014,b=0.3:0:1.2:\u2014", "(K1-a*K2)/max(1e-3,1-a*b)", "N1", "\u2014"),
  r9("\u751F\u6001\u751F\u7406\xB7\u5171\u751F", "\u4E92\u5229\u7684\u7EBF\u6027\u589E\u957F\u9879 r+b M\uFF0C\u8FD9\u91CC\u7ED9\u51C0\u589E\u957F\u7387", "\u5171\u751F", "\u4F19\u4F34\u5BC6\u5EA6\u7ED9\u5B9A", "r=0.2:-1:2:\u2014,b=0.01:0:1:\u2014,M=10:0:100:\u2014", "r+b*M", "rnet", "\u2014"),
  r9("\u751F\u6001\u751F\u7406\xB7\u795E\u7ECF\u653E\u7535", "\u79EF\u5206\u53D1\u653E\uFF1A\u8FBE\u5230\u9608\u503C\u7684\u65F6\u95F4 (Vth\u2212V0)/I \u5F53 I \u4E3A\u7535\u538B\u659C\u7387", "\u79EF\u5206\u53D1\u653E", "\u6052\u5B9A\u7535\u6D41\u5DF2\u6298\u6210\u7535\u538B\u659C\u7387\uFF0C\u4E0D\u662F\u79BB\u5B50\u901A\u9053\u6A21\u578B", "slope=10:0.1:100:mV/ms,Vth=20:-20:50:mV,V0=-60:-90:0:mV", "(Vth-V0)/slope", "t", "ms"),
  r9("\u751F\u6001\u751F\u7406\xB7\u5FC3\u810F\u8282\u5F8B", "\u5FC3\u7387 60/RR", "\u5FC3\u52A8\u5468\u671F", "\u4E0D\u662F\u8BCA\u65AD", "RR=0.86:0.3:2:s", "60/RR", "HR", "1/min", "engineering"),
  r9("\u751F\u6001\u751F\u7406\xB7\u547C\u5438", "\u901A\u6C14\u91CF VE=VT \xD7 f", "\u5206\u949F\u901A\u6C14\u91CF", "\u5E73\u5747", "VT=0.5:0.1:2:L,f=14:4:40:1/min", "VT*f", "VE", "L/min", "engineering"),
  r9("\u751F\u6001\u751F\u7406\xB7\u80BE\u810F", "\u6E05\u9664\u7387 C=U V / P", "\u80BE\u6E05\u9664\u7387\u5B9A\u4E49", "\u6D53\u5EA6\u4E0E\u5C3F\u6D41\u7387", "U=10:0:500:\u2014,Vv=0.001:0:0.02:\u2014,P=1:0.01:20:\u2014", "U*Vv/P", "C", "\u2014", "engineering")
];
var IDS = [
  r9("id:e-field-particle", "\u5747\u5300\u7535\u573A a=qE/m", "\u725B\u987F\u7B2C\u4E8C\u5B9A\u5F8B", "\u975E\u76F8\u5BF9\u8BBA\u3001\u5FFD\u7565\u78C1\u4E0E\u91CD\u529B", "q=1.6e-19:-1e-17:1e-17:C,E=1000:0:1e6:N/C,m=9.1e-31:1e-31:1e-25:kg", "q*E/m", "a", "m/s\xB2", "engineering"),
  r9("id:standing-wave", "y=2A sin(kx) cos(\u03C9t)", "\u9A7B\u6CE2", "\u7B49\u5E45\u76F8\u5411\u884C\u6CE2", "A=0.01:0:0.1:m,k=3.14:0.2:20:1/m,w=6:0.2:40:rad/s", "2*A*sin(k*0.5)*cos(w*t)", "y", "m", "engineering"),
  r9("id:rl-circuit", "i=I(1\u2212e^{\u2212(R/L)t})\uFF0C\u03C4=L/R", "\u4E00\u9636 RL", "\u96F6\u72B6\u6001\u3001\u6052\u538B\u3002e^{\u2212Rt/L} \u6309\u53CC\u7CBE\u5EA6\u8BA1\u7B97\uFF0C\u4E0D\u5728 \xB140 \u5904\u622A\u65AD", "I=1:0:10:A,R=10:0.1:1000:ohm,L=0.1:1e-4:10:H", "I*(1-exp(-(R/L)*t))", "i", "A", "engineering"),
  r9("id:sph-simple", "\u4E09\u6B21\u6837\u6761\u6838\u4E2D\u5FC3 W=1/(\u03C0 h\xB3)", "SPH \u6838\u51FD\u6570", "\u53EA\u7ED9\u6838\u7684\u4E2D\u5FC3\u503C\uFF0C\u4E0D\u662F\u6D41\u4F53\u6C42\u89E3\u5668", "h=0.05:0.005:0.5:m", "1/(pi*h*h*h)", "W", "1/m\xB3"),
  r9("id:membrane-2d", "\u77E9\u5F62\u819C\u57FA\u9891 \u03C9=\u03C0 c \u221A((1/Lx)\xB2+(1/Ly)\xB2)", "\u4E8C\u7EF4\u6CE2\u52A8\u65B9\u7A0B\u5206\u79BB\u53D8\u91CF", "\u56DB\u8FB9\u56FA\u5B9A\u3001\u5747\u5300\u5F20\u529B", "c=20:0.5:200:m/s,Lx=1:0.1:5:m,Ly=0.8:0.1:5:m", "pi*c*sqrt(1/(Lx*Lx)+1/(Ly*Ly))", "\u03C9", "rad/s", "engineering"),
  r9("id:bjt-amplifier", "\u5171\u5C04\u5C0F\u4FE1\u53F7 Av=\u2212gm Rc", "Sedra/Smith, \u5171\u5C04\u653E\u5927\u5668", "\u5FFD\u7565 ro\u3001\u4FE1\u53F7\u6E90\u5185\u963B", "gm=0.04:0.001:0.5:S,Rc=2000:10:1e5:ohm", "-gm*Rc", "Av", "\u2014", "engineering"),
  r9("id:gravity-assist", "\u53CC\u66F2\u7EBF\u504F\u8F6C\u89D2 \u03B4=2 arctan(GM/(b v\xB2))", "\u5706\u9525\u66F2\u7EBF\u8F68\u9053", "\u4E24\u4F53\u3001\u7784\u51C6\u8DDD\u79BB b", "M=1.9e27:1e22:2e30:kg,b=1e8:1e6:1e10:m,v=10000:100:1e5:m/s", "2*atan(Ggrav*M/(b*v*v))", "\u03B4", "rad"),
  r9("id:diffie-hellman", "\u6559\u5B66\u5C0F\u6574\u6570\u5171\u4EAB\u5BC6\u94A5 g^{ab} mod p", "Diffie\u2013Hellman \u5B9A\u4E49", "\u5C0F\u6574\u6570\uFF0C\u4E0D\u662F\u5B89\u5168\u53C2\u6570", "g=5:2:15:\u2014,a=3:1:6:\u2014,b=4:1:6:\u2014,p=23:5:97:\u2014", "mod(g^(a*b),p)", "s", "\u2014"),
  r9("id:dfa-nfa", "DFA \u4E00\u6B65\uFF1Aq\u2032=(q+a) mod n", "\u6709\u9650\u81EA\u52A8\u673A\u8F6C\u79FB", "\u5355\u4E00\u6A21 n \u7684\u6559\u5B66\u81EA\u52A8\u673A", "q=1:0:10:\u2014,a=1:0:5:\u2014,n=4:1:12:\u2014", "mod(q+a,n)", "q\u2032", "\u2014", "engineering"),
  r9("id:rl-grid", "V=r+\u03B3 V\u2032", "\u8D1D\u5C14\u66FC\u65B9\u7A0B", "\u786E\u5B9A\u6027", "r=0:-5:5:\u2014,gamma=0.9:0:0.99:\u2014,Vp=1:-5:5:\u2014", "r+gamma*Vp", "V", "\u2014", "engineering"),
  r9("id:heat-2d", "\u4E8C\u7EF4\u7B2C\u4E00\u6A21\u6001 T=T0 exp(\u2212\u03B1 \u03C0\xB2 (1/Lx\xB2+1/Ly\xB2) t)", "\u70ED\u65B9\u7A0B\u5206\u79BB\u53D8\u91CF", "\u56DB\u8FB9\u4E3A\u96F6\u7684 Dirichlet", "T0=1:0:5:\u2014,alpha=0.1:0.001:2:\u2014,Lx=1:0.1:5:\u2014,Ly=1:0.1:5:\u2014", "T0*exp(-alpha*pi*pi*(1/(Lx*Lx)+1/(Ly*Ly))*t)", "T", "\u2014", "engineering"),
  r9("id:brayton-cycle", "\u03B7=1\u2212rp^{(1\u2212\u03B3)/\u03B3}", "\u7406\u60F3\u5E03\u96F7\u987F\u5FAA\u73AF", "\u51B7\u7A7A\u6C14\u6807\u51C6", "rp=8:1:40:\u2014,gamma=1.4:1.2:1.67:\u2014", "1-rp^((1-gamma)/gamma)", "\u03B7", "\u2014", "engineering"),
  r9("id:otto-diesel", "\u5965\u6258\u6548\u7387 \u03B7=1\u2212r^{1\u2212\u03B3}", "\u7406\u60F3\u5965\u6258\u5FAA\u73AF", "\u51B7\u7A7A\u6C14\u6807\u51C6", "rr=8:2:20:\u2014,gamma=1.4:1.2:1.67:\u2014", "1-rr^(1-gamma)", "\u03B7", "\u2014", "engineering"),
  r9("id:double-slit", "\u0394y=\u03BB L/d", "\u6768\u6C0F\u53CC\u7F1D", "\u8FDC\u573A\u5C0F\u89D2", "lambda=5.5e-7:4e-7:7e-7:m,L=1:0.2:3:m,d=2e-4:5e-5:0.001:m", "lambda*L/d", "\u0394y", "m", "engineering"),
  r9("id:single-slit", "\u7B2C\u4E00\u6781\u5C0F a sin\u03B8=\u03BB", "\u5355\u7F1D\u884D\u5C04", "\u592B\u7405\u79BE\u8D39", "a=1e-4:2e-5:0.001:m,lambda=5.5e-7:4e-7:7e-7:m", "asin(min(1,lambda/a))*180/pi", "\u03B8", "\xB0", "engineering")
];

// js/lab/rows/fix.js
var r10 = (key, equation, authority, assumptions, params, expr, label, unit, fidelity = "engineering") => [key, equation, authority, assumptions, params, expr, label, unit, fidelity];
var FIX = [
  r10("\u8FD0\u52A8\u5B66\xB7\u629B\u4F53\u53D7\u963B\u529B", "\u7EBF\u6027\u963B\u529B\u4E0B\u6C34\u5E73\u901F\u5EA6 v=v0 e^{\u2212(b/m)t}\uFF0C\u4F4D\u79FB (m/b)v0(1\u2212e^{\u2212(b/m)t})", "Thornton & Marion, \u7EBF\u6027\u963B\u529B", "\u963B\u529B\u4E0E\u901F\u5EA6\u6210\u6B63\u6BD4\u3001\u53EA\u5199\u6C34\u5E73\u5206\u91CF\uFF1Bt0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4\u53D6\u65F6\u95F4\u5E38\u6570 m/b", "m=1:0.05:10:kg,b=0.2:0.01:5:1/s,v0=20:0:80:m/s,t0=5:0:60:s", "(m/b)*v0*(1-exp(-(b/m)*t))", "x", "m"),
  r10("\u8FD0\u52A8\u5B66\xB7\u591A\u6BB5\u8FD0\u52A8", "\u4E24\u6BB5\u5300\u901F\uFF1Ax=v1 min(t,t1)+v2 max(0,t\u2212t1)", "\u5206\u6BB5\u5300\u901F", "\u4E24\u6BB5\u5E38\u901F\u5EA6\u3001t1 \u5904\u5206\u6BB5", "v1=4:0:30:m/s,v2=1:0:30:m/s,t1=2:0.1:20:s", "v1*min(t,t1)+v2*max(0,t-t1)", "x", "m"),
  r10("\u52A8\u529B\u5B66\xB7\u5706\u5468\u8FD0\u52A8", "a_n=v\xB2/r", "\u5411\u5FC3\u529B\u52A0\u901F\u5EA6", "\u901F\u7387\u5927\u5C0F\u4E0D\u53D8", "v=4:0:40:m/s,rad=1:0.05:20:m", "v*v/rad", "a", "m/s\xB2"),
  r10("\u52A8\u529B\u5B66\xB7\u53D8\u529B\u8FD0\u52A8", "a=(F0+c t)/m", "\u725B\u987F\u7B2C\u4E8C\u5B9A\u5F8B", "\u529B\u968F\u65F6\u95F4\u7EBF\u6027", "F0=2:-20:50:N,c=0.5:-10:10:N/s,m=1:0.05:20:kg", "(F0+c*t)/m", "a", "m/s\xB2"),
  r10("\u52A8\u529B\u5B66\xB7\u6ED1\u8F6E\u7EC4", "\u7406\u60F3\u6ED1\u8F6E\u7EC4 F=W/n", "\u673A\u68B0\u5229\u76CA", "\u65E0\u6469\u64E6\u3001n \u80A1\u627F\u91CD", "W=100:0:5000:N,n=4:1:8:\u2014", "W/n", "F", "N"),
  r10("\u9759\u7535\xB7\u7535\u573A\u7EBF", "\u70B9\u7535\u8377 E=k |q|/r\xB2", "\u7535\u573A\u5B9A\u4E49", "\u771F\u7A7A\u70B9\u7535\u8377\uFF0C\u7535\u573A\u7EBF\u758F\u5BC6\u6B63\u6BD4\u4E8E E", "q=1e-9:-1e-6:1e-6:C,rad=0.2:0.01:5:m", "kC*abs(q)/(rad*rad)", "E", "N/C"),
  r10("\u9759\u7535\xB7\u9AD8\u65AF\u5B9A\u7406", "\u95ED\u5408\u66F2\u9762\u7535\u901A\u91CF \u03A6=q/\u03B50", "\u9AD8\u65AF\u5B9A\u5F8B", "\u4EFB\u610F\u95ED\u5408\u66F2\u9762\u3001\u771F\u7A7A", "q=1e-9:-1e-6:1e-6:C", "q/eps0", "\u03A6", "N\xB7m\xB2/C"),
  r10("\u78C1\u5B66\xB7\u78C1\u573A\u7EBF", "\u957F\u76F4\u5BFC\u7EBF B=\u03BC0 I/(2\u03C0 r)", "\u6BD5\u5965-\u8428\u4F10\u5C14", "\u65E0\u9650\u957F\u76F4\u5BFC\u7EBF", "I=5:0:100:A,rad=0.05:0.001:2:m", "mu0*I/(2*pi*rad)", "B", "T"),
  r10("\u78C1\u5B66\xB7\u78C1\u60AC\u6D6E", "\u6C34\u5E73\u8F7D\u6D41\u5BFC\u7EBF\u5E73\u8861 mg=I L B", "\u5B89\u57F9\u529B\u4E0E\u91CD\u529B\u5E73\u8861", "\u5747\u5300\u78C1\u573A\u3001\u5BFC\u7EBF\u6C34\u5E73", "m=0.01:0.0001:1:kg,I=2:0.01:50:A,L=0.1:0.01:1:m", "m*g/(I*L)", "B", "T"),
  r10("\u8FD1\u4EE3\xB7\u73BB\u5C14\u6A21\u578B", "E_n=\u221213.6 eV/n\xB2", "\u73BB\u5C14\u6A21\u578B", "\u7C7B\u6C22\u3001\u5386\u53F2\u6A21\u578B", "n=2:1:8:\u2014", "-13.6/(n*n)", "E", "eV"),
  r10("\u8FD1\u4EE3\xB7\u6C22\u539F\u5B50", "E_n=\u221213.6 eV/n\xB2", "\u7C7B\u6C22\u80FD\u7EA7", "\u73BB\u5C14\u6216\u859B\u5B9A\u8C14\u7684\u80FD\u7EA7\u516C\u5F0F\u76F8\u540C", "n=1:1:8:\u2014", "-13.6/(n*n)", "E", "eV"),
  r10("\u8FD1\u4EE3\xB7\u65AF\u7279\u6069-\u76D6\u62C9\u8D6B", "\u4E24\u675F\u5206\u88C2\u80FD \xB1\u03BC_B B", "Stern\u2013Gerlach", "\u81EA\u65CB 1/2\u3001\u4E0D\u5747\u5300\u573A\u7684\u80FD\u91CF\u5C3A\u5EA6\u7528 \u03BCB B", "B=1:0.01:10:T", "5.788e-5*B", "\u0394E", "eV"),
  r10("\u6838\u7269\u7406\xB7\u534A\u8870\u671F", "t\xBD=ln2/\u03BB", "\u534A\u8870\u671F\u5B9A\u4E49", "\u5355\u4E00\u6307\u6570\u8870\u53D8", "lam=0.1:0.0001:10:1/s", "ln2/lam", "t\xBD", "s"),
  r10("\u6838\u7269\u7406\xB7\u88C2\u53D8", "\u6BCF\u6B21\u88C2\u53D8\u91CA\u653E\u7684\u5E73\u5747\u80FD\u91CF\u7EA6 200 MeV", "\u516C\u5F00\u6559\u79D1\u4E66\u4E2D\u7684\u5E73\u5747\u88C2\u53D8\u80FD", "\u53EA\u7ED9\u5E73\u5747\u80FD\u91CF\u5E38\u6570\uFF0C\u4E0D\u662F\u4E34\u754C\u6216\u51E0\u4F55\u8BA1\u7B97", "n=1:1:5:\u2014", "200*n/n", "Q", "MeV", "principle"),
  r10("\u6838\u7269\u7406\xB7\u805A\u53D8", "\u52B3\u900A\u4E09\u4E58\u79EF n \u03C4 T", "Lawson \u5224\u636E", "\u516C\u5F00\u5224\u636E\u7684\u4E58\u79EF\uFF0C\u4E0D\u662F\u88C5\u7F6E\u8BBE\u8BA1", "nn=1e20:1e16:1e22:1/m3,tau=1:0.001:100:s,T=10:1:40:keV", "nn*tau*T", "n\u03C4T", "keV\xB7s/m\xB3", "principle"),
  r10("\u6838\u7269\u7406\xB7\u94FE\u5F0F\u53CD\u5E94", "\u56DB\u56E0\u5B50 k=\u03B7 \u03B5 p f", "\u65E0\u9650\u4ECB\u8D28\u56DB\u56E0\u5B50\u516C\u5F0F", "\u5B9A\u4E49\u5F0F\uFF0C\u4E0D\u8BA1\u7B97\u4E34\u754C\u8D28\u91CF\u6216\u51E0\u4F55", "eta=1.3:0:2.5:\u2014,eps=1:0.5:1.2:\u2014,p=0.8:0:1:\u2014,f=0.9:0:1:\u2014", "eta*eps*p*f", "k", "\u2014", "principle"),
  r10("\u6838\u7269\u7406\xB7\u4E2D\u5B50\u6269\u6563", "\u6269\u6563\u957F\u5EA6 L=\u221A(D/\u03A3a)", "\u5355\u7FA4\u6269\u6563", "\u5747\u5300\u4ECB\u8D28\u7684\u6269\u6563\u957F\u5EA6\u5B9A\u4E49\uFF0C\u4E0D\u662F\u4E34\u754C\u5C3A\u5BF8", "D=1:0.01:10:cm,Sa=0.05:0.001:2:1/cm", "sqrt(D/Sa)", "L", "cm", "principle"),
  r10("\u751F\u7269\u7269\u7406\xB7\u795E\u7ECF\u52A8\u4F5C\u7535\u4F4D", "\u5CF0\u7535\u4F4D\u8D8B\u8FD1\u94A0\u5E73\u8861\u7535\u4F4D E_Na=(RT/F) ln(Na_o/Na_i)", "Nernst \u94A0\u7535\u4F4D", "\u5CF0\u503C\u9644\u8FD1\u7684\u5E73\u8861\u7535\u4F4D\uFF0C\u4E0D\u662F\u5168\u5957 Hodgkin\u2013Huxley\uFF0C\u4E5F\u4E0D\u662F\u523A\u6FC0\u65B9\u6848\u3002\u7B49\u4EF7\u6307\u6570\u6309\u53CC\u7CBE\u5EA6\u8BA1\u7B97\uFF0C\u4E0D\u5728 \xB140 \u5904\u622A\u65AD", "Nao=145:1:200:mM,Nai=12:1:50:mM,T=310:290:320:K", "(Rgas*T/96485)*ln(Nao/Nai)*1000", "E_Na", "mV"),
  r10("\u751F\u7269\u7269\u7406\xB7\u819C\u8FD0\u8F93", "Goldman\uFF1AV_m=(RT/F) ln((Pk Ko+Pna Nao)/(Pk Ki+Pna Nai))", "Goldman\u2013Hodgkin\u2013Katz", "\u53EA\u542B K \u4E0E Na\u3001\u5FFD\u7565\u6C2F", "Pk=1:0:5:\u2014,Pna=0.05:0:1:\u2014,Ko=4:0.1:20:\u2014,Ki=140:1:200:\u2014,Nao=145:1:200:\u2014,Nai=15:1:50:\u2014,T=310:290:320:K", "(Rgas*T/96485)*ln((Pk*Ko+Pna*Nao)/(Pk*Ki+Pna*Nai))*1000", "Vm", "mV"),
  r10("\u751F\u7269\u7269\u7406\xB7\u751F\u7269\u819C", "\u819C\u7535\u5BB9 C=Cm A\uFF0C\u53CC\u5C42 Cm\u22480.01 F/m\xB2", "\u751F\u7269\u819C\u6BD4\u7535\u5BB9", "\u6BD4\u7535\u5BB9\u53D6\u5178\u578B\u503C", "A=1e-10:1e-14:1e-6:m2,Cm=0.01:0.001:0.05:F/m2", "Cm*A", "C", "F"),
  r10("\u6982\u7387\u7EDF\u8BA1\xB7\u5047\u8BBE\u68C0\u9A8C", "z=(x\u0304\u2212\u03BC)/(\u03C3/\u221An)", "\u6B63\u6001\u5747\u503C\u68C0\u9A8C\u7EDF\u8BA1\u91CF", "\u5DF2\u77E5\u65B9\u5DEE", "xbar=1.2:-5:5:\u2014,mu=1:-5:5:\u2014,sig=1:0.05:5:\u2014,n=25:2:500:\u2014", "(xbar-mu)/(sig/sqrt(n))", "z", "\u2014"),
  r10("\u6982\u7387\u7EDF\u8BA1\xB7\u56DE\u5F52", "\u4E24\u70B9\u659C\u7387 b=(y2\u2212y1)/(x2\u2212x1)", "\u8FC7\u4E24\u70B9\u7684\u76F4\u7EBF", "\u6070\u597D\u4E24\u4E2A\u89C2\u6D4B\u65F6\u6700\u5C0F\u4E8C\u4E58\u659C\u7387\u5373\u6B64", "y2=3:-20:20:\u2014,y1=1:-20:20:\u2014,x2=2:-20:20:\u2014,x1=0:-20:20:\u2014", "(y2-y1)/(x2-x1)", "b", "\u2014"),
  r10("\u6982\u7387\u7EDF\u8BA1\xB7\u9A6C\u5C14\u53EF\u592B\u94FE", "\u4E24\u72B6\u6001\u5E73\u7A33\u5206\u5E03 \u03C01=p21/(p12+p21)", "\u6709\u9650\u9A6C\u5C14\u53EF\u592B\u94FE", "\u4E24\u72B6\u6001\u3001\u4E0D\u53EF\u7EA6", "p12=0.2:0.01:1:\u2014,p21=0.3:0.01:1:\u2014", "p21/(p12+p21)", "\u03C01", "\u2014"),
  r10("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u7535\u6C60", "\u7AEF\u7535\u538B V=E\u2212I r", "\u7535\u6C60\u7AEF\u7535\u538B", "\u5185\u963B r\u3001\u653E\u7535\u7535\u6D41 I", "E=1.5:0:5:V,I=0.2:0:10:A,rr=0.5:0:10:ohm", "E-I*rr", "V", "V"),
  r10("\u5E73\u8861\u4E0E\u7535\u5316\u5B66\xB7\u71C3\u6599\u7535\u6C60", "\u6C22\u6C27\u7535\u6C60 E=1.23+(RT/2F) ln(p_H2 p_O2^{1/2})", "Nernst \u65B9\u7A0B\u7528\u4E8E H2/O2", "\u6807\u51C6\u6001 1.23 V\uFF0C\u5206\u538B\u7528 bar\uFF0C\u4E0D\u662F\u7535\u5806\u8BBE\u8BA1\u3002\u7B49\u4EF7\u6307\u6570\u6309\u53CC\u7CBE\u5EA6\u8BA1\u7B97\uFF0C\u4E0D\u5728 \xB140 \u5904\u622A\u65AD", "T=298:280:400:K,pH2=1:0.01:5:bar,pO2=1:0.01:5:bar", "1.23+(Rgas*T/(2*96485))*ln(pH2*sqrt(pO2))", "E", "V"),
  r10("\u6C14\u5019\xB7\u5927\u6C14\u8F90\u5C04", "\u51FA\u5C04\u957F\u6CE2 \u03B5 \u03C3 T\u2074", "\u65AF\u7279\u85E9-\u73BB\u5C14\u5179\u66FC", "\u7070\u4F53", "eps=0.6:0:1:\u2014,T=255:200:320:K", "eps*sigmaSB*T^4", "OLR", "W/m\xB2"),
  r10("\u6C14\u5019\xB7\u6D77\u6D0B\u73AF\u6D41", "\u5730\u8F6C\u5E73\u8861 v=(1/(\u03C1 f)) \u2202p/\u2202x", "\u5730\u8F6C\u6D41", "\u4E2D\u7EAC\u5EA6\u3001\u7A33\u6001", "dpdx=0.001:0:0.05:Pa/m,rho=1025:1000:1050:kg/m3,f=0.0001:1e-5:0.0002:1/s", "dpdx/(rho*f)", "v", "m/s"),
  r10("\u6C14\u5019\xB7\u6C14\u5019\u80FD\u91CF\u5E73\u8861", "\u4E00\u5C42\u5927\u6C14\uFF1A\u03C3 Ts\u2074 = (S/4)(1\u2212A)/(1\u2212\u03B5/2)", "\u5355\u5C42\u7070\u4F53\u5927\u6C14\u80FD\u91CF\u5E73\u8861", "\u5168\u7403\u5E73\u5747\u3001\u5927\u6C14\u5BF9\u592A\u9633\u900F\u660E", "S=1361:1000:1500:W/m2,A=0.3:0:0.8:\u2014,eps=0.8:0:1:\u2014", "((S/4)*(1-A)/(1-eps/2)/sigmaSB)^0.25", "Ts", "K")
];

// js/lab/topicRows.js
var ROWS = [
  ...MECH,
  ...FIELDS,
  ...MODERN,
  ...CS,
  ...SYS,
  ...ENG,
  ...ENGB,
  ...ENGC,
  ...ENGD,
  ...IDS,
  ...FIX
];

// js/lab/topicOverrides.js
function exprUsesClock(expr) {
  return /(?:^|[^A-Za-z0-9_])t(?:[^A-Za-z0-9_]|$)/.test(String(expr || ""));
}
function assertClockParam(key, params) {
  if (params && Object.prototype.hasOwnProperty.call(params, "t")) {
    throw new Error(`clock whitelist: parameter "t" is reserved for simulation time (${key})`);
  }
}
var table = /* @__PURE__ */ new Map();
for (const row of ROWS) {
  const [key, equation, authority, assumptions, params, expr, label, unit, fidelity] = row;
  if (table.has(key)) throw new Error(`duplicate override ${key}`);
  table.set(key, { equation, authority, assumptions, params, expr, label, unit, fidelity: fidelity || "principle" });
}
function toOptions(rec, key) {
  const parsed = parseParamLine(rec.params);
  assertClockParam(key, parsed.params);
  if (key === "\u519C\u4E1A\u8239\u8236\u6C7D\u8F66\xB7\u704C\u6E89") {
    if (parsed.schema.A) parsed.schema.A = { ...parsed.schema.A, label: "\u9762\u79EF A" };
    if (parsed.schema.d) parsed.schema.d = { ...parsed.schema.d, label: "\u6C34\u6DF1 d" };
  }
  return {
    equation: rec.equation,
    authority: rec.authority,
    assumptions: rec.assumptions,
    fidelity: rec.fidelity,
    params: parsed.params,
    schema: parsed.schema,
    tick(state) {
      const env = { ...state.params };
      if (exprUsesClock(rec.expr)) env.t = state.t || 0;
      state.y = evalExpr(rec.expr, env);
    },
    plot: (s) => s.y,
    rows: (s) => {
      const out = [[rec.label, s.y, rec.unit || ""]];
      for (const [k, meta] of Object.entries(parsed.schema || {})) {
        if (k === "speed" || meta?.group === "display") continue;
        if (typeof s.params?.[k] === "number") {
          out.push([k, s.params[k], meta.unit || ""]);
        }
      }
      return out;
    }
  };
}
function overrideOptions(spec) {
  if (!spec) return null;
  const formula = String(spec.formula || "");
  if (formula.includes("\xB7")) {
    const prefix = formula.split("\xB7")[0].trim();
    const topic = formula.split("\xB7").slice(1).join("\xB7").trim();
    const key = `${prefix}\xB7${topic}`;
    const hit = table.get(key);
    if (hit) return toOptions(hit, key);
  }
  const idKey = `id:${spec.id}`;
  const byId = table.get(idKey);
  return byId ? toOptions(byId, idKey) : null;
}
function overrideKeyCount() {
  return table.size;
}
function topicKeyFromFormula(formula) {
  const text = String(formula || "");
  if (!text.includes("\xB7")) return "";
  const prefix = text.split("\xB7")[0].trim();
  const topic = text.split("\xB7").slice(1).join("\xB7").trim();
  if (!prefix || !topic) return "";
  return `${prefix}\xB7${topic}`;
}
function overrideRecord(key) {
  return table.get(key) || null;
}
function topicMissNote(formula) {
  const key = topicKeyFromFormula(formula);
  if (!key || table.has(key)) return "";
  return `\u672A\u547D\u4E2D\u4E3B\u9898\u952E\u300C${key}\u300D`;
}

export {
  exprUsesClock,
  assertClockParam,
  overrideOptions,
  overrideKeyCount,
  topicKeyFromFormula,
  overrideRecord,
  topicMissNote
};

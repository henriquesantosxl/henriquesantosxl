// Generates the profile SVGs (light + dark) into ../assets.
// Run: node scripts/build-svgs.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "assets");
mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- themes
const THEMES = {
  light: {
    bg: "#ffffff", bar: "#f6f8fa", border: "#d0d7de", tile: "#f6f8fa",
    text: "#1f2328", muted: "#59636e", faint: "#818b98",
    user: "#1a7f37", path: "#0969da", accent: "#8250df", quote: "#953800",
    chipBg: "#fbefff", chipText: "#8250df",
    iconFix: {
      n8n:    [["<path ", '<path fill="#ea4b71" ']],
      openai: [["<path ", '<path fill="#374151" ']],
    },
  },
  dark: {
    bg: "#0d1117", bar: "#161b22", border: "#30363d", tile: "#161b22",
    text: "#e6edf3", muted: "#9198a1", faint: "#656c76",
    user: "#3fb950", path: "#4493f8", accent: "#a371f7", quote: "#ffa657",
    chipBg: "#2a1f45", chipText: "#d2a8ff",
    iconFix: {
      github: [["#181616", "#e6edf3"]],
      n8n:    [["<path ", '<path fill="#ea4b71" ']],
      openai: [["<path ", '<path fill="#e6edf3" ']],
    },
  },
};

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------- icons
let uid = 0;
function icon(name, x, y, size, t) {
  let src = readFileSync(join(here, "icons", `${name}.svg`), "utf8");
  for (const [from, to] of t.iconFix[name] ?? []) src = src.split(from).join(to);
  const viewBox = src.match(/viewBox="([^"]+)"/)[1];
  let inner = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>[\s\S]*?<\/title>/, "");
  const p = `i${uid++}_`;
  inner = inner
    .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}">${inner}</svg>`;
}

// ---------------------------------------------------------------- window chrome
function chrome(w, h, title, t) {
  return `
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <path d="M0.5 40 V12.5 A12 12 0 0 1 12.5 0.5 H${w - 12.5} A12 12 0 0 1 ${w - 0.5} 12.5 V40 Z" fill="${t.bar}"/>
  <line x1="0.5" y1="40" x2="${w - 0.5}" y2="40" stroke="${t.border}"/>
  <circle cx="22" cy="20.5" r="6" fill="#ff5f57"/><circle cx="42" cy="20.5" r="6" fill="#febc2e"/><circle cx="62" cy="20.5" r="6" fill="#28c840"/>
  <text x="${w / 2}" y="25" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${t.muted}">${esc(title)}</text>`;
}

function svgDoc(w, h, label, body, extraStyle = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  <style>
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes blink { 50% { fill-opacity: 0; } }${extraStyle}
  </style>${body}
</svg>
`;
}

// prompt line: henrique@limoeiro:~$ cmd
function prompt(x, y, cmd, t, path = "~", cursor = false) {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="14" xml:space="preserve"><tspan fill="${t.user}" font-weight="700">henrique@limoeiro</tspan><tspan fill="${t.muted}">:</tspan><tspan fill="${t.path}" font-weight="700">${esc(path)}</tspan><tspan fill="${t.muted}">$ </tspan><tspan fill="${t.text}">${esc(cmd)}</tspan>${cursor ? `<tspan class="cursor" fill="${t.text}">█</tspan>` : ""}</text>`;
}

// rich line: "{h:...}" = highlight, "{q:...}" = quote, "{m:...}" = muted, "{b:...}" = bold
function rich(x, y, line, t, size = 14) {
  const parts = [];
  const re = /\{([hqmb]):([^}]*)\}/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(["", line.slice(last, m.index)]);
    parts.push([m[1], m[2]]);
    last = re.lastIndex;
  }
  if (last < line.length) parts.push(["", line.slice(last)]);
  const span = ([k, s]) => {
    const attrs = {
      "": `fill="${t.text}"`,
      h: `fill="${t.accent}" font-weight="700"`,
      q: `fill="${t.quote}" font-style="italic"`,
      m: `fill="${t.muted}"`,
      b: `fill="${t.text}" font-weight="700"`,
    }[k];
    return `<tspan ${attrs}>${esc(s)}</tspan>`;
  };
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" xml:space="preserve">${parts.map(span).join("")}</text>`;
}

// ---------------------------------------------------------------- aboutme
function aboutme(t) {
  const W = 840, X = 32, LH = 23;
  let y = 76;
  const rows = [];
  rows.push(prompt(X, y, "whoami", t)); y += LH + 14;
  rows.push(`<text x="${X}" y="${y}" font-family="${MONO}" font-size="24" font-weight="700" fill="${t.text}">Henrique Santos</text>`); y += 26;
  rows.push(rich(X, y, "{h:Full-stack developer} {m:·} JavaScript / TypeScript {m:·} Limoeiro, PE, Brazil", t)); y += LH + 12;
  const body = [
    "{m:>} I'm an {h:Information Systems student} at {h:UPE},",
    "  the University of Pernambuco, building full-stack apps",
    "  with {h:JavaScript}, {h:TypeScript} and {h:Node.js}.",
    "",
    "{m:>} Born and raised in {h:Limoeiro, Pernambuco}, in the northeast of Brazil,",
    "  where I work as a {h:Junior Developer} at {h:SEPTEM}.",
    "",
    "{m:>} Off the keyboard: {h:footvolley} on the beach, {h:surfing}",
    "  and always chasing the next perfect wave.",
  ];
  for (const line of body) {
    if (line) rows.push(rich(X, y, line, t));
    y += line ? LH : 10;
  }
  y += 20;
  rows.push(prompt(X, y, "", t, "~", true));
  const H = y + 30;
  return svgDoc(W, H, "whoami: Henrique Santos, full-stack developer (JavaScript / TypeScript), Information Systems student at UPE, from Limoeiro, PE",
    chrome(W, H, "henrique@limoeiro: ~", t) + "\n  " + rows.join("\n  "));
}

// ---------------------------------------------------------------- stack
const STACK = [
  ["ls ./main-stack", [
    ["react", "React"], ["nodejs", "Node.js"], ["javascript", "JavaScript"], ["typescript", "TypeScript"],
    ["n8n", "N8N"], ["git", "Git"], ["github", "GitHub"],
  ]],
  ["ls ./also-comfortable-with", [
    ["java", "Java"], ["python", "Python"], ["postgresql", "PostgreSQL"],
  ]],
  ["ls ./currently-learning", [
    ["flutter", "Flutter"], ["dart", "Dart"], ["openai", "AI / LLMs"],
  ]],
];

function stack(t) {
  const W = 840, X = 32, BASE_CELL = (W - 2 * X) / 10, TILE = 58, ICON = 34;
  let y = 76;
  const rows = [];
  for (const [cmd, items] of STACK) {
    rows.push(prompt(X, y, cmd, t, "~/stack"));
    y += 18;
    const groupW = items.length * BASE_CELL;
    const startX = X + (W - 2 * X - groupW) / 2;
    items.forEach(([name, label], i) => {
      const cx = startX + BASE_CELL * i + BASE_CELL / 2;
      rows.push(`<rect x="${cx - TILE / 2}" y="${y}" width="${TILE}" height="${TILE}" rx="12" fill="${t.tile}" stroke="${t.border}"/>`);
      rows.push(icon(name, cx - ICON / 2, y + (TILE - ICON) / 2, ICON, t));
      rows.push(`<text x="${cx}" y="${y + TILE + 18}" text-anchor="middle" font-family="${MONO}" font-size="11.5" fill="${t.muted}">${esc(label)}</text>`);
    });
    y += TILE + 18 + 40;
  }
  const H = y - 16;
  return svgDoc(W, H, "Tech stack: React, Node.js, JavaScript, TypeScript, N8N, Git, GitHub. Also Java, Python, PostgreSQL. Learning Flutter, Dart, AI/LLMs.",
    chrome(W, H, "henrique@limoeiro: ~/stack", t) + "\n  " + rows.join("\n  "));
}

// ---------------------------------------------------------------- contact buttons
const CONTACTS = [
  { file: "contact-linkedin", icon: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { file: "contact-instagram", icon: "instagram", label: "@henriquecdsdev", color: "#E4405F" },
];

function contact(c, t) {
  const W = Math.round(c.label.length * 8.4 + 62), H = 40;
  let ic = icon(c.icon, 14, 10, 20, t);
  if (c.color) ic = ic.replace("<path ", `<path fill="${c.color}" `);
  return svgDoc(W, H, c.label, `
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.bar}" stroke="${t.border}"/>
  ${ic}
  <text x="44" y="25" font-family="${MONO}" font-size="14" font-weight="700" fill="${t.text}">${esc(c.label)}</text>`);
}

// ---------------------------------------------------------------- write
for (const [mode, t] of Object.entries(THEMES)) {
  writeFileSync(join(out, `aboutme-${mode}.svg`), aboutme(t));
  writeFileSync(join(out, `stack-${mode}.svg`), stack(t));
  for (const c of CONTACTS) writeFileSync(join(out, `${c.file}-${mode}.svg`), contact(c, t));
}
console.log("ok");

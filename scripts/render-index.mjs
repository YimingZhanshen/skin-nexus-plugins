#!/usr/bin/env node
// render-index.mjs — generate a crawler-visible static HTML index from the
// signed marketplace registry. Plain Node, no npm dependencies, no network,
// no signing: it only READS registry JSON files and WRITES one HTML file.
// The registry itself is never touched (byte-for-byte identical output).
//
// Usage:
//   node scripts/render-index.mjs [path/to/registry.json] [--out path/to/index.html]
//
// Default registry: v1/registry.json (relative to the current directory);
// default output: index.html next to the registry (so the default invocation
// writes v1/index.html, the directory GitHub Pages serves).
//
// Theme packages live in a second registry (themes/v1/registry.json, produced
// by scripts/sign-themes.sh). When the main registry sits at <root>/v1/
// registry.json and <root>/themes/v1/registry.json exists, themes are read
// from it and rendered as their own section. If it does not exist, no theme
// section is emitted — the page never shows entries that are not in a
// registry.
//
// Data discipline: every visible value comes from the registry verbatim.
// Optional fields (license, author, minServer, changelog, ...) are rendered
// only when actually present; nothing is fabricated or defaulted.
//
// Language choice: <html lang="zh-CN">. Verified against the registry
// contents: every plugin package carries title/description maps that include
// a zh-CN locale (alongside en), and every theme package carries ONLY a
// zh-CN locale. zh-CN is therefore the one language present for all entries,
// and the host project's marketplace metadata is Chinese-first; the page
// still renders the en strings for each plugin entry beside them.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";

const argv = process.argv.slice(2);
const outFlag = argv.indexOf("--out");
const outPath = outFlag === -1 ? null : resolve(argv[outFlag + 1]);
const positional = argv.filter((a, i) => a !== "--out" && i !== outFlag + 1);
const registryPath = resolve(positional[0] ?? "v1/registry.json");

/** Load a registry JSON; throws with a clear message on any problem. */
function readRegistry(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`render-index: cannot read registry ${path}: ${err.message}`);
    process.exit(1);
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    console.error(`render-index: registry ${path} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(doc.packages)) {
    console.error(`render-index: registry ${path} has no "packages" array`);
    process.exit(1);
  }
  return doc;
}

const registry = readRegistry(registryPath);

// Theme registry lives at <root>/themes/v1/registry.json when the main
// registry is at <root>/v1/registry.json. Discovered relatively so the
// default paths in sign-market.sh keep working from the repo root.
const repoRoot = dirname(dirname(registryPath));
const themeRegistryPath = join(repoRoot, "themes", "v1", "registry.json");
const themeRegistry = existsSync(themeRegistryPath) ? readRegistry(themeRegistryPath) : null;

const htmlEscape = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// JSON inside a <script> block: a literal "</script>" inside a string would
// close the element early; JSON does not require raw "<" or "/".
const jsonSafe = (s) => s.replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/**
 * Pick a display string from a localized map (title/description).
 * zh-CN first (page language), then en, then any locale — never a made-up value.
 */
function pickLocalized(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    for (const key of ["zh-CN", "en", ...Object.keys(value)]) {
      const v = value[key];
      if (typeof v === "string" && v.trim() !== "") return v;
    }
  }
  return null;
}

/** Normalize one registry package into renderable fields (only real data). */
function toEntry(pkg) {
  const description = pickLocalized(pkg.description);
  const dist = pkg.dist && typeof pkg.dist === "object" ? pkg.dist : null;
  return {
    name: typeof pkg.name === "string" ? pkg.name : null,
    version: typeof pkg.version === "string" ? pkg.version : null,
    titleZh: pkg.title && typeof pkg.title["zh-CN"] === "string" ? pkg.title["zh-CN"] : null,
    titleEn: pkg.title && typeof pkg.title.en === "string" ? pkg.title["en"] : null,
    descZh: pkg.description && typeof pkg.description["zh-CN"] === "string" ? pkg.description["zh-CN"] : null,
    descEn: pkg.description && typeof pkg.description.en === "string" ? pkg.description["en"] : null,
    fallbackDescription: description,
    author: typeof pkg.author === "string" && pkg.author ? pkg.author : null,
    license: typeof pkg.license === "string" && pkg.license ? pkg.license : null,
    minServer: typeof pkg.minServer === "string" && pkg.minServer ? pkg.minServer : null,
    changelog: typeof pkg.changelog === "string" && pkg.changelog ? pkg.changelog : null,
    capabilities: Array.isArray(pkg.capabilities) ? pkg.capabilities.filter((c) => typeof c === "string") : null,
    url: dist && typeof dist.url === "string" && dist.url ? dist.url : null,
    size: dist && Number.isFinite(dist.size) ? dist.size : null,
    sha256: dist && typeof dist.sha256 === "string" && dist.sha256 ? dist.sha256 : null,
  };
}

const plugins = registry.packages.map(toEntry);
const themes = themeRegistry ? themeRegistry.packages.map(toEntry) : [];

/** Render one entry as an <article>. Every field is presence-guarded. */
function renderEntry(e, kindLabel) {
  const lines = [];
  const displayTitle = e.titleZh || e.titleEn || e.name || "(unnamed)";
  const versionText = e.version ? ` <span class="version">v${htmlEscape(e.version)}</span>` : "";
  lines.push(`<article class="entry">`);
  lines.push(`  <h3>${htmlEscape(displayTitle)}${versionText}<span class="kind">${kindLabel}</span></h3>`);
  if (e.name && e.name !== displayTitle) {
    lines.push(`  <p class="slug"><code>${htmlEscape(e.name)}</code></p>`);
  }
  if (e.titleEn && e.titleEn !== displayTitle) {
    lines.push(`  <p class="title-en">${htmlEscape(e.titleEn)}</p>`);
  }
  if (e.descZh) lines.push(`  <p class="desc">${htmlEscape(e.descZh)}</p>`);
  if (e.descEn) lines.push(`  <p class="desc desc-en">${htmlEscape(e.descEn)}</p>`);
  const meta = [];
  if (e.author) meta.push(`<span>作者/Author: ${htmlEscape(e.author)}</span>`);
  if (e.license) meta.push(`<span>许可证/License: ${htmlEscape(e.license)}</span>`);
  if (e.minServer) meta.push(`<span>要求服务端/Requires server: ${htmlEscape(e.minServer)}</span>`);
  if (meta.length) lines.push(`  <p class="meta">${meta.join(" · ")}</p>`);
  if (e.capabilities && e.capabilities.length) {
    lines.push(`  <p class="caps">能力/Capabilities: ${e.capabilities.map(htmlEscape).join(", ")}</p>`);
  }
  if (e.changelog) lines.push(`  <p class="changelog">更新/Changelog: ${htmlEscape(e.changelog)}</p>`);
  if (e.url) {
    let linkNote = "";
    const facts = [];
    if (e.size !== null) facts.push(`${e.size} bytes`);
    if (e.sha256) facts.push(`sha256 ${e.sha256}`);
    if (facts.length) linkNote = ` <span class="dist">(${facts.join(", ")})</span>`;
    lines.push(`  <p class="download"><a href="${htmlEscape(e.url)}">${htmlEscape(e.url.split("/").pop() || "artifact")}</a>${linkNote}</p>`);
  }
  lines.push(`</article>`);
  return lines.join("\n");
}

// JSON-LD ItemList: only properties backed by real registry fields. No Offer
// (the market is free/open-source and the registry carries no price), no
// FAQPage, no invented properties; absent source fields are omitted.
function toLdItem(e, position) {
  const item = { "@type": "SoftwareApplication", name: e.titleZh || e.titleEn || e.name };
  if (e.name) item.identifier = e.name;
  if (e.version) item.softwareVersion = e.version;
  const desc = e.descZh || e.descEn || e.fallbackDescription;
  if (desc) item.description = desc;
  if (e.author) item.author = { "@type": "Organization", name: e.author };
  if (e.license) item.license = e.license;
  if (e.minServer) item.softwareRequirements = e.minServer;
  if (e.url) {
    item.downloadUrl = e.url;
    item.url = e.url;
  }
  return { "@type": "ListItem", position, item };
}

const ldList = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "SkinNexus 插件与主题市场 / SkinNexus plugin and theme market",
  numberOfItems: plugins.length + themes.length,
  itemListElement: [...plugins, ...themes].map((e, i) => toLdItem(e, i + 1)),
};

const generatedAt = typeof registry.generatedAt === "string" ? registry.generatedAt : null;
const countsNote = themeRegistry
  ? `${plugins.length} 个插件 · ${themes.length} 个主题`
  : `${plugins.length} 个插件`;

const sections = [];
sections.push(`<section id="plugins">\n<h2>插件 Plugins</h2>`);
sections.push(plugins.map((e) => renderEntry(e, "插件")).join("\n"));
sections.push(`</section>`);
if (themeRegistry) {
  sections.push(`<section id="themes">\n<h2>主题 Themes</h2>`);
  sections.push(themes.map((e) => renderEntry(e, "主题")).join("\n"));
  sections.push(`</section>`);
}

const html = `<!DOCTYPE html>
<!-- Generated by scripts/render-index.mjs from ${htmlEscape(relativeForDoc(registryPath))}${themeRegistry ? ` and ${htmlEscape(relativeForDoc(themeRegistryPath))}` : ""}. Do not edit by hand. -->
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SkinNexus 插件与主题市场 / Plugin &amp; Theme Market</title>
<meta name="description" content="SkinNexus 官方插件与主题市场索引（由签名 registry.json 生成）：${htmlEscape(countsNote)}，含名称、版本、描述、作者与制品下载地址。Generated from the signed registry — ${htmlEscape(countsNote)} with name, version, description, author and artifact links.">
<link rel="alternate" type="application/json" href="${htmlEscape(relativeForDoc(registryPath))}" title="registry.json">
<style>
:root { color-scheme: light dark; --fg: #1c1e21; --muted: #61656b; --line: #d9dce1; --accent: #2b6cb0; }
@media (prefers-color-scheme: dark) { :root { --fg: #e6e8ea; --muted: #9aa0a8; --line: #3a3e45; --accent: #7ab3ff; } }
body { font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; margin: 0; color: var(--fg); background: transparent; }
main { max-width: 880px; margin: 0 auto; padding: 24px 20px 64px; }
h1 { font-size: 26px; margin: 8px 0 4px; }
h2 { font-size: 20px; margin: 32px 0 12px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
h3 { font-size: 16px; margin: 0 0 6px; }
.lede { color: var(--muted); margin: 0 0 8px; }
.entry { border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin: 12px 0; }
.version { color: var(--muted); font-weight: normal; font-size: 13px; }
.kind { float: right; color: var(--muted); font-size: 12px; font-weight: normal; }
.slug, .title-en, .meta, .caps, .changelog, .dist-note { color: var(--muted); font-size: 13px; margin: 4px 0; }
.desc { margin: 6px 0; }
.download a { color: var(--accent); overflow-wrap: anywhere; }
.dist { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
footer { color: var(--muted); font-size: 13px; margin-top: 40px; border-top: 1px solid var(--line); padding-top: 12px; }
a { overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
<h1>SkinNexus 插件与主题市场</h1>
<p class="lede">本页由已签名的 <code>registry.json</code> 静态生成，条目与签名清单一致；制品以 Ed25519 签名，安装时由服务端校验。</p>
<p class="lede">This page is generated from the signed <code>registry.json</code>; every entry below mirrors the manifest. Artifacts are Ed25519-signed and verified by the server on install.</p>
${sections.join("\n")}
<footer>
<p>清单数据 / Manifest: <a href="${htmlEscape(relativeForDoc(registryPath))}">${htmlEscape(relativeForDoc(registryPath))}</a>${themeRegistry ? ` · <a href="${htmlEscape(relativeForDoc(themeRegistryPath))}">${htmlEscape(relativeForDoc(themeRegistryPath))}</a>` : ""}</p>
<p>注册表生成时间 / Registry generatedAt: ${generatedAt ? htmlEscape(generatedAt) : "（registry 未提供 / not present in registry）"}</p>
</footer>
</main>
<script type="application/ld+json">
${jsonSafe(JSON.stringify(ldList, null, 2))}
</script>
</body>
</html>
`;

function relativeForDoc(absPath) {
  // Links in the document are relative to the output file's directory
  // (e.g. from v1/index.html: "registry.json", "../themes/v1/registry.json").
  const outDir = outPath ? dirname(outPath) : dirname(registryPath);
  const rel = relative(outDir, absPath).replaceAll("\\", "/");
  return rel === "" ? absPath : rel;
}

const finalOut = outPath ? resolve(outPath) : join(dirname(registryPath), "index.html");
writeFileSync(finalOut, html, "utf8");
console.log(
  `render-index: wrote ${finalOut} (plugins=${plugins.length}, themes=${themes.length}, total entries=${plugins.length + themes.length})`
);

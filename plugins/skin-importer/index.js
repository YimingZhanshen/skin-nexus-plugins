// skin-importer: Mojang / Blessing single-skin import.
// All network access goes through the host's scoped net.get; all writes go
// through the host account bridge. This file only parses and maps.

var MAX_DESC = 50;

function b64decode(s) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var clean = String(s || "").replace(/[^A-Za-z0-9+/=]/g, "");
  var out = "";
  var i = 0;
  while (i < clean.length) {
    var c1 = chars.indexOf(clean.charAt(i++));
    var c2 = chars.indexOf(clean.charAt(i++));
    var c3 = chars.indexOf(clean.charAt(i++));
    var c4 = chars.indexOf(clean.charAt(i++));
    var n = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);
    out += String.fromCharCode((n >> 16) & 255);
    if (c3 !== 64 && c3 !== -1) out += String.fromCharCode((n >> 8) & 255);
    if (c4 !== 64 && c4 !== -1) out += String.fromCharCode(n & 255);
  }
  return out;
}

function fail(status, code, message) {
  return { status: status, body: { error: code, message: message } };
}

function hostError(res) {
  var e = (res && res.error) || {};
  return fail(502, e.code || "import.upstream_unavailable", e.message || "upstream request failed");
}

function fetchText(url) {
  var res = skin.net.get(url);
  if (!res || res.ok !== true) return hostError(res);
  return { status: res.data.status, text: b64decode(res.data.bodyBase64), res: res };
}

function fetchJSON(url) {
  var r = fetchText(url);
  if (r.status && r.text === undefined) return r;
  if (!r.text) return { status: r.status };
  try {
    return { status: r.status, data: JSON.parse(r.text) };
  } catch (e) {
    // Non-2xx upstream HTML/404 pages must keep their status so callers can
    // return not_found/private instead of a generic bad_upstream.
    return { status: r.status };
  }
}

function truncateDesc(s) {
  s = String(s || "").trim();
  return s.length > MAX_DESC ? s.slice(0, MAX_DESC) : s;
}

function importPNG(typ, model, desc, b64) {
  var res = skin.textures.importBase64(typ, model, desc, b64);
  if (!res || res.ok !== true) {
    var e = (res && res.error) || {};
    return { error: e };
  }
  return { texture: res.data };
}

function applyPlayer(playerId, slot, tid) {
  var pid = Number(playerId);
  if (!pid) return null;
  var res = skin.players.setTexture(pid, slot, tid);
  if (!res || res.ok !== true) return { error: (res && res.error) || { code: "player.not_found" } };
  return { ok: true };
}

function playerResult(playerId) {
  if (!playerId) return { applied: {} };
  return { applied: {} };
}

function validatePlayer(playerId) {
  if (!playerId) return null;
  var res = skin.players.list();
  if (!res || res.ok !== true) return "无法读取角色列表";
  var id = Number(playerId);
  for (var i = 0; i < res.data.length; i++) {
    if (Number(res.data[i].id) === id) return null;
  }
  return "角色不存在或不属于当前账号";
}

skin.route("GET", "/players", function () {
  var res = skin.players.list();
  if (!res || res.ok !== true) return { status: 503, body: { error: "player.unavailable" } };
  return { status: 200, body: { players: res.data || [] } };
});

skin.route("POST", "/import/mojang", function (r) {
  var body = r.body || {};
  var username = String(body.username || "").trim();
  var playerId = body.playerId ? Number(body.playerId) : 0;
  if (!/^[A-Za-z0-9_]{1,16}$/.test(username)) {
    return fail(400, "import.invalid_username", "请输入 1-16 位 Minecraft 用户名");
  }
  var pErr = validatePlayer(playerId);
  if (pErr) return fail(400, "import.player_not_found", pErr);

  var lookup = fetchJSON("https://api.mojang.com/users/profiles/minecraft/" + encodeURIComponent(username));
  if (lookup.status !== undefined && lookup.data === undefined) return lookup;
  if (lookup.status === 204 || !lookup.data || !lookup.data.id) {
    return fail(404, "import.not_found", "未找到该正版用户名");
  }
  var uuid = String(lookup.data.id);
  var profile = fetchJSON("https://sessionserver.mojang.com/session/minecraft/profile/" + uuid);
  if (profile.status !== undefined && profile.data === undefined) return profile;
  var props = (profile.data && profile.data.properties) || [];
  var texturesProp = null;
  for (var i = 0; i < props.length; i++) {
    if (props[i] && props[i].name === "textures") { texturesProp = props[i]; break; }
  }
  if (!texturesProp) return fail(404, "import.no_textures", "该账号没有公开皮肤/披风");
  var decoded;
  try { decoded = JSON.parse(b64decode(texturesProp.value)); }
  catch (e) { return fail(502, "import.bad_upstream", "无法解析 Mojang 纹理信息"); }
  var textures = decoded.textures || {};
  var imported = [];
  var applied = {};

  function doOne(kind, tex) {
    if (!tex || !tex.url) return null;
    var typ = kind === "CAPE" ? "cape" : "skin";
    var model = typ === "skin" ? String((tex.metadata && tex.metadata.model) || "default") : "";
    if (model !== "slim") model = "default";
    var url = String(tex.url);
    if (!/^https?:\/\/textures\.minecraft\.net\//.test(url)) return { err: "异常纹理地址" };
    var raw = skin.net.get(url);
    if (!raw || raw.ok !== true) return { err: "纹理下载失败" };
    var desc = truncateDesc("Mojang 正版 " + username);
    var got = importPNG(typ, model, desc, raw.data.bodyBase64);
    if (got.error) return { err: got.error.message || "导入失败" };
    imported.push(got.texture);
    if (playerId) {
      var ap = applyPlayer(playerId, typ, got.texture.textureId);
      if (!ap || ap.error) return { err: (ap && ap.error && ap.error.message) || "应用失败" };
      applied[typ] = got.texture.textureId;
    }
    return null;
  }

  var e1 = doOne("SKIN", textures.SKIN);
  if (e1) return fail(502, "import.texture_failed", e1.err);
  var e2 = doOne("CAPE", textures.CAPE);
  if (e2) return fail(502, "import.texture_failed", e2.err);
  if (!imported.length) return fail(404, "import.no_textures", "该账号没有公开皮肤/披风");
  return { status: 200, body: { imported: imported, applied: applied } };
});

skin.route("POST", "/import/blessing", function (r) {
  var body = r.body || {};
  var input = String(body.url || "").trim();
  var playerId = body.playerId ? Number(body.playerId) : 0;
  var m = /^(https:\/\/[^?#]+?)\/skinlib\/show\/([0-9]+)(?:[?#]|$)/.exec(input);
  if (!m) return fail(400, "import.invalid_url", "请提供 https 的 /skinlib/show/{id} 链接");
  var pErr = validatePlayer(playerId);
  if (pErr) return fail(400, "import.player_not_found", pErr);
  var origin = m[1].replace(/\/+$/, "");
  var tid = m[2];
  var info = fetchJSON(origin + "/skinlib/info/" + tid);
  if (info.status !== undefined && info.data === undefined) return info;
  if (info.status === 403 || info.status === 404) {
    return fail(info.status, "import.source_not_found", "源站皮肤不存在或不是公开皮肤");
  }
  var d = info.data || {};
  if (d.public !== true) return fail(403, "import.source_private", "只能导入公开皮肤");
  if (!/^[0-9a-fA-F]{64}$/.test(String(d.hash || ""))) {
    return fail(502, "import.bad_upstream", "源站没有返回有效纹理 hash");
  }
  var srcType = String(d.type || "");
  var typ = "skin", model = "default";
  if (srcType === "cape") { typ = "cape"; model = ""; }
  else if (srcType === "alex") { model = "slim"; }
  else if (srcType !== "steve") {
    return fail(400, "import.unsupported_type", "不支持的皮肤类型");
  }
  var raw = skin.net.get(origin + "/textures/" + d.hash);
  if (!raw || raw.ok !== true) return fail(502, "import.texture_failed", "纹理下载失败");
  var host = origin.replace(/^https:\/\//, "");
  var suffix = " · 来源 " + host + "#" + tid;
  var baseName = String(d.name || ("皮肤 #" + tid));
  var maxBase = MAX_DESC - suffix.length;
  var desc = maxBase > 0 ? (baseName.slice(0, maxBase) + suffix) : suffix.slice(0, MAX_DESC);
  desc = truncateDesc(desc);
  var got = importPNG(typ, model, desc, raw.data.bodyBase64);
  if (got.error) return fail(400, "import.failed", got.error.message || "导入失败");
  var applied = {};
  if (playerId) {
    var ap = applyPlayer(playerId, typ, got.texture.textureId);
    if (!ap || ap.error) return fail(400, "import.apply_failed", "已导入纹理，但应用到角色失败");
    applied[typ] = got.texture.textureId;
  }
  return { status: 200, body: { imported: [got.texture], applied: applied } };
});

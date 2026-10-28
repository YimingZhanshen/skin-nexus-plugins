// avatar-cdn: return an absolute HTTPS URL to delegate rendering. The host
// rejects any host not listed in media.avatarHosts and falls back to PNG.
skin.hooks.onAvatarFilter(function (a) {
  var base = String(skin.config.get("cdnBase") || "").replace(/\/+$/, "");
  if (!base || !a.hash) return undefined;
  return base + "/avatar/" + encodeURIComponent(a.hash) + "/" + a.size + (a.threeD ? ".3d.png" : ".png");
});

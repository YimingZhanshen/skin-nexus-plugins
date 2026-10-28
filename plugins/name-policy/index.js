// name-policy: one reserved-name rule shared by all three identity writes.
function reserved(name) {
  var want = String(name || "").trim().toLowerCase();
  if (!want) return false;
  var raw = String(skin.config.get("reserved") || "");
  var list = raw.split(",");
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]).trim().toLowerCase() === want) return true;
  }
  return false;
}

function deny() {
  return {
    allow: false,
    code: "name_policy.reserved",
    message: String(skin.config.get("message") || "该名称已被保留，请换一个")
  };
}

skin.guards.on("user.registration.check", function (e) {
  var name = e.data && e.data.nickname;
  return reserved(name) ? deny() : { allow: true };
}, { onError: "deny", timeoutMS: 50 });

skin.guards.on("profile.update.check", function (e) {
  var name = e.data && e.data.nickname;
  return reserved(name) ? deny() : { allow: true };
}, { onError: "deny", timeoutMS: 50 });

skin.guards.on("player.rename.check", function (e) {
  return reserved(e.playerName) ? deny() : { allow: true };
}, { onError: "deny", timeoutMS: 50 });

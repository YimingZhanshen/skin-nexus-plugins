// signup-survey: registration guard stashes host-rendered form values under a
// nickname key; the post-commit event moves them to the real user id.
var col = skin.store.collection("survey");

skin.guards.on("user.registration.check", function (e) {
  var data = (e.data && e.data.pluginData && e.data.pluginData["signup-survey"]) || {};
  var nick = String((e.data && e.data.nickname) || "").trim().toLowerCase();
  if (nick) {
    col.put("pending:" + nick, {
      source: String(data.source || ""),
      note: String(data.note || ""),
      at: new Date().toISOString()
    });
  }
  return { allow: true };
}, { onError: "allow", timeoutMS: 50 });

skin.events.on("user.registered", function (e) {
  var nick = String(e.playerName || "").trim().toLowerCase();
  if (!nick || !e.userId) return;
  var pending = col.get("pending:" + nick);
  if (!pending) return;
  col.put(String(e.userId), pending);
  col.delete("pending:" + nick);
});

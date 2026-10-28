// texture-provenance: host-rendered upload fields -> plugin-owned storage ->
// public read route rendered by the SSR skinlib detail slot.
var col = skin.store.collection("provenance");

skin.events.on("texture.uploaded", function (e) {
  var data = (e.data && e.data.pluginData && e.data.pluginData["texture-provenance"]) || {};
  if (!e.hash || (!data.source && !data.credit)) return;
  col.put(e.hash, {
    source: String(data.source || ""),
    credit: String(data.credit || ""),
    userId: e.userId || 0,
    at: new Date().toISOString()
  });
});

skin.route("GET", "/provenance/{hash}", function (r) {
  var doc = col.get(r.params.hash);
  if (!doc) return { status: 404, body: { error: "not found" } };
  return { source: doc.source, credit: doc.credit };
});

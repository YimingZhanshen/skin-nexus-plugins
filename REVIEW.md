# Review checklist

## Correctness

- [ ] Manifest name equals the directory; version is greater than the published one.
- [ ] `market.json.capabilities` equals `plugin.json.permissions`; `requires`/`conflicts`/`minServer` match.
- [ ] Entrypoint exists, is plain JS, and registers exactly the declared routes.
- [ ] UI assets exist for every iframe page/slot.

## Security

- [ ] Permissions are minimal and each one is justified.
- [ ] No network/filesystem/timer access attempts; data only via `skin.store`.
- [ ] No private keys, tokens, passwords, or customer data in code/assets/logs.
- [ ] No obfuscation, `eval` of remote content, or sandbox escape attempts.
- [ ] `media.avatarHosts` contains only hosts the plugin actually needs.
- [ ] Forms do not collect secrets; values are validated by the host schema.

## Behavior

- [ ] Guards set an explicit `onError` policy and a ≤50ms budget.
- [ ] Non-GET session/admin routes enable CSRF.
- [ ] Events are fail-open and do not assume delivery order.
- [ ] Uninstall/disable leaves the host in a working state.

## Privacy and operations

- [ ] Stored data is documented; retention/purge expectations are clear.
- [ ] Logs avoid PII.
- [ ] README (if present) matches the code and permissions.

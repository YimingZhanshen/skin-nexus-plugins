# Security policy

This repository hosts plugin sources and the signed plugin market (registry,
artifacts, signing workflows). Runtime vulnerabilities in the host belong to
the main project: <https://github.com/YimingZhanshen/skin-nexus/security/policy>.

## In scope

- Signature, registry or artifact integrity issues (forged bundles, replay,
  rollback to an older signed version, hash mismatch).
- CI/workflow weaknesses that could expose `market-signing` secrets or let an
  unreviewed artifact reach `v1/`.
- Malicious plugin source that escapes the documented sandbox, reads host data
  it did not declare, or hides behavior from review.
- Credential or personal data leakage in this repository or its artifacts.

## Out of scope

- Bugs in a plugin's intended functionality (use the issue tracker instead).
- Host runtime vulnerabilities (report to the host project).
- Issues that require a compromised maintainer machine or GitHub account.
- Denial-of-service tests and social engineering.

## Reporting

**Do not open a public issue for a vulnerability.**

Use GitHub private reporting:

<https://github.com/YimingZhanshen/skin-nexus-plugins/security/advisories/new>

If that entry point is unavailable, open an issue that only says
"request for a private security channel" and wait for a reply.

Please include: affected plugin/version or workflow, reproduction, impact, and
any suggested fix. Test only against your own registry or a local host.

## Response

- Best effort acknowledgement within **7 days**;
- No public details before a fix is published; credit on request (anonymous by default);
- No bug bounty — this is a personally maintained open-source project.

## Key compromise

The Ed25519 signing key lives only in the `market-signing` environment secrets
and the maintainer's offline backup. If you suspect key exposure, report it
privately and follow [`KEY-ROTATION.md`](KEY-ROTATION.md).

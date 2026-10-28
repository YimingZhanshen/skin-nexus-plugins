# Accessibility

Plugin UI runs inside the host's sandboxed iframes and fixed slots, so plugin
authors can degrade — or improve — the host's accessibility. The host's
accessibility statement is at
<https://github.com/YimingZhanshen/skin-nexus/blob/main/ACCESSIBILITY.md>.

## Expectations for plugins

- Use semantic HTML and visible labels; do not replace native controls with
  clickable `<div>`s that cannot be focused or operated by keyboard.
- Keep text contrast readable in both light and dark host themes; use the
  host's CSS variables rather than hard-coded colors.
- Respect `prefers-reduced-motion`; avoid autoplaying animation in pages/slots.
- Do not trap focus inside the iframe or block the host's keyboard navigation.
- Avoid flashing content and rapid auto-updating regions.

## Reporting

- Host-level interface problems:
  <https://github.com/YimingZhanshen/skin-nexus/issues> (title prefix `[a11y]`).
- Plugin-specific problems: open an issue in this repository with the plugin
  name, page/slot, browser or assistive technology, and expected vs actual behavior.
- Sensitive reports: use the private channel in [`SECURITY.md`](SECURITY.md).

This repository has not undergone an independent accessibility audit and makes
no conformance claim.

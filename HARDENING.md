# styled-atom v4 hardening

This checklist covers the work required before adopting v4 in a large
application. Items are ordered by production risk, not presentation value.

## P0 — ownership and browser correctness

- [x] Share mounted-style ownership between multiple runtimes and physical
  copies of the package in the same JavaScript realm.
- [x] Detect cross-runtime CSS, nonce and precedence conflicts without
  overwriting another owner.
- [x] Test ref-counting across stores, namespaces, documents and ShadowRoots.
- [x] Add Chromium, Firefox and WebKit coverage for cascade order, iframe
  targets, Shadow DOM, portals, SSR hydration and CSP metadata.
- [x] Exercise repeated lifecycle cycles, target migration, in-place
  replacement, 1,000 shared owners and 1,000 unique atoms without residue.
- [x] Exercise React 18 and React 19 locally and in CI.
- [x] Document the security boundary: style values are trusted CSS, not a
  sanitizer for untrusted input.

## P1 — compiler contract and diagnostics

- [x] Turn the supported compiler syntax into an explicit, tested contract.
- [x] Add fallback declaration arrays and modern selector coverage.
- [x] Detect mutated cached style objects in development and recompile them.
- [x] Add runtime inspection and useful development warnings.
- [x] Add a real-browser 1,000-atom mount/release performance smoke test and a
  repeatable benchmark command.
- [x] Keep correctness E2E and single-worker benchmarks separate so performance
  load cannot make the release matrix flaky.
- [x] Measure inline compiler work separately from unique and shared DOM atoms.

## P1 — adoption and documentation

- [x] Add recipes for Vite, Next.js, Vite SSR, iframe previews, Shadow DOM,
  portals, microfrontends and CSP.
- [x] Make the README the source of truth for the documentation website.
- [x] Reuse the documentation shell and visual grammar of morphing-scroll,
  keeping styled-atom's own accent color and interactive demonstrations.
- [x] Add ownership and multi-runtime demonstrations to the site.
- [x] Validate the v4 tarball in the real `resume-page` Vite/Sass host on
  Chromium, Firefox and WebKit, preserving route-level cascade order.

## Later — build-time optimization

- [ ] Reconsider native CSS nesting only after the specification stabilizes,
  the supported browser matrix is verified and output-size measurements show a
  meaningful benefit. Flattened CSS remains the only v4 contract.
- [ ] Prototype the build-time design in `BUILD_TIME_COMPILATION.md` without
  changing the runtime JSX API.
- [ ] Keep runtime compilation for genuinely dynamic atoms.

## Product principles

- styled-atom complements ordinary CSS; it does not require an application to
  move all styling into JavaScript.
- A CSS atom is a unit of ownership and lifecycle, not a one-property Atomic
  CSS utility.
- Regular CSS files remain regular CSS. The library adds loading, placement,
  sharing, state and cleanup rather than a new styling language.
- Prefer predictable ownership over automatically merging every atom into one
  stylesheet.

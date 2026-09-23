# STL Studio

Static browser-based editors for printable objects. The first editor creates a coin-cell box from battery types and quantities.

Public site: https://hcpark0121.github.io/stl-studio/

Printed design and downloads: https://hcpark0121.github.io/stl-studio/coin-cell-box/tested.html

Custom editor: https://hcpark0121.github.io/stl-studio/coin-cell-box/

## Coin-cell box

- CR1632, CR2016, CR2025, CR2032 and CR2450; independent quantities.
- Rectangular shelf packing: split large quantities into rows, combine shorter groups on a shelf, and search candidate widths for compact layouts. A heuristic, not a guarantee of the global optimum.
- Adjustable centre spacing, tilt, exposure ratio and optional internal-width limit.
- A deeper seat and matching lid pads leave 0.5 mm above the cells.
- Browser-only Manifold WASM generation and binary STL export for body and print-oriented lid.
- Shareable URL settings and per-configuration magnet insertion heights.
- No accounts, uploads, analytics, remote geometry server or build service required at runtime. Serve over HTTP(S), not file://.

The custom geometry is an **experimental variant**. Its dimensions differ from the fixed physical prototype. Mesh and sampled motion tests do not establish print fit, magnet holding force or retention under shaking. Generated STLs do not contain pause commands. Use the downloaded instructions and check the slicer before printing.

Hardware: four 5 × 2 mm magnets and a 1.75 mm filament hinge pin. Cavities 5.3 × 2.2 mm; insert magnets during pauses and seal with subsequent layers.

## Development

No npm install is needed. `npm test` runs layout and solid-geometry checks using vendored dependencies. Geometry source: `coin-cell-box/geometry.js`; layout source: `coin-cell-box/layout.js`. Keep both the preview and exported STLs on that same engine.

Each editor lives in its own directory. `shared/` holds common UI and export helpers. Pages deploys only the static app directories, not tests or repository history.

## Publishing

The public repository is https://github.com/hcpark0121/stl-studio. Publish only this curated directory to that separate repository; never push the parent modeling workspace or its history. GitHub Pages uses GitHub Actions. `.github/workflows/pages.yml` tests and publishes on pushes to main. Use relative URLs so project-site subpaths work.

See THIRD_PARTY.md for dependency licenses. Original models and photos are CC BY-NC 4.0; see LICENSE-MODELS.md. This grant does not cover editor software source.

## Validation status

120 layout cases and 6 mesh/opening scenarios pass, plus lid contact checks for upward cell motion. Browser UI interaction has not yet been verified in this environment. GitHub Actions tests and Pages deployment succeeded on 2026-09-23. Browser automation is blocked by administrator policy on the public host, so visual UI/WebGL verification remains incomplete.

## Physical fixed release (2026-09-23)

`coin-cell-box/tested.html` provides real photos and exact successful body/lid meshes. The complete PLA 3MF was recombined and slicer-verified with two pauses; the individual parts have user-reported successful physical use. Custom editor geometry remains a separate experimental variant. Downloads include a versioned ZIP, print guide and hash manifest.

## Languages and 3D interaction

Korean, English, Japanese and Simplified Chinese. URL `?lang=ko|en|ja|zh` takes precedence over saved preference, then browser language; unsupported languages fall back to English. Language changes preserve the design hash and do not replace form controls. `shared/translations.tsv` is the translation source; `shared/messages.js` is the runtime dictionary. Tests check coverage and interpolation parameters.

The editor generates 3D on load and after input changes, debouncing requests and discarding stale worker responses. The fixed-design page loads the actual release meshes automatically. Both expose “Open / close lid”, degrees, Close and Fully open. The preview cells are under assets and are not printable download parts. Four localized fixed print guides and a localized custom-guide note are included.

2026-09-23 browser verification attempt: admin policy blocks the private server host. UI/WebGL interaction was not visually verified; no alternate browser or transport was used to bypass the block. Node layout/geometry/i18n checks and local asset checks pass.

## Engraving and export checks
Battery-type engraving is enabled by default and can be disabled. Each group gets its own 0.6mm recessed label; the setting is included in shared URLs. Models regenerate automatically. Layout and battery visibility have explicit toggles.

Before enabling downloads, the worker re-reads both binary STLs, restores the printed lid by a proper rotation, checks assembly interference, connected solid bodies, and retention-pad contact for every cell raised 1mm. Sixteen saved-file scenarios cover mixed counts, split groups, single types, and setting extremes; an intentionally mirrored lid must fail. These checks do not replace physical fit and print trials.

Allowed settings: 15–25° tilt, 9–12mm centre spacing, 28–35% exposure. Shared URLs are normalized to these bounds. Invalid form values disable export until corrected. Every stored STL edge must have two oppositely oriented incident triangles before export is enabled.

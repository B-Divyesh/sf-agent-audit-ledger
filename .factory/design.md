# Visual thesis — The Evidence Orchard

## Direction and rationale

Agent Audit Ledger uses **surreal editorial scenery**: a nocturnal paper
landscape where files become pale monoliths, evidence travels as red thread,
and a watchful brass moon illuminates only what can be verified. The scene
turns an abstract audit chain into a memorable spatial model: actions are the
path, hashes are trail markers, and the exported ledger is the field map.
Decoration is confined to the opening story; the working demo becomes a quiet,
high-contrast editorial desk.

This is intentionally not a cyber dashboard. The emotional register is
careful, archival, and human—appropriate for reviewers rebuilding confidence
in machine-assisted work.

## Palette

- `ink` #17231F — near-black green, primary text and night field.
- `paper` #F4EEDC — warm archival ground.
- `paper-deep` #E8DEC4 — secondary surfaces and rules.
- `moss` #355B45 — verified/success and structural accents.
- `thread` #B53B31 — the audit trail, links, focus, and warnings.
- `brass` #D39A3A — hashes, selected evidence, and the moon.
- `danger` #A52A2A — failures, always paired with words/icons.
- `muted` #5F675E — secondary copy; measured at ≥4.5:1 on paper.

The site is explicitly a light archival canvas with a dark ink hero rather
than a theme toggle: the art direction depends on moving from night-time
uncertainty into a readable paper record.

## Type

- Display: Georgia, “Times New Roman”, serif. High-contrast editorial forms
  make the ledger feel published rather than logged.
- Utility: ui-monospace, SFMono-Regular, Consolas, monospace. Used for events,
  hashes, commands, and labels where exact characters matter.

Both are local system stacks: zero font payload and no third-party request.
The scale is 14 / 16 / 20 / 28 / 44 / clamp(52–88) px, with body copy at 17px.
Numbers and hashes use tabular figures.

## Spacing and composition

An 8px base rhythm (4px only for optical micro-spacing). Page gutters are
24px mobile, 48px tablet, and 72px desktop. Reading measure is 68 characters.
The hero uses a 5:7 editorial split; evidence sections alternate generous
prose with ruled specimens. Cards are reserved for independently operable demo
inputs and results.

At 390px the navigation drops secondary links into a compact two-row rail,
hero art follows the promise, evidence tables become labelled stacks, and the
demo toolbar becomes full-width. No meaning depends on hover.

## Interaction grammar

- A red “thread” underline grows beneath the current link or selected event.
- Pasted events arrive as paper slips from 8px below, reinforcing physical
  continuity.
- Verification stamps change both word and icon, never color alone.
- Focus is a 3px brass outer ring with a 2px ink offset on light surfaces.
- Touch targets are at least 44×44px and action copy begins with a verb.

## Motion policy

UI transitions last 180–240ms and animate only opacity/transform. The hero
scene has one slow, finite entrance—moon, path, then ledger—and never loops.
With `prefers-reduced-motion: reduce`, all translations and smooth scrolling
are removed; state changes are immediate opacity changes. The illustration
remains fully understandable as a static scene.

## Asset plan and provenance

- `site/public/evidence-orchard.webp`: original generated surreal editorial
  hero; wide nocturnal paper-cut landscape, file monoliths, red evidence
  thread, brass moon; no people, interface, logos, text, or watermark.
- `site/public/agent-audit-ledger-social.webp`: original 1200×630 social
  preview derived from the project hero with a centered crop. It retains the
  moon, document monoliths, red evidence thread, and open ledger without
  adding text or third-party material.
- Generation prompt: “Surreal editorial paper-cut landscape at night for a
  developer audit tool; warm ivory document monoliths rising from deep
  green-black terrain; a single vermilion thread connects small brass evidence
  markers along a path toward an open ledger; oversized ochre moon as a quiet
  witness; tactile grain, screenprint edges, sophisticated magazine
  illustration, wide 4:3 composition, focal detail to the right and breathing
  room to the left; no text, letters, UI, people, logos, gradients, neon, or
  watermark.”
- Generator: factory `gen-image.sh` deployment (factory-image), generated
  2026-08-27. License: original project asset under the repository MIT license.
- Social export: ImageMagick 6 center crop from the original hero, generated
  2026-08-30. License: original project asset under the repository MIT license.
- UI icons are hand-drawn inline SVG using simple product-specific thread,
  seal, and document motifs; decorative icons are hidden from assistive tech.
- `site/public/ledger-workflow.webm`: original silent 6-second Playwright
  recording of the working local demo at 1000×700, captured 2026-08-27. It is
  loaded only on user request (`preload="none"`) and includes a text transcript.

# Design system — Time·Travel Agency

A modern SaaS workspace that happens to manage time travel. Business first; the game lives in stakes and objects.
Source of truth: `src/styles.css` (tokens, base, utilities, shared components). Component CSS covers the rest.

## Principles

1. **A working platform first.** Standard controls, an aligned grid, one type family. The fiction never changes how
   a control works.
2. **Colour means state.** Neutral ink for everything normal; red, amber, green and blue only where they say
   something. Primary buttons are ink; the brand forest green is for the shell, links, selection and focus.
3. **Tension is information.** Pulses and red tints appear only where something is at risk right now
   (a trip under way, an open paradox). Completed trips stay calm.
4. **Winning is authored.** One real motion moment: the seal that closes when a paradox is stabilised.

## Themes

Light is the default; dark is set with `data-theme="dark"` on `<html>` by `ThemeService` (stored in
`localStorage` as `tta_theme`, falls back to the OS setting; `index.html` sets it before first paint).
Any subtree with `.theme-dark` is always dark; only the tutorial overlay uses it. The Continuum and The Loom follow
the theme like every other page. The top bar (the shell) stays deep forest green in both themes.

## Tokens

| Group | Tokens | Use |
|---|---|---|
| Ground | `--bg`, `--bg-raised`, `--surface`, `--surface-sunken` | page, table heads / footers, cards, wells |
| Lines | `--border`, `--border-subtle` | controls / card and row hairlines |
| Text | `--text`, `--text-2`, `--text-muted`, `--text-faint` | primary → least important (all ≥ 4.5:1 on `--surface`) |
| Brand | `--brand`, `--brand-hover` (forest green: links, selection, focus) · `--brand-solid`, `--brand-solid-hover`, `--on-brand` (ink primary button; inverts in dark) | |
| State | `--blue` scheduled / in process · `--amber` live, waiting · `--green` (a teal-leaning emerald, kept apart from the brand green) stable, solved · `--red` critical, escalated · `--rust` cancelled · `--violet` Time Itself | always paired with a label |
| Shell | `--shell`, `--shell-raised`, `--shell-border`, `--shell-text`, `--shell-muted`, `--shell-accent` | top bar only |
| Depth | `--shadow-card`, `--shadow-raised`, `--shadow-overlay`, `--scrim` | resting card, hover, menus and dialogs |
| Shape | `--radius-sm` 4 · `--radius` 6 (controls) · `--radius-lg` 10 (cards) · `--radius-pill` | |
| Motion | `--ease-out`; keyframes `riseIn`, `popIn`, `fadeIn`, `livePulse`, `softPulse` | 150 ms for state, 200–300 ms for entrances |

Tints are mixed, never hard-coded: `color-mix(in srgb, var(--red) 9%, transparent)`.
Data-driven colours (era accents, paradox types) arrive as custom properties (`[style.--era]`, `[style.--type]`).

## Type

`Geist` for everything, `Geist Mono` for timestamps, readouts and coordinates (`.mono`). Numbers in tables and
metrics are tabular. Scale: 12 labels · 13 controls and tables · 14 body · 15–16 section and card titles ·
24 page title · up to 52 on the landing headline. Headings are 600 with negative tracking; no uppercase labels and
no label stacked above a heading — context sits beside the title as a `.tag`.

## Components

- **Shell** (`header`): logo mark, pill nav, live paradox counter, theme switch, role switcher with rank pips
  (agent ◆, manager ◆◆, director ◆◆◆).
- **Buttons**: `.btn` (default), `.btn--primary` (one per view), `.btn--accent` (secondary emphasis),
  `.btn--danger`, `.btn--sm`, `.btn--block`, `.icon-btn`.
- **Forms**: `.input`, `.select`, `.textarea`, `.select--compact`, `.form-grid`, `.form-error`; focus is a brand ring.
- **Badges**: `.badge--{neutral|blue|amber|green|red|rust|brand|violet|live}`; a leading dot unless `.badge--plain`.
  `--live` pulses.
- **Surfaces**: `.card`, `.card--flush` (tables), `.tag`, `.kv`, `.panel-label`.
- **Metric strip** (`app-stat-tiles`): one strip with hairline-divided cells; only alarming numbers take colour.
- **Stability gauge** (`app-integrity-gauge`): the signature. Three cells, one per unresolved paradox a trip can
  take before it turns critical. Green → amber → red; pulses at three. Never shown to customers.
- **Paradox item** (`app-paradox-list`): type dot, queue tag (`Now` is filled blue), dual-lock chips.
- **Trip card**: staff view shows type and gauge; customer view is a ticket (dashed perforation, no internals).
- **Icons** (`app-icon`): one 24 px set, 1.75 stroke, round caps. No emoji or unicode glyphs in the workspace.
- **Dialogs and toasts**: `app-modal` (header, body, sticky footer), `app-toast-stack` (tone glyph + message).

## In-world artefacts

Itinerary strip on the trip page, ticket-style trip cards, the era route map on the landing page, the field
commendation on an agent's missions, the oscilloscope and seal in Phase Lock.

## The Continuum and The Loom

Both are workspace boards, not scenes. The Continuum is a horizontal planning board: era columns tinted with the
era colour, one line, trips as markers on stems, a hover card, an overview bar and a boarding pass. The Loom is a
monitoring board: the agency's timeline in brand green on a dot grid, fractures as dashed lines in their paradox-type
colour (open ones waver), an integrity card, and a standard side panel for the generator controls and the fracture log.

## Do not

- Add a second accent colour or use a state colour as decoration.
- Use coloured side stripes on cards, gradient text, or glass effects in the workspace.
- Write inline `style=""`; pass data colours as custom properties.
- Show paradoxes, the gauge or the critical label to customers.

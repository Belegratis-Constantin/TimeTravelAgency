# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Portfolio visitors (recruiters, other developers) who click around on their own for a few minutes.
- Friends who actually play the five roles for a while.
- The author, who opens it daily as a learning project.

## Product Purpose

Time Travel Agency is a role-playing management game dressed as a business platform. Customers book trips into past
and future eras; agents escort them and stabilise paradoxes in the field; managers run trips and teams; a director
oversees the agency; "Time Itself" generates paradoxes. Success: it reads as a serious, high-end management platform
at first glance and still plays like a game.

## Positioning

A business tool whose "incidents" are time paradoxes: every screen is a plausible operations screen, and the stakes
(a trip turning critical at three unresolved paradoxes) are game stakes.

## Operating Context

- Five roles, switched from the header: customer, agent, manager, director, Time Itself.
- Data is ephemeral: the backend reseeds on every start.
- Paradoxes arrive live (5 s feed polling); agents solve them in the "Phase Lock" mini-game.

## Capabilities and Constraints

- Angular 21, zoneless, standalone OnPush components, signals. Global tokens and utilities in `src/styles.css`,
  component CSS for the rest, no inline `style=""` attributes; data-driven colours go through CSS custom properties.
- Customers never see paradoxes or the critical classification.
- The Continuum (customer) and The Loom (Time Itself) are immersive dark visualisations.

## Brand Commitments

- Name: Time·Travel Agency.
- Confirmed with the author (2026-11-13): the look is a modern SaaS workspace (in the spirit of Linear or Stripe's
  dashboard), replaces the earlier navy-and-gold identity, and ships in a light and a dark theme.
- Game feeling comes from: live tension, satisfying feedback, rank and progress, in-world artefacts, and small
  gamifications such as "saving a timeline".

## Product Principles

1. Business first: a visitor should recognise a working management platform before noticing the fiction.
2. The fiction lives in objects and stakes, not in decoration.
3. Tension is information: urgency is shown only where something is actually at risk.
4. Winning should feel like something.

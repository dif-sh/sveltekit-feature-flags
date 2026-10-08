---
id: new-hero
status: active
owner: team@example.com
surface: home
hypothesis: >
  A home headline that names the action ("Flip a flag by editing one markdown
  file.") will raise signup_clicked per visitor by 5% over 14 days.
variants:
  - id: "off"
    weight: 50
    summary: "Current hero: Feature flags that live in your repo."
  - id: "on"
    weight: 50
    summary: "New hero: Flip a flag by editing one markdown file."
metrics:
  primary: signup_clicked
created: 2026-10-07
---

## Brief

<!--
Recent learnings on home:
- (none yet, first test on this surface)
-->

Swap the hero headline and CTA label in `src/routes/+page.svelte`. `off` keeps
the current copy; `on` shows the new copy. Nothing else on the page changes.

## Rationale

The current headline describes the category. The new one describes the
first thing a visitor would do. `signup_clicked` fires from the hero CTA,
so it measures the headline directly.

## Decision

<!-- drafted by `dif conclude` -->

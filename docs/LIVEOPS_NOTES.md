# LIVEOPS NOTES

## Core Economy

- Primary active currency: `ore`
- Prestige currency: `darkMatter`
- Progression materials: `iron`, `crystal`, `plasma`, `relic`

## Session Hooks

- `lastSeenAt` enables capped offline rewards without simulating the full combat loop.
- `lastRewardSummary` gives the client a lightweight way to surface recent progression events.

## Launch content boundaries

- Follow `RELEASE_SCOPE_V1.md`: five sectors and thirty sequential campaign tasks, without calendar gates or streak loss.
- Ship local, bundled content; do not require remote configuration, rotating paid pools or seasonal servers.
- Keep skills, loot, bosses and progression data separate from rendering so future app updates can add content.
- Ads and IAP are optional; campaign completion cannot require either. Future timed events need a separate design and cost review.

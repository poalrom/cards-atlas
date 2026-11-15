# Cards Atlas

Static multi-game card exploration. Canonical contracts live in `src/entities/catalog/types.ts`. The browser consumes complete immutable snapshots; source imports, LLM inference, similarity and layout run locally.

## Product invariants

- One node per gameplay card; retain eligible printings and all faces. Games have independent categories and similarity spaces.
- Riftbound uses Riot official content only. MTG uses MTGJSON paper printings from the last 12 calendar months, including reprints; apply individual printing dates before set dates and exclude future releases.
- Use `gpt-6-luna` with `low` through the existing ChatGPT Codex login. Included usage only: confirm automatic credit purchases are disabled, check usage before inference and stop on quota or uncertain billing. No paid API, purchased credits, model fallback or automatic reset redemption.
- Publish only a completely classified snapshot. Failed preparation preserves the previous published version. Fixtures belong only in temporary smoke runs, never in `public/data`.
- Similarity is exploratory, not equivalence, legality, target-coverage proof or deck-building advice. No pricing features.
- All repository content, UI, prompts, comments and preserved Git history must be English. Secrets and preparation caches remain ignored.

## Code and state

Rules adapted from Snuglog without its server, household domain, localization or editor infrastructure:

- Strict TypeScript, type-only imports, tabs, double quotes and Biome-organized imports.
- Dependencies flow `routes → features → entities → shared`; scripts may use canonical entity contracts. Shared UI receives feature data and wording through props.
- Selection is an ID derived from canonical snapshot data. URL state owns game, cluster, card and similar-card view; local React state owns transient panels and camera interaction.
- Generated routes are owned by TanStack Router tooling. Regenerate them rather than editing `src/routeTree.gen.ts`.
- Keep source normalization, classification, similarity and browser presentation separate. Prefer direct modules over pass-through abstractions.

## Design and writing

- Preserve the approved full-screen light atlas with floating controls and responsive detail panels. Reuse the semantic tokens in `src/styles.css` instead of adding another theme.
- Use readable body text, 18px rules text, visible focus, accessible names and usable touch targets. Respect reduced motion. A modal owns focus and restores it on close; Escape closes only the innermost surface.
- Primary actions use the accent fill; secondary actions are ghost. A read-only inspector closes; it does not offer a misleading editor-only Cancel.
- Render only real controls. Missing functions create no empty toolbar rows, fake buttons or hidden duplicate interactive panels.
- Keep complete messages with their owning feature. Use concise, truthful English verbs and consistent terms: game, card, printing, cluster, similar cards.
- Distinguish loading, unavailable snapshot, empty collection, no filter matches, missing metadata and load failure. Recovery actions must actually exist; never present a failure as an empty catalog.

## Verification and publication

Exercise changed preparation paths with throwaway inputs and the actual app in desktop/mobile browsers. Tests must observe behavior, not copy wording or inspect source wiring. Read the commands and provisioning requirements in `README.md` before preparing or publishing data. Publish a local build to `gh-pages`; GitHub Pages performs only its standard branch deployment, not a custom build workflow.

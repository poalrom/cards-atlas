# MTG Mechanics Atlas — full-screen design prototype

## Selected design

The user selected **A — spatial atlas** and requested an edge-to-edge map. The map is the main application surface, not a block inside a page. B/C, the variant parameter, switcher and keyboard variant handlers have been removed.

The three original explorations remain on **`prototype/design-explorations`**. This historical `main` revision contains only the selected design. No implementation issue was specified; this document records the archive and decision.

This remains throwaway design UI, not a production import implementation.

## Run

Requires Node.js 22.12+; originally checked on 24.15.

```sh
npm install
npm run prototype
npm run build
npm run preview
```

Open **http://localhost:3010/prototype/atlas**; the root redirects there. `prototype` is also configured in `paseo.json`. Build checks TypeScript and creates `dist`; preview serves the result on port 3010. Do not run dev and preview on the same port simultaneously.

## Full-screen layout

- The SVG map fills the viewport, including the space under floating panels. No outer page margins, large introductory heading or document scrolling.
- Compact top toolbar: collection search, unique-card count, cluster navigation and atlas information.
- Collapsible mechanic clusters on the left. On narrow screens, the Clusters button opens the list; selection closes it.
- Selecting a card opens the right inspector; on phones it becomes a scrolling bottom panel. Closing preserves the current cluster.
- Comparison appears over the lower map with its own scrolling. On phones it temporarily replaces the inspector; closing returns to card details.
- The camera accounts for panel space without changing cluster centers. Selected-cluster nodes expand into a readable layout.
- Mouse/touch dragging, button zoom and centering.
- Escape closes search, About, comparison, selected card or cluster list in order. Arrow keys no longer switch designs.
- Cluster, card, comparison mode and contextual date live in the URL. Full state is also available in About and logged after navigation. No other persistence.

## Article scenes

1. [Full collection](http://localhost:3010/prototype/atlas?group=all&asOf=2026-11-15).
2. [Counterspells with Dismiss selected](http://localhost:3010/prototype/atlas?group=counter&card=dismiss&asOf=2026-11-15).
3. [Dismiss compared by both effects](http://localhost:3010/prototype/atlas?group=counter&card=dismiss&compare=both&asOf=2026-11-15).

Reload restores the selection. Changing clusters preserves Dismiss, whose countering and drawing effects remain available.

## Data and limitations

- 26 fixed unique control cards; 25 have demonstration classifications. Multi-role cards belong to multiple clusters but count once overall.
- Not an AllPrintings import or an actual last-24-month snapshot. `asOf=2026-11-15` provides interface context only. Historical examples are intentional.
- Cards, text and effects are hand-written in `src/features/atlas-prototype/data.ts`. Grist retains a source excerpt and an explicit incomplete-analysis warning.
- Comparison shows targets, conditions, mana differences, side effects and mutually exclusive Izzet Charm modes. This is a simplified hand-feature model, not a general rules parser. Other mechanics use shared-cluster candidates.
- Prices are disconnected and display “Price unknown”; no fabricated values.
- No database, authentication, localStorage, server mutations, complete importer or public deployment.
- Artwork is local. Artists and sources are in [public/art/credits.json](public/art/credits.json). Images © Wizards of the Coast, obtained through the [Scryfall API](https://scryfall.com/docs/api). The proposed full-snapshot source is [MTGJSON](https://mtgjson.com/).

## Historical verification

The original revision was exercised in a live browser:

- Map and document match the viewport at 1440×900 and 390×844 with no horizontal or vertical document scrolling.
- Dismiss remains selected when moving from countering to draw.
- Switching from one effect to both changes candidates; Izzet Charm explains that both modes cannot occur in one casting.
- Negate comparisons: Counterspell full target coverage and two blue symbols; Spell Pierce payment `{2}`; An Offer You Can’t Refuse gives the target controller two Treasure tokens; Essence Scatter no coverage.
- Closing comparison returns to the inspector; closing the inspector preserves the cluster. The mobile cluster list closes on selection.
- Search, URL restoration after reload, Escape, zoom and map movement.

No permanent tests were added to the throwaway prototype. These are historical observations, not verification of later revisions.

## Stack and files

Frontend stack borrowed from `../snuglog`: React 19, TypeScript, Vite, TanStack Router file routes, Tailwind CSS 4, lucide-react, Geologica, PT Serif and JetBrains Mono. SSR, Effector, PostgreSQL/Drizzle and authentication were not transferred for the design exploration.

- `src/routes/prototype.atlas.tsx`: route and search parameters.
- `src/features/atlas-prototype/AtlasPrototype.tsx`: control data, URL actions and state disclosure.
- `src/features/atlas-prototype/AtlasView.tsx`, `atlas-view.css`: full-screen map and floating panels.
- `data.ts`, `types.ts`, `shared-ui.tsx`: control data, contracts and visual primitives.

This English version preserves the selected historical design after the repository-wide language cutover.

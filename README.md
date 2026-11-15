# MTG Mechanics Atlas — design prototype

**Question:** which interface best supports the journey from the full collection to a mechanic, a card and explainable alternatives?

Three independent design directions share one route. This is throwaway UI, not the full import implementation. No winner has been selected and none is a production implementation.

## Run

Requires Node.js 22.12+; originally checked on 24.15.

```sh
npm install
npm run prototype
npm run build
npm run preview
```

Open http://localhost:3010. The root redirects to `/prototype/atlas`. Build checks TypeScript and creates a static demo; preview serves `dist` on port 3010. Do not run dev and preview on the same port simultaneously.

The design switcher is development-only. Production builds accept direct `?variant=` links without the developer toolbar.

## Design directions

- [A — spatial atlas](http://localhost:3010/prototype/atlas?variant=A): light cluster map, stable cluster centers, node-level zoom, links for multi-role cards and a right inspector. Closest to the requested spatial model.
- [B — workbench](http://localhost:3010/prototype/atlas?variant=B): dark tool with a source card, candidate matrix, coverage filters and sorting. Focused on alternatives and restrictions.
- [C — field guide](http://localhost:3010/prototype/atlas?variant=C): editorial layout, numbered chapters and an inline card dossier. Focused on exploration and reading.

The bottom toolbar cycles designs with arrows. Left/Right keys do the same except during text input. The toolbar contains three article scenes and complete state. State changes are logged to the console.

## Article scenes

1. [Full collection](http://localhost:3010/prototype/atlas?variant=A&group=all&asOf=2026-11-15).
2. [Counterspells with Dismiss selected](http://localhost:3010/prototype/atlas?variant=A&group=counter&card=dismiss&asOf=2026-11-15).
3. [Dismiss compared by both effects](http://localhost:3010/prototype/atlas?variant=A&group=counter&card=dismiss&compare=both&asOf=2026-11-15).

Replace `variant=A` with B or C to open the same scene in another design. URLs restore the design, cluster, card, comparison mode and contextual date. Reload preserves selection; changing clusters preserves the selected card.

## Data and limitations

- 26 fixed unique control cards, 25 with demonstration classifications. Multi-role cards belong to multiple clusters but count once overall.
- Not an AllPrintings import or an actual last-24-month snapshot. `asOf=2026-11-15` provides interface context only. Historical control examples are intentional.
- Cards, text and effects are hand-written in `src/features/atlas-prototype/data.ts`. Grist retains a source excerpt and an explicit incomplete-analysis warning.
- Comparison demonstrates target coverage, restrictions, mana differences, side effects and mutually exclusive Izzet Charm modes. This is a simplified hand-feature model, not a general MTG rules parser or validator of all effect combinations.
- Other mechanics use shared-cluster candidate selection. This prototype cannot validate general semantic ranking.
- Prices are disconnected and never fabricated; price surfaces say “Price unknown.”
- No database, authentication, localStorage or server mutations. State lives in memory and the URL. Complete import, snapshot preparation and public deployment are outside this design prototype.
- Artwork is local and does not require Scryfall during repeated viewing. Artists and source links are in [public/art/credits.json](public/art/credits.json). Images © Wizards of the Coast, obtained through the [Scryfall API](https://scryfall.com/docs/api). The proposed full-snapshot source is [MTGJSON](https://mtgjson.com/).

## Control scenarios

- Open Dismiss from the overview and move from counterspells to draw; the selected card remains.
- Compare Dismiss by countering, then both effects; Izzet Charm shows mutually exclusive modes.
- Search Negate and open alternatives: Counterspell has full coverage and two blue symbols; Spell Pierce requires a possible payment of `{2}`; An Offer You Can’t Refuse gives the target controller two Treasure tokens; Essence Scatter does not cover noncreatures.
- Search Grist: the source excerpt and incomplete-analysis warning remain available.
- Switch A → B → C with URL state preserved, then reload.
- At 390px, clusters, selection and comparison remain accessible without horizontal page overflow. A supports map dragging and button zoom; zoomed nodes spread for readability while cluster centers remain stable.

## Stack and files

The frontend stack was borrowed from `../snuglog`: React 19, TypeScript, Vite, TanStack Router file routes, Tailwind CSS 4, lucide-react, Geologica, PT Serif and JetBrains Mono. TanStack Start SSR, Effector, PostgreSQL/Drizzle and authentication were intentionally omitted.

- `src/routes/prototype.atlas.tsx`: throwaway route and search parameters.
- `src/features/atlas-prototype/AtlasPrototype.tsx`: common state, navigation and developer toolbar.
- `VariantA.tsx`, `VariantB.tsx`, `VariantC.tsx`: independent layouts with separate CSS.
- `data.ts`, `types.ts`, `shared-ui.tsx`: control data, contracts and visual primitives.

The original prototype was checked with a production build, types and a live browser: all three designs at 1440/390px, navigation, comparison, search, URL restoration and keyboard switching. No permanent tests were added to this throwaway prototype. These are historical observations, not verification of later code.

## Recording a decision

The next design verdict should select a winner or combination. The actual product should then be implemented separately, with these three designs retained as a primary reference on an archival branch and linked to an implementation issue. At the time of the original exploration no Git repository or implementation issue had been created; no selection was assumed.

This English version preserves the historical exploration after the repository-wide language cutover.

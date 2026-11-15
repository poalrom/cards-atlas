# Cards Atlas

Explore card mechanics through a full-screen spatial atlas, original rules, functional clusters and explainable similar cards. Riftbound and Magic: The Gathering have independent catalogs, category vocabularies and similarity spaces.

The browser is a static React application. Imports, Luna Low classification, semantic layout and snapshot publication run locally. There is no catalog or LLM API call from the browser and no pricing feature.

## Run locally

Requires **Node.js 24+**, npm and the official Codex CLI authenticated through your existing ChatGPT subscription.

```sh
npm install
npm run dev
```

Open **http://localhost:3010/cards-atlas/**. The default mode reads `public/data/manifest.json`. A missing snapshot is shown as unavailable; the application never substitutes prototype cards.

For complete, privately prepared evaluation snapshots:

```sh
npm run dev:local
```

This development-only mode serves data from ignored **`.data/local-site/data/`** while retaining the same interface and URL. It is deliberately unavailable for production builds. Run only one development server on port 3010.

The complete local evaluation dated **2026-11-15** contains **1,103 Riftbound cards / 1,408 source printing records / 17 categories** and **5,510 MTG cards / 9,444 source printing records / 16 categories**. Both catalogs have complete Luna Low analysis and prepared neighbors/coordinates. Generated data remains private and ignored; these snapshots are not shipped in the repository or published to Pages.

```sh
npm run typecheck
npm run check
npm run build
npm run preview
```

The build is static output in `dist/`. Hash URLs restore game, cluster, card and the similar-card view without requiring a GitHub Pages rewrite rule. Assets and data use the `/cards-atlas/` project base.

## Catalog scope

- **Riftbound:** all validated records returned by the selected official source, grouped by gameplay identity with printings retained. The registered public release uses Riot's authenticated Content API. Local evaluation can explicitly select the keyless official-gallery publishing API; it does not imply completeness of every promotional printing or Riot approval.
- **MTG:** paper gameplay cards released or reprinted in the last **12 calendar months**, inclusive through the snapshot date. Eligibility uses `originalReleaseDate ?? set.releaseDate` per printing, not a set-date-only shortcut. Future and digital-only records are excluded. Foreign-language physical reprints remain eligible while English Oracle text is displayed. `set.cards` gameplay records are included; `set.tokens` objects are outside this catalog.
- One map node per gameplay identity, including original faces, source statistics and eligible printing metadata. A card can belong to several categories without being drawn several times.

Sources, licenses, verified public endpoint discovery and coverage limitations are documented in [data sources](docs/data-sources.md).

## Prepare real data

### 1. Import

```sh
npm run catalog:import -- mtg
npm run catalog:import -- riftbound --source gallery
```

`--as-of YYYY-MM-DD` pins a historical snapshot; the default is today's UTC date. The source cache is reused and verified unless `--refresh` is given. Large MTGJSON input is streamed one set at a time.

For the registered public Riftbound source, copy `.env.example` to `.env`, enter `RIOT_API_KEY` locally, then run:

```sh
npm run catalog:import -- riftbound --source api
```

Never send a key in chat, commit `.env`, or add a `VITE_` prefix. Gallery and authenticated-API provenance remain distinct; a gallery snapshot is local-only.

### 2. Check subscription usage

```sh
codex login status
npm run catalog:preflight
```

Generation uses **`gpt-6-luna` with `low` reasoning**, through ChatGPT authentication, ephemeral read-only Codex sessions and strict JSON output. There is no paid API or alternative-model fallback.

Before each generation session, check [Codex Usage](https://chatgpt.com/codex/settings/usage), disable automatic credit purchase and confirm included usage only. The CLI cannot disable account-level purchases. It additionally verifies quota and zero credit balance before **every** inference and stops at a conservative **75% used** ceiling, on unknown billing state or on auth/quota/model/validation failure. It does not redeem free resets automatically.

### 3. Generate categories and analyze all cards

PowerShell example after the account check:

```powershell
$attestation = "I verified this ChatGPT account uses included usage only and automatic credit purchase is disabled"
$verifiedAt = (Get-Date).ToUniversalTime().ToString("o")
npm run catalog:analyze -- riftbound --batch-size 24 --attest-included-only $attestation --attested-at $verifiedAt
```

Repeat with `mtg` after verifying the same account settings. Record the actual human verification time, not a fabricated fresh timestamp when resuming. Preparation is bounded by the complete catalog and rechecks actual included usage before every inference; an arbitrary wall-clock expiry does not replace those account checks. Verify billing settings again if the account or its configuration changes.

Each game gets one LLM-generated vocabulary of functional categories and canonical actions, targets, conditions, modes and keywords. Every card is analyzed against that vocabulary, including all faces and source attributes. Schema validation proves complete, bounded, internally consistent output, not semantic correctness. Summaries and mechanic labels are machine interpretations; the original rules take precedence.

Validated taxonomy and batches are cached by input, taxonomy, prompt and model hashes. Resume with the **same snapshot date and batch size** to reuse good work. Invalid outputs stop processing; they do not become a partial published catalog.

### 4. Assemble complete local snapshots

After all cards for a game have validated analysis:

```sh
npm run catalog:publish -- riftbound --batch-size 24 --output .data/local-site/data
npm run catalog:publish -- mtg --batch-size 24 --output .data/local-site/data
npm run dev:local
```

Snapshot assembly does not invoke a model. A failed import, classification, validation or layout leaves the previous manifest intact. The local manifest can honestly show one game as unavailable until its complete snapshot is ready.

Use `npm run prepare:data -- --help` for all commands, including status, snapshot validation and source-coverage checks. Local caches, locks and evaluation output live under ignored `.data/`.

## Similarity and positions

Structured actions, target/condition/mode interactions, keywords and overlapping categories produce weighted semantic vectors. A seeded projection gives deterministic coordinates for identical snapshot inputs; filtering changes the camera, not card positions. A two-dimensional projection loses information and can change when the corpus or vocabulary changes.

Neighbors use semantic cosine scores with bounded, deterministic candidate retrieval. They are approximate exploration results, **not** equivalence, target-coverage proof, legality or a power ranking. Details show shared features and original rules for both cards.

Canonical category, keyword, target and condition labels are sets: repeated valid labels are normalized, while unknown labels and oversized responses are rejected. Distinct effect clauses retain their original order and multiplicity, even when different numeric thresholds map to the same canonical tuple. Original rules and gameplay attributes remain the authority for exact quantities.

The map supports mouse/touch pan, pinch/button zoom and keyboard navigation. Overview labels avoid collisions and prioritize populated categories; the browser panel always exposes the full category list. Search includes all imported names, faces, rules, types, statistics and tags. The accessible card list provides another route to every card. Details and similar cards use one responsive, independently scrolling panel.

## Design and engineering rules

The approved light spatial-atlas identity is retained. Applicable Snuglog rules are adapted in [AGENTS.md](AGENTS.md): semantic tokens, readable type, primary/ghost action hierarchy, visible focus, truthful loading/empty/error states, strict TypeScript, type-only imports, tabs, double quotes and downward module dependencies. Household, server, Russian-first localization and editor-only interaction policies are not imported.

All current source, interface copy, prompts, documentation and preserved Git history are English. The original three design directions remain on `prototype/design-explorations`; their historical content is translated rather than discarded.

## Public publication

Source repository: **https://github.com/poalrom/cards-atlas**. Planned Pages URL: **https://poalrom.github.io/cards-atlas/**.

Public rollout is deferred while Riot registration and approved API access are pending. Local gallery evaluation does not bypass that requirement. Complete public-source snapshots must be assembled into `public/data/` before deployment; gallery/local-only data is rejected by the production publisher.

```sh
npm run build
node scripts/publish.ts --check-only
npm run publish
```

The last command builds locally, verifies the complete snapshots, publishes `dist/` to `gh-pages`, and configures GitHub Pages to deploy that branch's root if Pages is not configured yet. An existing incompatible Pages configuration is preserved and reported rather than overwritten. There is **no custom GitHub Actions workflow**; GitHub's standard Pages branch deployment still runs on GitHub infrastructure. Both games must have complete matching snapshots before the publisher will push. Upload success is not a claim that GitHub has finished deployment.

## Attribution

Magic: The Gathering content and symbols © Wizards of the Coast. Existing self-hosted mana symbols retain their [source credits](public/symbols/credits.json). Unknown symbols remain readable original text rather than broken images. Card artwork is loaded from the [Scryfall image CDN](https://scryfall.com/docs/api/images) using MTGJSON printing identifiers, without a browser catalog lookup. Source artists and original image links are retained where provided.

Cards Atlas was created under Riot Games' “Legal Jibber Jabber” policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.

# Card data sources

## MTG

[MTGJSON AllPrintings](https://mtgjson.com/downloads/all-files/) is the source for paper printings and English Oracle text. The importer reads the complete compressed [AllPrintings document](https://mtgjson.com/api/v5/AllPrintings.json.gz), including older sets that can contain recent individually dated reprints.

Eligibility is checked per physical printing: `originalReleaseDate ?? set.releaseDate`, within the last 12 calendar months through the snapshot date, inclusive. Future printings and non-paper records are excluded. A foreign-language physical reprint still establishes eligibility; the interface uses its English Oracle fields. Oracle identities group gameplay cards. Every distinct gameplay face is retained; identical rules/stats on alternate physical sides or artwork do not become duplicate gameplay faces. All eligible source printing records remain available.

MTGJSON is an independent aggregator, not a Wizards of the Coast service. See its [license](https://mtgjson.com/license/). Magic: The Gathering content belongs to Wizards of the Coast. Similarity and AI summaries do not replace official rules.

Artwork links use the Scryfall printing IDs supplied by MTGJSON and the [Scryfall image CDN](https://scryfall.com/docs/api/images). Transform, modal double-faced and reversible-card backs use back-face images; split, adventure and flip faces share the physical front image. These are stored image URLs, not live browser catalog/API lookups. A live front-image request was verified against its printed card name; image availability is not guaranteed, and unavailable art leaves the original rules readable.

## Riftbound: registered public release

The documented [Riot Riftbound Content API](https://developer.riotgames.com/api-details/riftbound-content-v1) requires an API key:

```text
https://americas.api.riotgames.com/riftbound/content/v1/contents
```

The key stays in local `.env` as `RIOT_API_KEY`; it is never sent to the browser or committed. Validate every returned set and card before deduplication. Source coverage means the complete response of the recorded API version, not a claim about cards absent from that source.

The [Riftbound developer policy](https://developer.riotgames.com/policies/riftbound) requires product registration for player-facing tools even when they do not use the documented API, official English card text, assets provided by Riot API, a visible disclaimer and clear labels for previewed unreleased cards. Public rollout remains deferred until registration and approved source access are ready.

## Riftbound: keyless local evaluation

The [official English card gallery](https://playriftbound.com/en-us/card-gallery/) uses a publicly readable Riot publishing-content API. These exact endpoints were inspected on 2026-11-15:

```text
https://content.publishing.riotgames.com/publishing-content/v2.0/public/channel/riftbound_website/list/riftbound_gallery_cards?locale=en_US&from=0&limit=2000
https://content.publishing.riotgames.com/publishing-content/v2.0/public/channel/riftbound_website/list/riftbound_gallery_sets?locale=en_US&from=0&limit=2000
```

The card response contains structured records: names and subtitles, card types, domains, rich English rules, energy/power/might where applicable, tags, artist and official CDN image URLs. The gallery advertised 1,416 indexed slots, but only 1,408 available English records. Investigation accounted for eight empty English slots: `360, 477, 745, 746, 1038, 1087, 1228, 1332`; a one-record request at slot 360 independently returned HTTP 200 with an empty `data` array. These are source omissions, not invented replacement cards. Equal-name variant ordering was unstable across page sizes, so the importer captures all available records in one accepted `limit=2000` response and independently accounts for the index gaps. The normalized local catalog contains **1,229 gameplay identities / 1,408 printing records**. Counts are retrieval observations, not constants or a whole-game coverage claim.

The gallery advertised six sets: Origins, Proving Grounds, Radiance, Spiritforged, Unleashed and Vendetta. This does not establish coverage of every promotional printing or release status for each record. Do not infer a release date or “released” status from the absence of a preview marker.

This source is marked `localOnly` in prepared provenance. The local-data Vite mode serves complete snapshots from ignored `.data/local-site/data/`. Ordinary development and production builds continue to use `public/data`. The production publisher rejects local-only snapshots. Availability of an undocumented public website API is not a claim of Riot approval or permission to skip registration.

## Community source investigated, not substituted

[Riftcodex](https://riftcodex.com/docs/endpoints/cards/) provides a keyless community API at `https://api.riftcodex.com/cards?size=100&page=1`, with paginated card data and [sets](https://api.riftcodex.com/sets). Live samples were readable. Its home-page example used an obsolete `/api/cards` path, which returned 404; the endpoint documentation's `/cards` path worked.

Riftcodex is not the Riot source and must not be relabeled as one. Its reported card/printing counts and promotional sets differ from the official gallery; those totals are not directly comparable unique-gameplay-card counts. The application does not silently use it as fallback data.

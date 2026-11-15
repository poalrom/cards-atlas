import { join } from "node:path";
import type { Catalog, CatalogCard } from "../../src/entities/catalog/types.ts";
import {
	array,
	atomicJson,
	DATA,
	date,
	download,
	english,
	exact,
	hash,
	json,
	object,
	strings,
	text,
} from "./storage.ts";

export const RIOT_URL =
	"https://americas.api.riotgames.com/riftbound/content/v1/contents";
export function mergeRiftboundPrintings(cards: CatalogCard[]): CatalogCard[] {
	const groups = new Map<string, CatalogCard>();
	for (const card of cards) {
		// Printed reminder text and omitted variant tags do not create a new card.
		// Different types, domains, costs or stats remain separate gameplay versions.
		const key = hash({
			name: card.name,
			type: card.type,
			cost: card.cost,
			colors: [...card.colors].sort(),
			attributes: Object.entries(card.attributes ?? {}).sort(([a], [b]) =>
				a.localeCompare(b),
			),
		});
		const existing = groups.get(key);
		const printings = existing?.printings ?? [];
		printings.push(...card.printings);
		if (
			!existing ||
			card.text.length > existing.text.length ||
			(card.text.length === existing.text.length &&
				((card.tags?.length ?? 0) > (existing.tags?.length ?? 0) ||
					((card.tags?.length ?? 0) === (existing.tags?.length ?? 0) &&
						card.id.localeCompare(existing.id) < 0)))
		)
			groups.set(key, { ...card, printings });
	}
	return [...groups.values()]
		.map((card) => ({
			...card,
			printings: card.printings.sort((a, b) => a.id.localeCompare(b.id)),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));
}
export function normalizeRiftbound(
	value: unknown,
	asOf: string,
	retrievedAt: string,
	expectedSets: string[],
	sourceHash: string,
): Catalog {
	date(asOf);
	if (new Set(expectedSets).size !== expectedSets.length)
		throw new Error("--expected-sets contains duplicate set IDs");
	const root = object(value, "Riot content DTO");
	exact(
		root,
		["game", "version", "lastUpdated", "sets"],
		"documented complete Riot content DTO",
	);
	if (text(root.game, "game").toLowerCase() !== "riftbound")
		throw new Error("Riot response is not Riftbound content");
	const version = text(root.version, "content version");
	const updated = text(root.lastUpdated, "content update");
	if (!Number.isFinite(Date.parse(updated)))
		throw new Error("Invalid Riot content update timestamp");
	const seenSets = new Set<string>(),
		seenPrintings = new Set<string>();
	const groups = new Map<string, CatalogCard>();
	for (const input of array(root.sets, "sets")) {
		const set = object(input, "Riot SetDTO");
		const setCode = text(set.id, "set ID"),
			setName = text(set.name, "set name");
		if (seenSets.has(setCode)) throw new Error(`Duplicate Riot set ${setCode}`);
		seenSets.add(setCode);
		const records = array(set.cards, "set cards");
		if (!records.length)
			throw new Error(
				`Empty Riot set ${setCode}; completeness cannot be established`,
			);
		for (const input of records) {
			const record = object(input, "Riot CardDTO");
			english(record, "Riot English source");
			if (
				record.locale != null &&
				record.locale !== "en_US" &&
				record.locale !== "en-US"
			)
				throw new Error("Riot returned a non-English locale");
			const printingId = text(record.id, "card ID");
			if (seenPrintings.has(printingId))
				throw new Error(`Duplicate Riot printing ${printingId}`);
			seenPrintings.add(printingId);
			if (record.set !== setCode)
				throw new Error(
					`Riot card ${printingId} has mismatched set membership`,
				);
			if (!Number.isSafeInteger(record.collectorNumber))
				throw new Error(`Invalid collector number on ${printingId}`);
			const baseName = text(record.name, "card name");
			const subtitle = text(record.subtitle, "subtitle", true);
			const name = subtitle ? `${baseName}, ${subtitle}` : baseName;
			const type = text(record.type, "card type");
			const description = text(
				record.description,
				"official description",
				true,
			);
			const effect =
				record.effect == null
					? ""
					: text(record.effect, "official effect", true);
			const faction = text(record.faction, "faction", true);
			const stats = object(record.stats, "CardStatsDTO");
			for (const key of ["energy", "might", "cost", "power"])
				if (!Number.isSafeInteger(stats[key]))
					throw new Error(`Invalid ${key} on ${printingId}`);
			const tags = strings(record.tags, "card tags");
			const art = object(record.art, "CardArtDTO");
			const image = text(art.fullURL, "official art URL");
			if (new URL(image).protocol !== "https:")
				throw new Error("Riot art must use HTTPS");
			const artist = text(art.artist, "artist", true);
			// Preserve a content identity for each source version before grouping printings.
			const gameplay = {
				name,
				type,
				description,
				effect,
				faction,
				stats,
				tags: [...tags].sort(),
			};
			const identity = `riftbound:${hash(gameplay)}`;
			const cost = `Energy ${stats.energy}; Cost ${stats.cost}; Power ${stats.power}`;
			const rules = [
				description,
				effect && effect !== description ? effect : "",
			]
				.filter(Boolean)
				.join("\n");
			const attributes: Record<string, string | number> = {
				energy: stats.energy as number,
				might: stats.might as number,
				cost: stats.cost as number,
				power: stats.power as number,
			};
			const printing = {
				id: printingId,
				setCode,
				setName,
				number: String(record.collectorNumber),
				sourceUrl: RIOT_URL,
				image,
				face: { name, type, text: rules, cost, image, artist, attributes },
				tags,
			};
			const existing = groups.get(identity);
			if (existing) existing.printings.push(printing);
			else
				groups.set(identity, {
					id: identity,
					name,
					type,
					text: rules,
					cost,
					colors: faction ? [faction] : [],
					attributes,
					tags,
					faces: [{ name, type, text: rules, cost, image, artist, attributes }],
					printings: [printing],
				});
		}
	}
	if (!seenSets.size || !seenPrintings.size)
		throw new Error(
			"Riot returned no complete sets/cards; refusing an empty catalog",
		);
	if (
		expectedSets.length &&
		[...seenSets].sort().join("|") !== [...expectedSets].sort().join("|")
	)
		throw new Error(
			`Riot set coverage mismatch: expected ${expectedSets.join(", ")}; received ${[...seenSets].join(", ")}. Inspect the official content before rerunning.`,
		);
	return {
		version: 1,
		game: "riftbound",
		asOf,
		sources: [
			{
				name: `Riot authenticated Riftbound content API; official English requested; endpoint coverage validated: ${seenSets.size} sets, ${seenPrintings.size} records; content lastUpdated ${updated}; no independent universe-equivalence claim`,
				url: RIOT_URL,
				retrievedAt,
				version: `${version}; sha256:${sourceHash}`,
			},
		],
		cards: mergeRiftboundPrintings([...groups.values()]),
	};
}
export async function importRiftbound(
	asOf: string,
	expectedSets: string[],
	refresh = false,
): Promise<Catalog> {
	const key = process.env.RIOT_API_KEY;
	if (!key)
		throw new Error(
			"RIOT_API_KEY is required locally. Register Cards Atlas as a card library at https://developer.riotgames.com, obtain an approved app-specific key, and set it in this shell (never commit it). Only official Riot content is supported; --expected-sets optionally checks an independently confirmed full set list.",
		);
	const path = join(DATA, "raw", "riftbound.contents.en-US.json");
	const metadata = await download(RIOT_URL, path, refresh, {
		"X-Riot-Token": key,
		"Accept-Language": "en-US",
	});
	const catalog = normalizeRiftbound(
		await json(path),
		asOf,
		metadata.retrievedAt,
		expectedSets,
		metadata.sha256,
	);
	await atomicJson(join(DATA, "catalogs", `riftbound.${asOf}.json`), catalog);
	await atomicJson(join(DATA, "catalogs", "riftbound.latest.json"), catalog);
	return catalog;
}

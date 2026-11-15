import { createReadStream } from "node:fs";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { createGunzip } from "node:zlib";
import type {
	CardFace,
	Catalog,
	CatalogCard,
	Printing,
} from "../../src/entities/catalog/types.ts";
import {
	array,
	atomicJson,
	DATA,
	date,
	download,
	object,
	strings,
	text,
} from "./storage.ts";

export const MTG_URL = "https://mtgjson.com/api/v5/AllPrintings.json.gz";
export function windowStart(asOf: string): string {
	date(asOf);
	const [year, month, day] = asOf.split("-").map(Number);
	const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
	return `${year - 1}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

// Stream one complete set at a time: AllPrintings exceeds V8's maximum JSON string size.
// Only the root's data object is traversed; braces inside escaped strings are ignored.
export async function* printingSets(
	path: string,
): AsyncGenerator<Record<string, unknown>> {
	const decoder = new StringDecoder("utf8");
	let depth = 0,
		inString = false,
		escaped = false,
		key = "",
		token = "",
		dataDepth = 0;
	let capture: string[] = [],
		capturing = false,
		completed = false;
	const stream = createReadStream(path).pipe(createGunzip());
	for await (const chunk of stream) {
		const input = decoder.write(chunk);
		let start = capturing ? 0 : -1;
		for (let index = 0; index < input.length; index++) {
			const char = input[index];
			if (inString) {
				if (depth === 1) token += char;
				if (escaped) escaped = false;
				else if (char === "\\") escaped = true;
				else if (char === '"') {
					inString = false;
					if (depth === 1) key = JSON.parse(token);
				}
				continue;
			}
			if (char === '"') {
				inString = true;
				if (depth === 1) token = '"';
				continue;
			}
			if (char === "{" || char === "[") {
				if (depth === 1 && key === "data" && char === "{")
					dataDepth = depth + 1;
				else if (dataDepth && depth === dataDepth && char === "{") {
					capturing = true;
					start = index;
					capture = [];
				}
				depth++;
			} else if (char === "}" || char === "]") {
				if (capturing && depth === dataDepth + 1) {
					capture.push(input.slice(start, index + 1));
					yield object(JSON.parse(capture.join("")), "MTGJSON set");
					capture = [];
					capturing = false;
					start = -1;
				}
				if (depth === dataDepth) {
					completed = true;
					dataDepth = 0;
				}
				depth--;
				if (depth < 0) throw new Error("Invalid MTGJSON nesting");
			}
		}
		if (capturing && start >= 0) capture.push(input.slice(start));
	}
	if (decoder.end() || inString || depth !== 0 || !completed || capturing)
		throw new Error("Truncated or unsupported AllPrintings document");
}

interface Candidate {
	card: Record<string, unknown>;
	setCode: string;
	setName: string;
	releasedAt: string;
}
function gameplayAttributes(
	card: Record<string, unknown>,
): Record<string, string | number> {
	const attributes: Record<string, string | number> = {};
	for (const key of [
		"power",
		"toughness",
		"loyalty",
		"defense",
		"hand",
		"life",
	])
		if (card[key] !== undefined) attributes[key] = text(card[key], key);
	if (typeof card.manaValue === "number" && Number.isFinite(card.manaValue))
		attributes.manaValue = card.manaValue;
	return attributes;
}
export class MtgNormalizer {
	readonly asOf: string;
	readonly start: string;
	private groups = new Map<string, Candidate[]>();
	private seen = new Set<string>();
	private seenSets = new Set<string>();
	sets = 0;
	eligibleRecords = 0;
	constructor(asOf: string) {
		this.asOf = date(asOf);
		this.start = windowStart(asOf);
	}
	addSet(value: unknown): void {
		const set = object(value, "MTGJSON set");
		const setCode = text(set.code, "set code");
		if (this.seenSets.has(setCode))
			throw new Error(`Duplicate MTGJSON set ${setCode}`);
		this.seenSets.add(setCode);
		const setName = text(set.name, "set name");
		const releasedAt = date(text(set.releaseDate, "set releaseDate"));
		this.sets++;
		for (const value of array(set.cards, `${setCode}.cards`)) {
			const card = object(value, "MTGJSON card");
			if (!strings(card.availability, "availability").includes("paper"))
				continue;
			// language describes the physical printing, not the English Oracle text.
			// Foreign-language reprints still establish eligibility and must be retained.
			text(card.language, "printing language");
			const effective =
				card.originalReleaseDate == null
					? releasedAt
					: date(text(card.originalReleaseDate, "originalReleaseDate"));
			if (effective < this.start || effective > this.asOf) continue;
			const uuid = text(card.uuid, "card UUID");
			if (this.seen.has(uuid))
				throw new Error(`Duplicate MTGJSON source UUID ${uuid}`);
			this.seen.add(uuid);
			const identifiers = object(card.identifiers, "identifiers");
			const oracle = text(
				identifiers.scryfallOracleId,
				`${uuid}: missing oracle identity; cannot safely deduplicate`,
			);
			const list = this.groups.get(oracle) ?? [];
			list.push({ card, setCode, setName, releasedAt: effective });
			this.groups.set(oracle, list);
			this.eligibleRecords++;
		}
	}
	finish(retrievedAt: string, version?: string): Catalog {
		if (!this.sets || !this.eligibleRecords)
			throw new Error(
				"MTGJSON yielded no eligible paper records; refusing an empty catalog",
			);
		const cards: CatalogCard[] = [];
		for (const [oracle, candidates] of [...this.groups].sort(([a], [b]) =>
			a.localeCompare(b),
		)) {
			candidates.sort(
				(a, b) =>
					b.releasedAt.localeCompare(a.releasedAt) ||
					String(a.card.uuid).localeCompare(String(b.card.uuid)),
			);
			const latest = candidates[0].card;
			const faces = new Map<string, CardFace>();
			const printings = new Map<string, Printing>();
			for (const { card, setCode, setName, releasedAt } of candidates) {
				const name = text(card.faceName ?? card.name, "face name");
				const side = typeof card.side === "string" ? card.side : "";
				// A reversible card may reuse one oracle ID for two different gameplay identities.
				// Keep every distinct named face, never only the first record of an oracle group.
				const faceKey = `${side}:${name}`;
				if (!faces.has(faceKey))
					faces.set(faceKey, {
						name,
						type: text(card.type, "card type"),
						text: text(card.text ?? "", "rules text", true),
						cost: text(card.manaCost ?? "", "mana cost", true),
						attributes: gameplayAttributes(card),
						...(typeof card.artist === "string" ? { artist: card.artist } : {}),
					});
				const identifiers = object(card.identifiers, "identifiers");
				const id = text(card.uuid, "printing UUID");
				printings.set(id, {
					id,
					setCode,
					setName,
					number: text(card.number, "collector number"),
					releasedAt,
					...(typeof identifiers.scryfallId === "string"
						? {
								sourceUrl: `https://scryfall.com/card/${identifiers.scryfallId}`,
							}
						: {}),
				});
			}
			const orderedFaces = [...faces]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([, face]) => face);
			cards.push({
				id: `mtg:${oracle}`,
				name:
					orderedFaces.length > 1
						? orderedFaces.map((face) => face.name).join(" // ")
						: text(latest.name, "card name"),
				type: [...new Set(orderedFaces.map((face) => face.type))].join(" // "),
				text: orderedFaces.map((face) => face.text).join("\n//\n"),
				cost: orderedFaces.map((face) => face.cost).join(" // "),
				colors: [
					...new Set(
						candidates.flatMap(({ card }) =>
							strings(card.colorIdentity, "color identity"),
						),
					),
				].sort(),
				faces: orderedFaces,
				attributes: gameplayAttributes(latest),
				tags: [
					...new Set(
						candidates.flatMap(({ card }) =>
							card.keywords === undefined
								? []
								: strings(card.keywords, "keywords"),
						),
					),
				].sort(),
				printings: [...printings.values()].sort((a, b) =>
					a.id.localeCompare(b.id),
				),
			});
		}
		return {
			version: 1,
			game: "mtg",
			asOf: this.asOf,
			windowStart: this.start,
			sources: [
				{
					name: "MTGJSON AllPrintings — Copyright 2018–present Zach Halpern; MIT licensed, https://mtgjson.com/license/; Magic content © Wizards of the Coast",
					url: MTG_URL,
					retrievedAt,
					...(version ? { version } : {}),
				},
			],
			cards,
		};
	}
}
export async function importMtg(
	asOf: string,
	refresh = false,
): Promise<Catalog> {
	const path = join(DATA, "raw", "AllPrintings.json.gz");
	const source = await download(MTG_URL, path, refresh);
	const normalizer = new MtgNormalizer(asOf);
	for await (const set of printingSets(path)) normalizer.addSet(set);
	const catalog = normalizer.finish(
		source.retrievedAt,
		`sha256:${source.sha256}`,
	);
	await atomicJson(join(DATA, "catalogs", `mtg.${asOf}.json`), catalog);
	await atomicJson(join(DATA, "catalogs", "mtg.latest.json"), catalog);
	return catalog;
}

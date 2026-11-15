import { join } from "node:path";
import type {
	Catalog,
	CatalogCard,
	SourceInfo,
} from "../../src/entities/catalog/types.ts";
import {
	array,
	atomicJson,
	DATA,
	date,
	download,
	english,
	hash,
	json,
	object,
	text,
} from "./storage.ts";

export const GALLERY_HOST = "https://content.publishing.riotgames.com";
const GALLERY_BASE = `${GALLERY_HOST}/publishing-content/v2.0/public/channel/riftbound_website/list/`;
// A comprehensive page avoids the website API's unstable ordering of equal-name variants.
const PAGE_SIZE = 2000;
const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	rsquo: "’",
	lsquo: "‘",
	rdquo: "”",
	ldquo: "“",
	ndash: "–",
	mdash: "—",
	hellip: "…",
	times: "×",
	copy: "©",
	trade: "™",
};
function rulesText(html: string): string {
	return html
		.replace(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi, "$1")
		.replace(/<(?:br|\/p|\/div|\/li)\b[^>]*>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
			if (entity.startsWith("#")) {
				const point =
					entity[1].toLowerCase() === "x"
						? parseInt(entity.slice(2), 16)
						: parseInt(entity.slice(1), 10);
				if (
					point < 0 ||
					point > 0x10ffff ||
					(point >= 0xd800 && point <= 0xdfff)
				)
					throw new Error("Invalid gallery numeric HTML entity");
				return String.fromCodePoint(point);
			}
			const decoded = ENTITIES[entity.toLowerCase()];
			if (decoded === undefined)
				throw new Error(
					`Unknown official gallery HTML entity ${entity}; rules text cannot be silently truncated`,
				);
			return decoded;
		})
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
async function galleryList(
	kind: "cards" | "sets",
	refresh: boolean,
): Promise<{ records: unknown[]; source: SourceInfo }> {
	const records: unknown[] = [],
		hashes: string[] = [],
		emptySlots: number[] = [];
	let total: number | undefined,
		firstRetrieval = "";
	const listName = `riftbound_gallery_${kind}`;
	const verifyEmptySlots = async (
		from: number,
		limit: number,
		expectedRecords: number,
	): Promise<void> => {
		const url = `${GALLERY_BASE}${listName}?locale=en_US&from=${from}&limit=${limit}`;
		const path = join(
			DATA,
			"raw",
			"riftbound-gallery",
			`${kind}.${from}.${limit}.json`,
		);
		const metadata = await download(url, path, refresh);
		hashes.push(metadata.sha256);
		const root = object(await json(path), "gallery slot verification");
		const info = object(root.metadata, "slot metadata"),
			found = array(root.data, "slot data");
		if (
			info.from !== from ||
			info.limit !== limit ||
			info.locale !== "en-us" ||
			info.totalItems !== total ||
			info.channelMachineName !== "riftbound_website" ||
			info.smartListMachineName !== listName
		)
			throw new Error("Gallery coverage changed during missing-slot diagnosis");
		if (found.length > limit || found.length !== expectedRecords)
			throw new Error(
				"Gallery counts changed between page and slot verification; refresh the full catalog later",
			);
		if (found.length === limit) return;
		if (limit === 1) {
			if (found.length !== 0)
				throw new Error("Invalid gallery slot cardinality");
			emptySlots.push(from);
			return;
		}
		const left = Math.floor(limit / 2);
		const leftUrl = `${GALLERY_BASE}${listName}?locale=en_US&from=${from}&limit=${left}`;
		const leftPath = join(
			DATA,
			"raw",
			"riftbound-gallery",
			`${kind}.${from}.${left}.json`,
		);
		await download(leftUrl, leftPath, refresh);
		const leftRecords = array(
			object(await json(leftPath), "left slot response").data,
			"left slot records",
		);
		await verifyEmptySlots(from, left, leftRecords.length);
		await verifyEmptySlots(
			from + left,
			limit - left,
			expectedRecords - leftRecords.length,
		);
	};
	for (let from = 0; total === undefined || from < total; from += PAGE_SIZE) {
		if (from > 100_000)
			throw new Error(
				"Official gallery exceeded bounded pagination; review the source contract",
			);
		const url = `${GALLERY_BASE}${listName}?locale=en_US&from=${from}&limit=${PAGE_SIZE}`;
		const path = join(
			DATA,
			"raw",
			"riftbound-gallery",
			`${kind}.${from}.${PAGE_SIZE}.json`,
		);
		const metadata = await download(url, path, refresh);
		firstRetrieval ||= metadata.retrievedAt;
		hashes.push(metadata.sha256);
		const root = object(await json(path), "official gallery response");
		const page = array(root.data, "gallery data"),
			info = object(root.metadata, "gallery metadata"),
			links = object(root.linkdata, "gallery pagination links");
		if (
			info.channelMachineName !== "riftbound_website" ||
			info.channelHostname !== "playriftbound.com" ||
			info.smartListMachineName !== listName ||
			info.locale !== "en-us" ||
			info.from !== from ||
			info.limit !== PAGE_SIZE ||
			!Number.isSafeInteger(info.totalItems) ||
			(info.totalItems as number) < 1
		)
			throw new Error(
				"Official gallery source/locale/pagination metadata mismatch",
			);
		if (total === undefined) total = info.totalItems as number;
		if (
			total !== info.totalItems ||
			info.totalPages !== Math.ceil(total / PAGE_SIZE)
		)
			throw new Error(
				"Gallery changed during pagination or has inconsistent coverage metadata; refresh the complete source later",
			);
		const expectedCount = Math.min(PAGE_SIZE, total - from);
		if (page.length > expectedCount)
			throw new Error(
				"Gallery returned more records than its declared index coverage",
			);
		if (page.length < expectedCount)
			await verifyEmptySlots(from, expectedCount, page.length);
		const self = new URL(text(links.self, "gallery self link"), GALLERY_HOST);
		if (self.href !== url)
			throw new Error("Gallery pagination self link mismatch");
		if (from + PAGE_SIZE < total) {
			const next = new URL(text(links.next, "gallery next link"), GALLERY_HOST);
			if (
				next.origin !== GALLERY_HOST ||
				next.pathname !== self.pathname ||
				next.searchParams.get("from") !== String(from + PAGE_SIZE) ||
				next.searchParams.get("limit") !== String(PAGE_SIZE) ||
				next.searchParams.get("locale") !== "en_US"
			)
				throw new Error(
					"Unexpected gallery next page; refusing source substitution",
				);
		} else if (links.next)
			throw new Error(
				"Gallery has an unexpected page beyond its reported total",
			);
		records.push(...page);
	}
	if (total === undefined || records.length + emptySlots.length !== total)
		throw new Error(
			"Official gallery index coverage is not fully accounted for",
		);
	return {
		records,
		source: {
			name: `Riot public website gallery ${kind}; LOCAL EVALUATION ONLY, not app registration/API approval; every ${total} indexed slot scanned: ${records.length} available English records, ${emptySlots.length} independently verified empty English slots${emptySlots.length ? ` (${emptySlots.join(",")})` : ""}; no fabricated replacements; previews may be included; no whole-game coverage claim`,
			url: `${GALLERY_BASE}${listName}?locale=en_US&from=0&limit=${PAGE_SIZE}`,
			retrievedAt: firstRetrieval,
			version: `pages-sha256:${hash(hashes)}`,
			localOnly: true,
		},
	};
}
function labeledValues(value: unknown, key: string): string[] {
	if (value === undefined) return [];
	return array(value, key).map((input) =>
		text(object(input, key).label, `${key} label`),
	);
}
export async function importGallery(
	asOf: string,
	refresh = false,
): Promise<Catalog> {
	date(asOf);
	const setList = await galleryList("sets", refresh),
		cardList = await galleryList("cards", refresh);
	const sets = new Map<string, string>();
	for (const input of setList.records) {
		const set = object(input, "official gallery set"),
			id = text(set.id, "set ID");
		if (sets.has(id)) throw new Error("Duplicate official gallery set ID");
		sets.set(id, text(set.name, "set name"));
	}
	const seen = new Set<string>(),
		usedSets = new Set<string>(),
		cards = new Map<string, CatalogCard>();
	for (const input of cardList.records) {
		const record = object(input, "official gallery card");
		const id = text(record.id, "gallery printing ID");
		if (seen.has(id))
			throw new Error(
				`Duplicate gallery printing ${id}; source completeness cannot be claimed`,
			);
		seen.add(id);
		const set = object(
			object(record.set, "gallery set").value,
			"gallery set identity",
		);
		const setCode = text(set.id, "set code"),
			setName = sets.get(setCode);
		if (!setName || set.label !== setName)
			throw new Error(
				"Gallery card references an unknown/mismatched official set",
			);
		usedSets.add(setCode);
		const baseName = text(record.name, "English card name"),
			cardType = object(record.cardType, "card type");
		const subtitle =
			record.subtitle === undefined
				? ""
				: text(record.subtitle, "official subtitle", true);
		const name = subtitle ? `${baseName}, ${subtitle}` : baseName;
		const types = labeledValues(cardType.type, "card types"),
			superTypes = labeledValues(cardType.superType, "supertypes"),
			subTypes = labeledValues(cardType.subType, "subtypes");
		if (!types.length && !superTypes.length) {
			const officialAlt = text(
				object(record.cardImage, "official art").accessibilityText,
				"official type accessibility",
			);
			const match =
				/^Riftbound (Unit|Spell|Gear|Legend|Battlefield|Rune|Token):/.exec(
					officialAlt,
				);
			if (!match)
				throw new Error(
					`Official gallery has neither structured nor accessible type for ${id}`,
				);
			types.push(match[1]);
		}
		const type = [...superTypes, ...types, ...subTypes].join(" — ");
		const image = object(record.cardImage, "official gallery art"),
			imageUrl = text(image.url, "official image URL");
		if (new URL(imageUrl).protocol !== "https:")
			throw new Error("Gallery art must use HTTPS");
		let rules = "";
		if (record.text !== undefined)
			rules = rulesText(
				text(
					object(object(record.text, "official rules").richText, "rich rules")
						.body,
					"official rules HTML",
					true,
				),
			);
		if (record.effect !== undefined) {
			const effect = rulesText(
				text(
					object(
						object(record.effect, "official effect").richText,
						"rich effect",
					).body,
					"official effect HTML",
					true,
				),
			);
			if (effect && effect !== rules)
				rules = [rules, `Effect: ${effect}`].filter(Boolean).join("\n");
		}
		const attributes: Record<string, string | number> = {};
		for (const key of ["energy", "power", "might", "mightBonus"])
			if (record[key] !== undefined) {
				const value = object(object(record[key], key).value, `${key} value`);
				attributes[key] =
					typeof value.id === "number" && Number.isFinite(value.id)
						? value.id
						: text(value.label, `${key} label`, true);
			}
		const domains =
			record.domain === undefined
				? []
				: labeledValues(object(record.domain, "domains").values, "domains");
		const officialTags =
			record.tags === undefined
				? []
				: array(object(record.tags, "official tags").tags, "official tags").map(
						(value) => text(value, "official tag"),
					);
		const tags = [
			...new Set([...officialTags, ...superTypes, ...subTypes]),
		].sort();
		const cost = Object.entries(attributes)
			.filter(([key]) => key === "energy" || key === "power")
			.map(([key, value]) => `${key}: ${value}`)
			.join("; ");
		const artist =
			record.illustrator === undefined
				? ""
				: labeledValues(
						object(record.illustrator, "illustrator").values,
						"illustrators",
					).join(", ");
		const identity = `riftbound:${hash({ name, type, rules, attributes, domains: [...domains].sort(), tags })}`;
		const number = text(record.publicCode, "official public collector code");
		const printing = {
			id,
			setCode,
			setName,
			number,
			sourceUrl: "https://playriftbound.com/en-us/card-gallery/",
			image: imageUrl,
		};
		const existing = cards.get(identity);
		if (existing) existing.printings.push(printing);
		else
			cards.set(identity, {
				id: identity,
				name,
				type,
				text: rules,
				cost,
				colors: domains,
				attributes,
				tags,
				faces: [
					{
						name,
						type,
						text: rules,
						cost,
						image: imageUrl,
						artist,
						attributes,
					},
				],
				printings: [printing],
			});
	}
	if (usedSets.size !== sets.size)
		throw new Error(
			`Official gallery set coverage mismatch: ${usedSets.size} populated sets of ${sets.size} listed`,
		);
	const catalog: Catalog = {
		version: 1,
		game: "riftbound",
		asOf,
		sources: [setList.source, cardList.source],
		cards: [...cards.values()].sort((a, b) => a.id.localeCompare(b.id)),
	};
	english(catalog, "official English gallery catalog");
	await atomicJson(join(DATA, "catalogs", `riftbound.${asOf}.json`), catalog);
	await atomicJson(join(DATA, "catalogs", "riftbound.latest.json"), catalog);
	return catalog;
}

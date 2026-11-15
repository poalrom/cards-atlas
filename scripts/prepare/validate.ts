import type {
	AtlasCategory,
	AtlasManifest,
	AtlasSnapshot,
	CardAnalysis,
	Catalog,
	CatalogCard,
	ManifestGame,
	SimilarCard,
	SourceInfo,
} from "../../src/entities/catalog/types.ts";
import {
	array,
	date,
	english,
	exact,
	object,
	strings,
	text,
} from "./storage.ts";

function fields(
	record: Record<string, unknown>,
	required: string[],
	optional: string[],
	context: string,
): void {
	if (
		required.some((key) => !(key in record)) ||
		Object.keys(record).some(
			(key) => !required.includes(key) && !optional.includes(key),
		)
	)
		throw new Error(`${context}: unexpected or missing fields`);
}
function sourceUrl(value: unknown): string {
	const url = text(value, "source URL");
	const parsed = new URL(url);
	if (
		parsed.protocol !== "https:" ||
		parsed.username ||
		parsed.password ||
		/(?:token|key|secret|auth)=/i.test(parsed.search)
	)
		throw new Error("Unsafe source URL");
	return url;
}
function attributes(value: unknown): Record<string, string | number> {
	const raw = object(value, "gameplay attributes");
	const result: Record<string, string | number> = {};
	for (const [key, item] of Object.entries(raw)) {
		if (
			!/^[a-zA-Z][a-zA-Z -]{0,40}$/.test(key) ||
			/price|money|token|secret|auth|balance/i.test(key) ||
			(typeof item !== "string" && typeof item !== "number") ||
			(typeof item === "number" && !Number.isFinite(item))
		)
			throw new Error("Invalid gameplay attribute");
		result[key] = item;
	}
	return result;
}
export function validateCatalog(value: unknown): Catalog {
	const root = object(value, "catalog");
	fields(
		root,
		["version", "game", "asOf", "sources", "cards"],
		["windowStart"],
		"catalog",
	);
	if (root.version !== 1 || (root.game !== "mtg" && root.game !== "riftbound"))
		throw new Error("Unsupported catalog version/game");
	const asOf = date(text(root.asOf, "asOf"));
	const windowStart =
		root.windowStart === undefined
			? undefined
			: date(text(root.windowStart, "windowStart"));
	if (root.game === "mtg" && !windowStart)
		throw new Error("MTG catalog must specify its rolling calendar window");
	const sources: SourceInfo[] = array(root.sources, "sources").map((value) => {
		const source = object(value, "source");
		fields(
			source,
			["name", "url", "retrievedAt"],
			["version", "localOnly"],
			"source",
		);
		if (source.localOnly !== undefined && typeof source.localOnly !== "boolean")
			throw new Error("Invalid source local-only restriction");
		const retrievedAt = text(source.retrievedAt, "retrievedAt");
		if (!Number.isFinite(Date.parse(retrievedAt)))
			throw new Error("Invalid source retrieval timestamp");
		return {
			name: text(source.name, "source name"),
			url: sourceUrl(source.url),
			retrievedAt,
			...(source.version === undefined
				? {}
				: { version: text(source.version, "source version") }),
			...(source.localOnly === undefined
				? {}
				: { localOnly: source.localOnly }),
		};
	});
	if (!sources.length) throw new Error("Catalog requires provenance");
	const identities = new Set<string>(),
		printings = new Set<string>();
	const cards: CatalogCard[] = array(root.cards, "cards").map((value) => {
		const card = object(value, "card");
		fields(
			card,
			["id", "name", "type", "text", "cost", "colors", "faces", "printings"],
			["attributes", "tags"],
			"card",
		);
		const id = text(card.id, "card identity");
		if (!id.startsWith(`${root.game}:`) || identities.has(id))
			throw new Error("Duplicate/foreign card identity");
		identities.add(id);
		const faces = array(card.faces, "faces").map((value) => {
			const face = object(value, "face");
			fields(
				face,
				["name", "type", "text", "cost"],
				["image", "artist", "attributes"],
				"face",
			);
			return {
				name: text(face.name, "face name"),
				type: text(face.type, "face type"),
				text: text(face.text, "face rules", true),
				cost: text(face.cost, "face cost", true),
				...(face.image === undefined ? {} : { image: sourceUrl(face.image) }),
				...(face.artist === undefined
					? {}
					: { artist: text(face.artist, "artist", true) }),
				...(face.attributes === undefined
					? {}
					: { attributes: attributes(face.attributes) }),
			};
		});
		const records = array(card.printings, "printings").map((value) => {
			const printing = object(value, "printing");
			fields(
				printing,
				["id", "setCode", "setName", "number"],
				["releasedAt", "sourceUrl", "image"],
				"printing",
			);
			const printingId = text(printing.id, "printing ID");
			if (printings.has(printingId))
				throw new Error("Printing occurs more than once in the catalog");
			printings.add(printingId);
			const releasedAt =
				printing.releasedAt === undefined
					? undefined
					: date(text(printing.releasedAt, "printing date"));
			if (
				root.game === "mtg" &&
				(!releasedAt ||
					releasedAt > asOf ||
					(windowStart && releasedAt < windowStart))
			)
				throw new Error("MTG printing outside the inclusive release window");
			return {
				id: printingId,
				setCode: text(printing.setCode, "set code"),
				setName: text(printing.setName, "set name"),
				number: text(printing.number, "number"),
				...(releasedAt ? { releasedAt } : {}),
				...(printing.sourceUrl === undefined
					? {}
					: { sourceUrl: sourceUrl(printing.sourceUrl) }),
				...(printing.image === undefined
					? {}
					: { image: sourceUrl(printing.image) }),
			};
		});
		if (!faces.length || !records.length)
			throw new Error("Every card needs complete faces and eligible printings");
		const colors = strings(card.colors, "colors");
		if (new Set(colors).size !== colors.length)
			throw new Error("Duplicate color/domain labels");
		return {
			id,
			name: text(card.name, "name"),
			type: text(card.type, "type"),
			text: text(card.text, "rules", true),
			cost: text(card.cost, "cost", true),
			colors,
			faces,
			printings: records,
			...(card.attributes === undefined
				? {}
				: { attributes: attributes(card.attributes) }),
			...(card.tags === undefined
				? {}
				: { tags: strings(card.tags, "card tags") }),
		};
	});
	if (!cards.length) throw new Error("Empty catalog is not publishable");
	const catalog: Catalog = {
		version: 1,
		game: root.game,
		asOf,
		...(windowStart ? { windowStart } : {}),
		sources,
		cards,
	};
	english(catalog, "catalog");
	return catalog;
}
export function validateSnapshot(value: unknown): AtlasSnapshot {
	const root = object(value, "snapshot");
	fields(
		root,
		[
			"version",
			"game",
			"asOf",
			"sources",
			"cards",
			"id",
			"generatedAt",
			"model",
			"layout",
			"categories",
		],
		["windowStart"],
		"snapshot",
	);
	const rawCards = array(root.cards, "atlas cards").map((value) => {
		const card = object(value, "atlas card");
		fields(
			card,
			[
				"id",
				"name",
				"type",
				"text",
				"cost",
				"colors",
				"faces",
				"printings",
				"analysis",
				"x",
				"y",
				"similar",
			],
			["attributes", "tags"],
			"atlas card",
		);
		return card;
	});
	const catalog = validateCatalog({
		version: root.version,
		game: root.game,
		asOf: root.asOf,
		...(root.windowStart ? { windowStart: root.windowStart } : {}),
		sources: root.sources,
		cards: rawCards.map(
			({ analysis: _analysis, x: _x, y: _y, similar: _similar, ...card }) =>
				card,
		),
	});
	const id = text(root.id, "snapshot ID"),
		generatedAt = text(root.generatedAt, "generation date");
	const model = object(root.model, "model"),
		layout = object(root.layout, "layout");
	exact(model, ["name", "reasoning"], "model");
	exact(layout, ["method", "description"], "layout");
	if (
		!/^[a-f0-9]{64}$/.test(id) ||
		!Number.isFinite(Date.parse(generatedAt)) ||
		model.name !== "gpt-6-luna" ||
		model.reasoning !== "low"
	)
		throw new Error("Invalid snapshot provenance");
	const coordinate = (value: unknown): number => {
		if (
			typeof value !== "number" ||
			!Number.isFinite(value) ||
			value < 0 ||
			value > 1
		)
			throw new Error("Invalid semantic coordinate");
		return value;
	};
	const categories: AtlasCategory[] = array(root.categories, "categories").map(
		(value) => {
			const category = object(value, "atlas category");
			exact(
				category,
				["id", "name", "description", "color", "x", "y", "count"],
				"atlas category",
			);
			if (
				!Number.isSafeInteger(category.count) ||
				(category.count as number) < 0
			)
				throw new Error("Invalid category count");
			const categoryId = text(category.id, "category ID");
			if (!/^[a-z][a-z0-9-]{1,63}$/.test(categoryId))
				throw new Error("Invalid category identity");
			const color = text(category.color, "category color");
			if (!/^(?:#[a-fA-F0-9]{6}|hsl\(\d{1,3} \d{1,3}% \d{1,3}%\))$/.test(color))
				throw new Error("Invalid category color");
			return {
				id: categoryId,
				name: text(category.name, "category name"),
				description: text(category.description, "category description"),
				color,
				x: coordinate(category.x),
				y: coordinate(category.y),
				count: category.count as number,
			};
		},
	);
	const categoryIds = new Set(categories.map(({ id }) => id));
	const ids = new Set(catalog.cards.map(({ id }) => id));
	if (!categoryIds.size || categoryIds.size !== categories.length)
		throw new Error("Missing/duplicate snapshot categories");
	const counts = new Map<string, number>();
	const cards = catalog.cards.map((card, index) => {
		const raw = rawCards[index],
			analysis = object(raw.analysis, "analysis");
		exact(
			analysis,
			["categories", "summary", "effects", "keywords"],
			"analysis",
		);
		const memberships = strings(analysis.categories, "card categories");
		if (
			!memberships.length ||
			memberships.length > 12 ||
			new Set(memberships).size !== memberships.length
		)
			throw new Error("Missing/duplicate card classification");
		for (const categoryId of memberships) {
			if (!categoryIds.has(categoryId))
				throw new Error("Foreign category membership");
			counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
		}
		const summary = text(analysis.summary, "summary");
		const keywords = strings(analysis.keywords, "keywords");
		if (
			summary.length > 800 ||
			keywords.length > 32 ||
			new Set(keywords).size !== keywords.length
		)
			throw new Error("Oversized/duplicate analysis");
		const effects = array(analysis.effects, "effects").map((input) => {
			const effect = object(input, "effect");
			exact(effect, ["action", "targets", "conditions", "mode"], "effect");
			const targets = strings(effect.targets, "targets"),
				conditions = strings(effect.conditions, "conditions");
			if (
				targets.length > 12 ||
				conditions.length > 12 ||
				new Set(targets).size !== targets.length ||
				new Set(conditions).size !== conditions.length
			)
				throw new Error("Oversized/duplicate effect features");
			return {
				action: text(effect.action, "action"),
				targets,
				conditions,
				mode: effect.mode === null ? null : text(effect.mode, "mode"),
			};
		});
		if (effects.length > 24) throw new Error("Oversized effect list");
		const seen = new Set<string>();
		const similar: SimilarCard[] = array(raw.similar, "neighbors").map(
			(input) => {
				const neighbor = object(input, "neighbor");
				exact(neighbor, ["id", "score", "shared"], "neighbor");
				const neighborId = text(neighbor.id, "neighbor ID"),
					shared = strings(neighbor.shared, "shared features");
				if (
					!ids.has(neighborId) ||
					neighborId === card.id ||
					seen.has(neighborId) ||
					typeof neighbor.score !== "number" ||
					!Number.isFinite(neighbor.score) ||
					neighbor.score < 0 ||
					neighbor.score > 1 ||
					!shared.length ||
					shared.length > 6
				)
					throw new Error("Invalid semantic neighbor");
				seen.add(neighborId);
				return { id: neighborId, score: neighbor.score, shared };
			},
		);
		if (similar.length > 8) throw new Error("Oversized neighbor list");
		const checkedAnalysis: CardAnalysis = {
			categories: memberships,
			summary,
			keywords,
			effects,
		};
		return {
			...card,
			analysis: checkedAnalysis,
			x: coordinate(raw.x),
			y: coordinate(raw.y),
			similar,
		};
	});
	for (const category of categories)
		if (category.count !== (counts.get(category.id) ?? 0))
			throw new Error("Invalid category membership count");
	const snapshot: AtlasSnapshot = {
		...catalog,
		id,
		generatedAt,
		model: { name: "gpt-6-luna", reasoning: "low" },
		layout: {
			method: text(layout.method, "layout method"),
			description: text(layout.description, "layout description"),
		},
		categories,
		cards,
	};
	english(snapshot, "snapshot");
	return snapshot;
}
export function validateManifest(value: unknown): AtlasManifest {
	const root = object(value, "manifest");
	exact(root, ["version", "games"], "manifest");
	if (root.version !== 1) throw new Error("Unsupported manifest");
	const games = array(root.games, "manifest games").map(
		(input): ManifestGame => {
			const entry = object(input, "manifest game");
			fields(
				entry,
				["id", "name"],
				["snapshot", "cardCount", "asOf", "unavailableReason"],
				"manifest game",
			);
			if (entry.id !== "mtg" && entry.id !== "riftbound")
				throw new Error("Unknown manifest game");
			const id = entry.id;
			const name = text(entry.name, "game name");
			if (entry.snapshot !== undefined) {
				const snapshot = text(entry.snapshot, "snapshot path");
				if (
					!new RegExp(`^${id}\\.[a-f0-9]{64}\\.json$`).test(snapshot) ||
					!Number.isSafeInteger(entry.cardCount) ||
					(entry.cardCount as number) < 1 ||
					entry.unavailableReason !== undefined
				)
					throw new Error("Invalid available manifest entry");
				return {
					id,
					name,
					snapshot,
					cardCount: entry.cardCount as number,
					asOf: date(text(entry.asOf, "snapshot date")),
				};
			}
			if (entry.cardCount !== undefined || entry.asOf !== undefined)
				throw new Error("Unavailable game cannot claim catalog counts");
			return {
				id,
				name,
				unavailableReason: text(
					entry.unavailableReason,
					"honest unavailable reason",
				),
			};
		},
	);
	if (games.length !== 2 || new Set(games.map(({ id }) => id)).size !== 2)
		throw new Error(
			"Manifest must include both independent games exactly once",
		);
	english(games, "manifest");
	return { version: 1, games };
}

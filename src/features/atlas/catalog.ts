import type {
	AtlasCard,
	AtlasCategory,
	AtlasManifest,
	AtlasSnapshot,
	CardFace,
	GameId,
	ManifestGame,
	Printing,
	SourceInfo,
} from "../../entities/catalog/types.ts";

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Expected a data object.");
	return value as Record<string, unknown>;
}
function text(value: unknown): string {
	if (typeof value !== "string") throw new Error("Expected a text field.");
	return value;
}
function required(value: unknown): string {
	const result = text(value);
	if (!result.trim()) throw new Error("A required data field is empty.");
	return result;
}
function number(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value))
		throw new Error("Invalid numeric data.");
	return value;
}
function array<T>(value: unknown, parse: (entry: unknown) => T): T[] {
	if (!Array.isArray(value)) throw new Error("Expected a data list.");
	return value.map(parse);
}
function optional(value: unknown): string | undefined {
	return value === undefined ? undefined : text(value);
}
function date(value: unknown): string {
	const result = required(value);
	if (
		!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(result) ||
		!Number.isFinite(Date.parse(result))
	)
		throw new Error("Invalid snapshot date.");
	return result;
}
function url(value: unknown): string {
	const result = required(value);
	if (!/^https?:\/\//i.test(result)) throw new Error("Invalid source URL.");
	new URL(result);
	return result;
}
function optionalUrl(value: unknown): string | undefined {
	return value === undefined ? undefined : url(value);
}
function unique(ids: string[]): void {
	if (new Set(ids).size !== ids.length)
		throw new Error("Duplicate identifiers in published data.");
}
function attributes(
	value: unknown,
): Record<string, string | number> | undefined {
	if (value === undefined) return undefined;
	return Object.fromEntries(
		Object.entries(object(value)).map(([key, entry]) => [
			required(key),
			typeof entry === "number" ? number(entry) : text(entry),
		]),
	);
}
export function isGame(value: string): value is GameId {
	return value === "riftbound" || value === "mtg";
}
export function parseManifest(value: unknown): AtlasManifest {
	const data = object(value);
	if (data.version !== 1) throw new Error("Unsupported manifest version.");
	const games = array(data.games, (entry): ManifestGame => {
		const game = object(entry);
		const id = required(game.id);
		if (!isGame(id)) throw new Error("Unknown game in manifest.");
		const snapshot = optional(game.snapshot);
		if (
			snapshot !== undefined &&
			!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(snapshot)
		)
			throw new Error("Invalid snapshot file path.");
		const cardCount =
			game.cardCount === undefined ? undefined : number(game.cardCount);
		if (
			cardCount !== undefined &&
			(!Number.isInteger(cardCount) || cardCount < 0)
		)
			throw new Error("Invalid catalog count.");
		return {
			id,
			name: required(game.name),
			snapshot,
			cardCount,
			asOf: game.asOf === undefined ? undefined : date(game.asOf),
			unavailableReason: optional(game.unavailableReason),
		};
	});
	unique(games.map((game) => game.id));
	if (games.length !== 2)
		throw new Error("The manifest must describe both game catalogs.");
	return { version: 1, games };
}
function parseFace(value: unknown): CardFace {
	const face = object(value);
	return {
		name: required(face.name),
		type: text(face.type),
		text: text(face.text),
		cost: text(face.cost),
		image: optionalUrl(face.image),
		artist: optional(face.artist),
		attributes: attributes(face.attributes),
	};
}
function parsePrinting(value: unknown): Printing {
	const printing = object(value);
	return {
		id: required(printing.id),
		setCode: text(printing.setCode),
		setName: text(printing.setName),
		number: text(printing.number),
		releasedAt:
			printing.releasedAt === undefined ? undefined : date(printing.releasedAt),
		sourceUrl: optionalUrl(printing.sourceUrl),
		image: optionalUrl(printing.image),
		face: printing.face === undefined ? undefined : parseFace(printing.face),
		tags: printing.tags === undefined ? undefined : array(printing.tags, text),
	};
}
function parseSource(value: unknown): SourceInfo {
	const source = object(value);
	if (source.localOnly !== undefined && typeof source.localOnly !== "boolean")
		throw new Error("Invalid source evaluation flag.");
	return {
		name: required(source.name),
		url: url(source.url),
		retrievedAt: date(source.retrievedAt),
		version: optional(source.version),
		localOnly: source.localOnly,
	};
}
function parseCategory(value: unknown): AtlasCategory {
	const category = object(value);
	const color = required(category.color);
	if (!/^#[a-f\d]{6}$/i.test(color)) throw new Error("Invalid category color.");
	return {
		id: required(category.id),
		name: required(category.name),
		description: text(category.description),
		color,
		x: number(category.x),
		y: number(category.y),
		count: number(category.count),
	};
}
function parseCard(value: unknown): AtlasCard {
	const card = object(value);
	const analysis = object(card.analysis);
	return {
		id: required(card.id),
		name: required(card.name),
		type: text(card.type),
		text: text(card.text),
		cost: text(card.cost),
		colors: array(card.colors, text),
		faces: array(card.faces, parseFace),
		printings: array(card.printings, parsePrinting),
		x: number(card.x),
		y: number(card.y),
		attributes: attributes(card.attributes),
		tags: card.tags === undefined ? undefined : array(card.tags, text),
		analysis: {
			categories: array(analysis.categories, required),
			summary: required(analysis.summary),
			keywords: array(analysis.keywords, text),
			effects: array(analysis.effects, (entry) => {
				const effect = object(entry);
				return {
					action: required(effect.action),
					targets: array(effect.targets, text),
					conditions: array(effect.conditions, text),
					mode: effect.mode === null ? null : text(effect.mode),
				};
			}),
		},
		similar: array(card.similar, (entry) => {
			const neighbor = object(entry);
			const score = number(neighbor.score);
			if (score < 0 || score > 1) throw new Error("Invalid similarity score.");
			return {
				id: required(neighbor.id),
				score,
				shared: array(neighbor.shared, required),
			};
		}),
	};
}
export function parseSnapshot(value: unknown, game: GameId): AtlasSnapshot {
	const data = object(value);
	if (data.version !== 1 || data.game !== game)
		throw new Error("The snapshot does not match the selected game.");
	const model = object(data.model);
	if (model.name !== "gpt-6-luna" || model.reasoning !== "low")
		throw new Error("The snapshot uses an unapproved analysis model.");
	const layout = object(data.layout);
	const categories = array(data.categories, parseCategory);
	const cards = array(data.cards, parseCard);
	if (!cards.length)
		throw new Error("The published snapshot contains no cards.");
	unique(categories.map((category) => category.id));
	unique(cards.map((card) => card.id));
	const ids = new Set(cards.map((card) => card.id));
	const categoryIds = new Set(categories.map((category) => category.id));
	const counts = new Map<string, number>();
	for (const card of cards) {
		unique(card.analysis.categories);
		unique(card.similar.map((neighbor) => neighbor.id));
		unique(card.printings.map((printing) => printing.id));
		if (!card.faces.length || !card.printings.length)
			throw new Error("A card is missing original faces or printings.");
		for (const id of card.analysis.categories) {
			if (!categoryIds.has(id))
				throw new Error("A card references an unknown category.");
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		for (const neighbor of card.similar) {
			if (
				!ids.has(neighbor.id) ||
				neighbor.id === card.id ||
				!neighbor.shared.length
			)
				throw new Error("Invalid precomputed neighbor reference.");
		}
	}
	for (const category of categories) {
		if (category.count !== (counts.get(category.id) ?? 0))
			throw new Error("Category counts do not match the snapshot.");
	}
	const sources = array(data.sources, parseSource);
	if (!sources.length) throw new Error("The snapshot has no data provenance.");
	const asOf = date(data.asOf);
	const windowStart =
		data.windowStart === undefined ? undefined : date(data.windowStart);
	if (game === "mtg" && !windowStart)
		throw new Error("The Magic snapshot has no release window.");
	for (const card of cards) {
		for (const printing of card.printings) {
			if (
				printing.releasedAt &&
				printing.releasedAt.slice(0, 10) > asOf.slice(0, 10)
			)
				throw new Error("The snapshot includes a future printing.");
		}
	}
	return {
		version: 1,
		id: required(data.id),
		game,
		asOf,
		windowStart,
		generatedAt: date(data.generatedAt),
		sources,
		model: { name: "gpt-6-luna", reasoning: "low" },
		layout: {
			method: required(layout.method),
			description: required(layout.description),
		},
		categories,
		cards,
	};
}

export function createCardSearch(
	cards: AtlasCard[],
): (query: string) => AtlasCard[] {
	const index = cards.map((card) => ({
		card,
		text: [
			card.name,
			card.type,
			card.text,
			...(card.tags ?? []),
			...Object.entries(card.attributes ?? {}).flatMap(([key, value]) => [
				key,
				String(value),
			]),
			...card.faces.flatMap((face) => [
				face.name,
				face.type,
				face.text,
				...Object.entries(face.attributes ?? {}).flatMap(([key, value]) => [
					key,
					String(value),
				]),
			]),
		]
			.join("\n")
			.toLowerCase(),
	}));
	return (query) => {
		const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
		if (!terms.length) return cards;
		return index
			.filter((entry) => terms.every((term) => entry.text.includes(term)))
			.map((entry) => entry.card);
	};
}

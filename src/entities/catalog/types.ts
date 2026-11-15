export type GameId = "riftbound" | "mtg";

export interface CardFace {
	name: string;
	type: string;
	text: string;
	cost: string;
	image?: string;
	attributes?: Record<string, string | number>;
	artist?: string;
}

export interface Printing {
	id: string;
	setCode: string;
	setName: string;
	number: string;
	releasedAt?: string;
	sourceUrl?: string;
	image?: string;
	face?: CardFace;
	tags?: string[];
}

export interface CatalogCard {
	id: string;
	name: string;
	type: string;
	text: string;
	cost: string;
	colors: string[];
	faces: CardFace[];
	printings: Printing[];
	attributes?: Record<string, string | number>;
	tags?: string[];
}

export interface SourceInfo {
	name: string;
	url: string;
	retrievedAt: string;
	version?: string;
	localOnly?: boolean;
}

export interface Catalog {
	version: 1;
	game: GameId;
	asOf: string;
	windowStart?: string;
	sources: SourceInfo[];
	cards: CatalogCard[];
}

export interface Category {
	id: string;
	name: string;
	description: string;
}

export interface CardEffect {
	action: string;
	targets: string[];
	conditions: string[];
	mode: string | null;
}

export interface CardAnalysis {
	categories: string[];
	summary: string;
	effects: CardEffect[];
	keywords: string[];
}

export interface SimilarCard {
	id: string;
	score: number;
	shared: string[];
}

export interface AtlasCard extends CatalogCard {
	analysis: CardAnalysis;
	x: number;
	y: number;
	similar: SimilarCard[];
}

export interface AtlasCategory extends Category {
	color: string;
	x: number;
	y: number;
	count: number;
}

export interface AtlasSnapshot extends Omit<Catalog, "cards"> {
	id: string;
	generatedAt: string;
	model: { name: "gpt-6-luna"; reasoning: "low" };
	layout: { method: string; description: string };
	categories: AtlasCategory[];
	cards: AtlasCard[];
}

export interface ManifestGame {
	id: GameId;
	name: string;
	snapshot?: string;
	cardCount?: number;
	asOf?: string;
	unavailableReason?: string;
}

export interface AtlasManifest {
	version: 1;
	games: ManifestGame[];
}

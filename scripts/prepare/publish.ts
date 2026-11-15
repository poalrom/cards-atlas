import { link, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
	AtlasManifest,
	AtlasSnapshot,
	CardAnalysis,
	Catalog,
	GameId,
} from "../../src/entities/catalog/types.ts";
import type { Taxonomy } from "./analysis.ts";
import { MODEL } from "./codex.ts";
import { LAYOUT, semanticAtlas } from "./semantic.ts";
import { atomicJson, DATA, exists, hash, json, object } from "./storage.ts";
import { validateManifest, validateSnapshot } from "./validate.ts";

export const UNAVAILABLE: AtlasManifest = {
	version: 1,
	games: [
		{
			id: "riftbound",
			name: "Riftbound",
			unavailableReason:
				"The official authenticated Riot catalog and complete locally prepared analysis have not been published. An approved RIOT_API_KEY and included-only ChatGPT generation preflight are required.",
		},
		{
			id: "mtg",
			name: "Magic: The Gathering",
			unavailableReason:
				"A complete MTGJSON paper-card catalog for the last 12 calendar months and its locally prepared analysis have not been published. No sample or partial catalog is substituted.",
		},
	],
};
export async function readManifest(
	directory = "public/data",
): Promise<AtlasManifest> {
	const path = join(directory, "manifest.json");
	return (await exists(path))
		? validateManifest(await json(path))
		: validateManifest(UNAVAILABLE);
}
export async function publishSnapshot(
	catalog: Catalog,
	taxonomy: Taxonomy,
	analyses: Map<string, CardAnalysis>,
	directory = "public/data",
): Promise<{ snapshot: string; cardCount: number }> {
	const localOnly = catalog.sources.some(
		(source) =>
			source.localOnly ||
			source.url.startsWith("https://content.publishing.riotgames.com/"),
	);
	if (localOnly && resolve(directory) !== resolve(DATA, "local-site", "data"))
		throw new Error(
			"Official public gallery data is authorized for local evaluation only. Use --output .data/local-site/data; public publication requires registered approved Riot API access and a new authenticated source import.",
		);
	const atlas = semanticAtlas(catalog, taxonomy, analyses);
	const content = { ...catalog, model: MODEL, layout: LAYOUT, ...atlas };
	const id = hash(content);
	const filename = `${catalog.game}.${id}.json`;
	const path = join(directory, filename);
	await mkdir(directory, { recursive: true });
	if (await exists(path)) {
		const previous = object(await json(path), "immutable snapshot");
		validateSnapshot(previous);
		// Validation reconstructs objects; hash the stored content, not its reordered projection.
		const {
			id: previousId,
			generatedAt: _generatedAt,
			...previousContent
		} = previous;
		if (previousId !== id || hash(previousContent) !== id)
			throw new Error(
				"Existing immutable snapshot does not match its content identity; refusing to replace it",
			);
	} else {
		const snapshot: AtlasSnapshot = {
			...content,
			id,
			generatedAt: new Date().toISOString(),
		};
		validateSnapshot(snapshot);
		// Immutable content is installed fully before the single atomic manifest switch.
		// A crash may leave an unreferenced complete file, never a partially referenced snapshot.
		const temporary = `${path}.${process.pid}.tmp`;
		await atomicJson(temporary, snapshot);
		try {
			await link(temporary, path);
		} finally {
			await rm(temporary, { force: true });
		}
		validateSnapshot(await json(path));
	}
	const manifest = await readManifest(directory);
	manifest.games = manifest.games.map((game) =>
		game.id === catalog.game
			? {
					id: game.id,
					name: game.name,
					snapshot: filename,
					cardCount: catalog.cards.length,
					asOf: catalog.asOf,
				}
			: game,
	);
	validateManifest(manifest);
	await atomicJson(join(directory, "manifest.json"), manifest);
	return { snapshot: filename, cardCount: catalog.cards.length };
}
export async function markUnavailable(
	game: GameId,
	reason: string,
	directory = "public/data",
): Promise<void> {
	const manifest = await readManifest(directory);
	const entry = manifest.games.find((entry) => entry.id === game);
	if (!entry) throw new Error(`Missing manifest game ${game}`);
	if (entry.snapshot)
		throw new Error(
			"A valid prior snapshot exists; preparation failure must preserve it. Do not replace it with an unavailable entry.",
		);
	entry.unavailableReason = reason;
	validateManifest(manifest);
	await atomicJson(join(directory, "manifest.json"), manifest);
}

import type {
	AtlasCard,
	AtlasCategory,
	CardAnalysis,
	Catalog,
	SimilarCard,
} from "../../src/entities/catalog/types.ts";
import type { Taxonomy } from "./analysis.ts";
import { hash } from "./storage.ts";

const SEED = "cards-atlas-semantic-projection-v1";
const POSTING_LIMIT = 128;
const CANDIDATE_LIMIT = 768;
export const LAYOUT = {
	method: "canonical-tfidf-seeded-sparse-projection-v1",
	description:
		"Canonical action/target/condition/mode interactions, keywords and overlapping categories form weighted TF-IDF unit vectors. Two independent SHA-256-seeded signed projections produce semantic coordinates, linearly normalized within this complete snapshot. Positions are deterministic for identical inputs, not decorative; 2D projection loses information and is not a gameplay-equivalence claim. Neighbors use cosine over semantic vectors with deterministic capped inverted-index candidates (128 per feature, 768 per card), so retrieval is approximate, not exhaustive coverage. Category labels sit at member centroids. Layouts can shift when the corpus or vocabulary changes.",
};
export function semanticFeatures(analysis: CardAnalysis): Map<string, number> {
	const features = new Map<string, number>();
	const add = (key: string, weight: number) =>
		features.set(key, Math.max(features.get(key) ?? 0, weight));
	for (const category of analysis.categories) add(`category:${category}`, 1.5);
	for (const keyword of analysis.keywords) add(`keyword:${keyword}`, 0.7);
	for (const effect of analysis.effects) {
		add(`action:${effect.action}`, 2);
		for (const target of effect.targets) {
			add(`target:${target}`, 0.75);
			add(`action-target:${effect.action}/${target}`, 2);
		}
		for (const condition of effect.conditions) {
			add(`condition:${condition}`, 1);
			add(`action-condition:${effect.action}/${condition}`, 1.5);
		}
		if (effect.mode) {
			add(`mode:${effect.mode}`, 1);
			add(`action-mode:${effect.action}/${effect.mode}`, 1.5);
		}
	}
	return features;
}
export function semanticAtlas(
	catalog: Catalog,
	taxonomy: Taxonomy,
	analyses: Map<string, CardAnalysis>,
): { cards: AtlasCard[]; categories: AtlasCategory[] } {
	const cards = [...catalog.cards].sort((a, b) => a.id.localeCompare(b.id));
	if (analyses.size !== cards.length)
		throw new Error("Cannot lay out an incomplete/foreign analysis set");
	const frequencies = new Map<string, number>();
	const vectors = cards.map((card) => {
		const analysis = analyses.get(card.id);
		if (!analysis) throw new Error(`Missing analysis for ${card.id}`);
		const features = semanticFeatures(analysis);
		for (const feature of features.keys())
			frequencies.set(feature, (frequencies.get(feature) ?? 0) + 1);
		return features;
	});
	const postings = new Map<string, number[]>();
	const projection = new Map<string, [number, number]>();
	for (const feature of frequencies.keys()) {
		const digest = hash(`${SEED}:${feature}`);
		projection.set(feature, [
			(parseInt(digest.slice(0, 8), 16) / 0xffffffff) * 2 - 1,
			(parseInt(digest.slice(8, 16), 16) / 0xffffffff) * 2 - 1,
		]);
	}
	const coordinates = vectors.map((vector, index) => {
		let normSquared = 0;
		for (const [feature, weight] of vector) {
			const weighted =
				weight *
				(Math.log((cards.length + 1) / ((frequencies.get(feature) ?? 0) + 1)) +
					1);
			vector.set(feature, weighted);
			normSquared += weighted * weighted;
			const posting = postings.get(feature) ?? [];
			posting.push(index);
			postings.set(feature, posting);
		}
		if (!normSquared)
			throw new Error(`No semantic features for ${cards[index].id}`);
		const norm = Math.sqrt(normSquared);
		let x = 0,
			y = 0;
		for (const [feature, weight] of vector) {
			const value = weight / norm;
			vector.set(feature, value);
			const axis = projection.get(feature);
			if (!axis) throw new Error(`Missing semantic projection for ${feature}`);
			x += axis[0] * value;
			y += axis[1] * value;
		}
		return { x, y };
	});
	const ranks = cards.map((card) => hash(`${SEED}:${card.id}`));
	for (const [feature, posting] of postings)
		postings.set(
			feature,
			posting
				.sort((a, b) => ranks[a].localeCompare(ranks[b]))
				.slice(0, POSTING_LIMIT),
		);
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const point of coordinates) {
		minX = Math.min(minX, point.x);
		maxX = Math.max(maxX, point.x);
		minY = Math.min(minY, point.y);
		maxY = Math.max(maxY, point.y);
	}
	const categoryNames = new Map(
		taxonomy.categories.map((category) => [category.id, category.name]),
	);
	const explain = (feature: string) => {
		const [kind, value] = feature.split(":");
		if (kind === "category")
			return `Function: ${categoryNames.get(value) ?? value}`;
		return `${kind.replaceAll("-", " + ")}: ${value.replaceAll("-", " ").replaceAll("/", " / ")}`;
	};
	const result = cards.map((card, index): AtlasCard => {
		const vector = vectors[index];
		const candidates = new Map<number, number>();
		for (const [feature, weight] of vector)
			for (const candidate of postings.get(feature) ?? [])
				if (candidate !== index)
					candidates.set(
						candidate,
						(candidates.get(candidate) ?? 0) +
							weight * (vectors[candidate].get(feature) ?? 0),
					);
		const shortlist = [...candidates]
			.sort(
				(a, b) => b[1] - a[1] || cards[a[0]].id.localeCompare(cards[b[0]].id),
			)
			.slice(0, CANDIDATE_LIMIT);
		const similar: SimilarCard[] = shortlist
			.map(([candidate]) => {
				const other = vectors[candidate];
				const shared: [string, number][] = [];
				let score = 0;
				for (const [feature, weight] of vector) {
					const product = weight * (other.get(feature) ?? 0);
					if (product > 0) {
						score += product;
						shared.push([feature, product]);
					}
				}
				shared.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
				return {
					id: cards[candidate].id,
					score: Math.min(1, Math.max(0, score)),
					shared: shared.slice(0, 6).map(([feature]) => explain(feature)),
				};
			})
			.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
			.slice(0, 8);
		const point = coordinates[index];
		const analysis = analyses.get(card.id);
		if (!analysis) throw new Error(`Missing analysis for ${card.id}`);
		return {
			...card,
			analysis,
			x: maxX === minX ? 0.5 : 0.04 + (0.92 * (point.x - minX)) / (maxX - minX),
			y: maxY === minY ? 0.5 : 0.04 + (0.92 * (point.y - minY)) / (maxY - minY),
			similar,
		};
	});
	const centroids = new Map<string, { x: number; y: number; count: number }>();
	for (const card of result)
		for (const category of card.analysis.categories) {
			const centroid = centroids.get(category) ?? { x: 0, y: 0, count: 0 };
			centroid.x += card.x;
			centroid.y += card.y;
			centroid.count++;
			centroids.set(category, centroid);
		}
	const categories = taxonomy.categories.map((category): AtlasCategory => {
		const centroid = centroids.get(category.id);
		const digest = hash(category.id);
		const color = `#${[0, 2, 4].map((offset) => (56 + (parseInt(digest.slice(offset, offset + 2), 16) % 136)).toString(16).padStart(2, "0")).join("")}`;
		return {
			...category,
			color,
			x: centroid ? centroid.x / centroid.count : 0.5,
			y: centroid ? centroid.y / centroid.count : 0.5,
			count: centroid?.count ?? 0,
		};
	});
	return { cards: result, categories };
}

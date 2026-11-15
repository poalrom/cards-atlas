import { join } from "node:path";
import type { Catalog, GameId } from "../../src/entities/catalog/types.ts";
import { analyze } from "./analysis.ts";
import { ATTESTATION, preflight, session } from "./codex.ts";
import { importGallery } from "./gallery.ts";
import { importMtg } from "./mtg.ts";
import { markUnavailable, publishSnapshot, readManifest } from "./publish.ts";
import { importRiftbound } from "./riftbound.ts";
import { DATA, date, exists, json, withLock } from "./storage.ts";
import { validateCatalog, validateSnapshot } from "./validate.ts";

const HELP = `Cards Atlas local preparation — Node 24+, no catalog API at runtime, no price ingestion.

Usage: node --env-file-if-exists=.env scripts/prepare/cli.ts <command> [game] [options]

Commands (each accepts --help):
  import mtg|riftbound   Fetch official source, cache raw response, normalize all eligible cards.
  preflight             Read sanitized ChatGPT included-usage state. No inference is requested.
  analyze mtg|riftbound  Generate/cache one taxonomy, then validate/resume every card batch.
  publish mtg|riftbound  Require complete validated cached analysis; atomically switch static data.
  run mtg|riftbound      Import, analyze and publish one complete game (never partial samples).
  status                Show manifest readiness and local normalized catalog counts.
  validate <path>       Validate a full static snapshot without contacting any service.
  unavailable <game>    Record --reason only when no prior snapshot exists.

Options:
  --as-of YYYY-MM-DD       Inclusive catalog date (default: current UTC date; never future).
  --refresh               Replace source raw cache; otherwise verify and reuse cached bytes.
  --expected-sets A,B      Optional independently confirmed exact full Riot set-ID list.
  --source api|gallery    Riftbound only: authenticated API (default) or official local gallery.
  --output DIRECTORY     Static data destination, default public/data. Gallery sources require
                         the private .data/local-site/data destination and cannot be published.
  --batch-size N          1–24 cards, default 12; also bounded by full input byte size.
  --attest-included-only  Exact human attestation string below (analyze/run only).
  --attested-at ISO       Timestamp of the owner's included-only billing verification.
  --reason TEXT          Truthful unavailable explanation (unavailable command only).

MTG uses comprehensive MTGJSON AllPrintings, not a set-date shortcut. All paper printing
languages retain English Oracle text. Records use originalReleaseDate ?? set.releaseDate,
and the inclusive [asOf minus 12 calendar months, asOf] window. Set token objects are not
gameplay-card records in this catalog; cards are imported from every set.cards array.
Individually recent printings in old sets remain eligible. Raw MTGJSON is MIT licensed
(Copyright 2018–present Zach Halpern; https://mtgjson.com/license/); Magic content belongs
to Wizards of the Coast. Raw and normalized caches stay in ignored .data/.

Riftbound needs an app-specific approved RIOT_API_KEY in the local shell/.env. Apply at
https://developer.riotgames.com and follow https://developer.riotgames.com/docs/riftbound.
The default source is the official authenticated /riftbound/content/v1/contents endpoint.
All returned sets/records must validate; actual source coverage is reported, not guessed.
For explicitly local evaluation only, --source gallery paginates Riot's own public website
publishing API. It needs no key but is not app/API approval. Its sources carry localOnly:
true, include official previews if supplied, and may only emit snapshots to .data/local-site/data.
No community gallery or fixture fallback exists. Keys are never written to cache or logs.

Before EVERY generation session: use your existing ChatGPT login (codex login), check
https://chatgpt.com/codex/settings/usage, disable automatic credit purchase, ensure only
included usage, then run preflight and pass a fresh explicit attestation:
${ATTESTATION}
The CLI cannot enforce account billing or auto-purchase settings. It additionally reads
account rate limits before EVERY inference and stops on unknown state, credits/unlimited
balance, nonmatching normal-model quota, auth/quota failure, or >=75% used. No retries,
other models, APIs, purchased credits or silent downgrade. Sessions expire after 4 hours.
Only gpt-6-luna with low reasoning, ephemeral read-only Codex and strict JSON is allowed.

Example (PowerShell; only after completing the human usage check):
  npm run catalog:import -- mtg --as-of 2026-11-15
  npm run catalog:preflight
  npm run catalog:analyze -- mtg --attest-included-only "${ATTESTATION}" --attested-at ((Get-Date).ToUniversalTime().ToString("o"))
  npm run catalog:publish -- mtg

Publish never invokes a model. Resume analyze with the SAME --as-of and --batch-size;
validated caches are keyed to gameplay input, taxonomy, prompt and model hashes.
A failed source/model/validation/layout operation leaves the previous public manifest intact.
Positions use seeded semantic TF-IDF projection; neighbors are approximate candidates,
not gameplay equivalence or coverage. See each snapshot's layout description for tradeoffs.
`;
interface Arguments {
	command: string;
	positional: string[];
	options: Record<string, string | boolean>;
}
function argumentsFor(argv: string[]): Arguments {
	const [command = "help", ...tokens] = argv;
	const positional: string[] = [];
	const options: Record<string, string | boolean> = {};
	const valued = [
		"as-of",
		"expected-sets",
		"batch-size",
		"attest-included-only",
		"attested-at",
		"reason",
		"source",
		"output",
	];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!token.startsWith("--")) {
			positional.push(token);
			continue;
		}
		const name = token.slice(2);
		if (name in options) throw new Error(`Duplicate option --${name}`);
		if (name === "refresh" || name === "help") options[name] = true;
		else if (valued.includes(name)) {
			const value = tokens[++index];
			if (!value || value.startsWith("--"))
				throw new Error(`--${name} requires a value; use --help`);
			options[name] = value;
		} else throw new Error(`Unknown option --${name}; use --help`);
	}
	return { command, positional, options };
}
function gameId(value: string | undefined): GameId {
	if (value !== "mtg" && value !== "riftbound")
		throw new Error(
			"Choose exactly one independent game: mtg or riftbound; use --help",
		);
	return value;
}
async function imported(game: GameId, asOf: string): Promise<Catalog> {
	const path = join(DATA, "catalogs", `${game}.${asOf}.json`);
	if (!(await exists(path)))
		throw new Error(
			`No normalized ${game} catalog for ${asOf}; first run import ${game} --as-of ${asOf}`,
		);
	const catalog = validateCatalog(await json(path));
	if (catalog.game !== game || catalog.asOf !== asOf)
		throw new Error("Normalized catalog identity/date mismatch");
	return catalog;
}
async function main(): Promise<void> {
	const { command, positional, options } = argumentsFor(process.argv.slice(2));
	if (command === "help" || command === "--help" || options.help) {
		console.log(HELP);
		return;
	}
	const allowed: Record<string, string[]> = {
		import: ["as-of", "refresh", "expected-sets", "source"],
		preflight: [],
		analyze: ["as-of", "batch-size", "attest-included-only", "attested-at"],
		publish: ["as-of", "batch-size", "output"],
		run: [
			"as-of",
			"refresh",
			"expected-sets",
			"source",
			"output",
			"batch-size",
			"attest-included-only",
			"attested-at",
		],
		status: [],
		validate: [],
		unavailable: ["reason"],
	};
	if (!(command in allowed)) throw new Error("Unknown command; use --help");
	for (const key of Object.keys(options))
		if (!allowed[command].includes(key))
			throw new Error(`--${key} is not valid for ${command}; use --help`);
	if (positional.length !== (["preflight", "status"].includes(command) ? 0 : 1))
		throw new Error("Wrong argument count; use --help");
	if (command === "preflight") {
		console.log(JSON.stringify(await preflight(), null, 2));
		console.log(
			"No inference requested. Next: manually confirm automatic credit purchase is disabled and included usage only, then start analyze with a fresh attestation. CLI cannot enforce account billing.",
		);
		return;
	}
	if (command === "validate") {
		const snapshot = validateSnapshot(await json(positional[0]));
		console.log(
			`Validated complete ${snapshot.game} snapshot ${snapshot.id}: ${snapshot.cards.length} cards`,
		);
		return;
	}
	if (command === "status") {
		console.log(JSON.stringify(await readManifest(), null, 2));
		for (const game of ["mtg", "riftbound"] as const) {
			const path = join(DATA, "catalogs", `${game}.latest.json`);
			if (await exists(path)) {
				const catalog = validateCatalog(await json(path));
				console.log(
					`${game}: local normalized catalog ${catalog.cards.length} gameplay cards, ${catalog.cards.reduce((sum, card) => sum + card.printings.length, 0)} source printing records, asOf ${catalog.asOf}`,
				);
			} else console.log(`${game}: no local normalized catalog`);
		}
		return;
	}
	const game = gameId(positional[0]);
	const today = new Date().toISOString().slice(0, 10);
	const asOf = date(
		typeof options["as-of"] === "string" ? options["as-of"] : today,
	);
	if (asOf > today) throw new Error("--as-of cannot be in the future");
	const batchSize =
		typeof options["batch-size"] === "string"
			? Number(options["batch-size"])
			: 12;
	const source = options.source ?? "api";
	if (source !== "api" && source !== "gallery")
		throw new Error("--source must be api or gallery");
	if (game !== "riftbound" && options.source !== undefined)
		throw new Error("--source applies only to Riftbound");
	await withLock(async () => {
		if (command === "unavailable") {
			if (typeof options.reason !== "string")
				throw new Error("--reason is required");
			await markUnavailable(game, options.reason);
			return;
		}
		const generation =
			command === "analyze" || command === "run"
				? session(
						typeof options["attest-included-only"] === "string"
							? options["attest-included-only"]
							: undefined,
						typeof options["attested-at"] === "string"
							? options["attested-at"]
							: undefined,
					)
				: undefined;
		const expectedSets =
			typeof options["expected-sets"] === "string"
				? options["expected-sets"]
						.split(",")
						.map((id) => id.trim())
						.filter(Boolean)
				: [];
		const catalog =
			command === "import" || command === "run"
				? validateCatalog(
						game === "mtg"
							? await importMtg(asOf, options.refresh === true)
							: source === "gallery"
								? await importGallery(asOf, options.refresh === true)
								: await importRiftbound(
										asOf,
										expectedSets,
										options.refresh === true,
									),
					)
				: await imported(game, asOf);
		console.log(
			`${game}: ${catalog.cards.length} gameplay cards; ${catalog.cards.reduce((sum, card) => sum + card.printings.length, 0)} eligible source printing records; asOf ${catalog.asOf}`,
		);
		if (command === "import") {
			console.log(
				`Next: preflight, manually verify included-only billing, then analyze ${game} --as-of ${asOf}`,
			);
			return;
		}
		const { taxonomy, analyses } = await analyze(
			catalog,
			batchSize,
			generation,
		);
		if (command === "analyze") {
			console.log(
				`All ${analyses.size} cards validated. Next: publish ${game} --as-of ${asOf} --batch-size ${batchSize}`,
			);
			return;
		}
		console.log(
			JSON.stringify(
				await publishSnapshot(
					catalog,
					taxonomy,
					analyses,
					typeof options.output === "string" ? options.output : undefined,
				),
			),
		);
	});
}
main().catch((error: unknown) => {
	console.error(
		error instanceof Error
			? error.message
			: "Preparation failed without publishing partial data",
	);
	process.exitCode = 1;
});

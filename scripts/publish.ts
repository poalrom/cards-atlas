import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publish } from "gh-pages";
import { validateManifest, validateSnapshot } from "./prepare/validate.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(root, "dist");
const data = resolve(site, "data");
const repo = "git@github.com:poalrom/cards-atlas.git";

async function verifySite() {
	const manifest = validateManifest(
		JSON.parse(await readFile(resolve(data, "manifest.json"), "utf8")),
	);
	for (const game of manifest.games) {
		if (!game.snapshot) {
			throw new Error(
				`${game.name} has no complete snapshot. Finish import and analysis before publication.`,
			);
		}
		const path = resolve(data, game.snapshot);
		if (relative(data, path).startsWith("..")) {
			throw new Error(
				"Snapshot path must remain inside the static data directory.",
			);
		}
		const content = await readFile(path, "utf8");
		const snapshot = validateSnapshot(JSON.parse(content));
		if (
			snapshot.sources.some(
				(source) =>
					source.localOnly ||
					source.url.startsWith("https://content.publishing.riotgames.com/"),
			)
		) {
			throw new Error(
				`${game.name} contains local-evaluation data and cannot be published.`,
			);
		}
		if (
			snapshot.game !== game.id ||
			snapshot.cards.length !== game.cardCount ||
			snapshot.asOf !== game.asOf
		) {
			throw new Error(`${game.name} manifest does not match its snapshot.`);
		}
		console.log(
			`${game.name}: ${snapshot.cards.length} cards, as of ${snapshot.asOf}, SHA-256 ${createHash("sha256").update(content).digest("hex")}`,
		);
	}
	const stack = [site];
	while (stack.length) {
		const directory = stack.pop();
		if (!directory) break;
		for (const name of await readdir(directory)) {
			const path = resolve(directory, name);
			if ((await stat(path)).isDirectory()) {
				stack.push(path);
			} else if (/\.(?:html|js|css|json|svg|txt|md)$/i.test(name)) {
				const text = await readFile(path, "utf8");
				if (/\p{Script=Cyrillic}/u.test(text)) {
					throw new Error(`Non-English content in ${relative(site, path)}.`);
				}
				if (/RGAPI-[A-Za-z0-9-]+|sk-(?:proj-)?[A-Za-z0-9_-]{20,}/.test(text)) {
					throw new Error(`Possible credential in ${relative(site, path)}.`);
				}
			}
		}
	}
	const html = await readFile(resolve(site, "index.html"), "utf8");
	if (!html.includes("/cards-atlas/assets/")) {
		throw new Error(
			"Build does not use the GitHub Pages project base /cards-atlas/.",
		);
	}
}

function pagesRequest(method: "GET" | "POST") {
	const args = ["api", "--method", method, "repos/poalrom/cards-atlas/pages"];
	if (method === "POST") {
		args.push(
			"-f",
			"build_type=legacy",
			"-f",
			"source[branch]=gh-pages",
			"-f",
			"source[path]=/",
		);
	}
	const result = spawnSync("gh", args, { encoding: "utf8", windowsHide: true });
	if (result.error)
		throw new Error(
			"GitHub CLI is required to configure Pages. Run gh auth login first.",
		);
	let body: unknown;
	try {
		body = JSON.parse(result.stdout);
	} catch {
		throw new Error(
			"GitHub Pages returned an unexpected response; deployment settings were not verified.",
		);
	}
	if (!body || typeof body !== "object")
		throw new Error("Invalid GitHub Pages response.");
	if (result.status !== 0) {
		if (method === "GET" && "status" in body && String(body.status) === "404")
			return false;
		throw new Error(
			"Could not configure GitHub Pages. Check gh authentication and repository administration access.",
		);
	}
	const config = body as {
		build_type?: unknown;
		source?: { branch?: unknown; path?: unknown };
	};
	if (
		config.build_type !== "legacy" ||
		config.source?.branch !== "gh-pages" ||
		config.source?.path !== "/"
	) {
		throw new Error(
			"Existing Pages settings differ from gh-pages branch-root deployment; left unchanged.",
		);
	}
	return true;
}

try {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		console.log(
			"Usage: node scripts/publish.ts [--check-only]\nValidates both complete game snapshots and the local dist build. Publishes dist to gh-pages and configures standard branch-root GitHub Pages deployment unless --check-only is set. Requires GitHub CLI authentication.",
		);
	} else {
		if (args.some((argument) => argument !== "--check-only")) {
			throw new Error("Unknown option. Use --help.");
		}
		await verifySite();
		if (!args.includes("--check-only")) {
			const configured = pagesRequest("GET");
			await publish(site, {
				repo,
				branch: "gh-pages",
				nojekyll: true,
				history: true,
				message: "deploy: publish complete Cards Atlas snapshots",
			});
			if (!configured) pagesRequest("POST");
			console.log(
				"Pushed gh-pages and configured standard Pages deployment. Deployment is asynchronous: https://poalrom.github.io/cards-atlas/",
			);
		} else {
			console.log("Static publication checks passed; nothing was pushed.");
		}
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : "Publication failed.");
	process.exitCode = 1;
}

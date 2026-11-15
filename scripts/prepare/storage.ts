import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const USER_AGENT =
	"CardsAtlas/1.0 (local static catalog preparation; MTGJSON attribution: https://mtgjson.com/)";
export const DATA = ".data";
export function hash(value: unknown): string {
	return createHash("sha256")
		.update(typeof value === "string" ? value : JSON.stringify(value))
		.digest("hex");
}
export async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}
export async function json(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"));
}
export async function atomic(path: string, content: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporary, content, { flag: "wx" });
		await rename(temporary, path);
	} finally {
		await rm(temporary, { force: true });
	}
}
export async function atomicJson(path: string, value: unknown): Promise<void> {
	await atomic(path, `${JSON.stringify(value)}\n`);
}
export function object(
	value: unknown,
	context: string,
): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error(`${context}: expected an object`);
	return value as Record<string, unknown>;
}
export function text(value: unknown, context: string, empty = false): string {
	if (typeof value !== "string" || (!empty && !value.trim()))
		throw new Error(
			`${context}: expected ${empty ? "a" : "a nonempty"} string`,
		);
	return value;
}
export function array(value: unknown, context: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${context}: expected an array`);
	return value;
}
export function strings(value: unknown, context: string): string[] {
	return array(value, context).map((item) => text(item, context));
}
export function exact(
	value: Record<string, unknown>,
	keys: string[],
	context: string,
): void {
	if (Object.keys(value).sort().join("|") !== [...keys].sort().join("|"))
		throw new Error(`${context}: unexpected or missing fields`);
}
export function english(value: unknown, context: string): void {
	if (/[\u0400-\u04ff]/u.test(JSON.stringify(value)))
		throw new Error(`${context}: Cyrillic content is not publishable`);
}
export function date(value: string): string {
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
		new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
	)
		throw new Error(`Invalid calendar date: ${value}`);
	return value;
}
export async function fileHash(path: string): Promise<string> {
	const digest = createHash("sha256");
	for await (const chunk of createReadStream(path)) digest.update(chunk);
	return digest.digest("hex");
}
export async function download(
	url: string,
	path: string,
	refresh = false,
	headers: Record<string, string> = {},
): Promise<{ retrievedAt: string; sha256: string }> {
	const metadataPath = `${path}.meta.json`;
	if (!refresh && (await exists(path)) && (await exists(metadataPath))) {
		const cached = object(await json(metadataPath), "download metadata");
		if (cached.url === url && cached.sha256 === (await fileHash(path)))
			return {
				retrievedAt: text(cached.retrievedAt, "retrieval date"),
				sha256: text(cached.sha256, "checksum"),
			};
		throw new Error(
			`Raw cache integrity mismatch at ${path}; use --refresh to replace it`,
		);
	}
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": USER_AGENT,
				Accept: "application/json, application/gzip",
				...headers,
			},
			redirect: "error",
			signal: AbortSignal.timeout(600_000),
		});
		if (!response.ok || !response.body)
			throw new Error(
				`Source HTTP ${response.status}; ${response.status === 429 ? `rate limited, Retry-After=${response.headers.get("retry-after") ?? "unspecified"}; stop and retry later` : "check source availability and application authorization"}`,
			);
		await pipeline(
			Readable.from(response.body),
			createWriteStream(temporary, { flags: "wx" }),
		);
		const metadata = {
			url,
			retrievedAt: new Date().toISOString(),
			sha256: await fileHash(temporary),
		};
		await rename(temporary, path);
		await atomicJson(metadataPath, metadata);
		return metadata;
	} finally {
		await rm(temporary, { force: true });
	}
}
export async function withLock<T>(work: () => Promise<T>): Promise<T> {
	await mkdir(DATA, { recursive: true });
	const path = join(DATA, "prepare.lock");
	try {
		await writeFile(
			path,
			JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
			{ flag: "wx" },
		);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST")
			throw new Error(
				"Another preparation owns .data/prepare.lock. If it crashed, confirm its PID is no longer running before manually removing that lock.",
			);
		throw error;
	}
	try {
		return await work();
	} finally {
		await rm(path, { force: true });
	}
}

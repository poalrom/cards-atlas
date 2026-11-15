import { useEffect, useState } from "react";
import type {
	AtlasManifest,
	AtlasSnapshot,
	GameId,
	ManifestGame,
} from "../../entities/catalog/types";
import { parseManifest, parseSnapshot } from "./catalog";

export type LoadState<T> =
	| { status: "pending" }
	| { status: "error"; message: string }
	| { status: "ready"; data: T };
export type SnapshotState =
	| LoadState<AtlasSnapshot>
	| { status: "unavailable"; message: string };
const snapshots = new Map<string, AtlasSnapshot>();
const base = import.meta.env.BASE_URL;

export function useManifest(retry: number): LoadState<AtlasManifest> {
	const [state, setState] = useState<LoadState<AtlasManifest>>({
		status: "pending",
	});
	useEffect(() => {
		const controller = new AbortController();
		setState({ status: "pending" });
		void (async () => {
			try {
				const response = await fetch(`${base}data/manifest.json`, {
					signal: controller.signal,
					cache: "no-cache",
				});
				if (!response.ok)
					throw new Error(`Manifest request failed (${response.status}).`);
				const data = parseManifest(await response.json());
				if (!controller.signal.aborted) setState({ status: "ready", data });
			} catch {
				if (!controller.signal.aborted)
					setState({
						status: "error",
						message:
							"The published manifest is missing or could not be read. Check your connection and try again.",
					});
			}
		})();
		return () => controller.abort();
	}, [retry]);
	return state;
}

export function useSnapshot(
	game: GameId | undefined,
	entry: ManifestGame | undefined,
	retry: number,
): SnapshotState {
	const key = `${game ?? "invalid"}:${entry?.snapshot ?? "none"}`;
	const [loaded, setLoaded] = useState<{
		key: string;
		state: LoadState<AtlasSnapshot>;
	}>({ key: "", state: { status: "pending" } });
	useEffect(() => {
		if (!game || !entry?.snapshot) return;
		const snapshot = entry.snapshot;
		const controller = new AbortController();
		const cached = snapshots.get(snapshot);
		if (cached?.game === game) {
			setLoaded({ key, state: { status: "ready", data: cached } });
			return () => controller.abort();
		}
		setLoaded({ key, state: { status: "pending" } });
		void (async () => {
			try {
				const response = await fetch(`${base}data/${snapshot}`, {
					signal: controller.signal,
					cache: "force-cache",
				});
				if (!response.ok)
					throw new Error(`Snapshot request failed (${response.status}).`);
				const data = parseSnapshot(await response.json(), game);
				if (
					entry.cardCount !== undefined &&
					entry.cardCount !== data.cards.length
				)
					throw new Error("Snapshot size differs from the published manifest.");
				if (entry.asOf && entry.asOf !== data.asOf)
					throw new Error("Snapshot date differs from the published manifest.");
				if (!controller.signal.aborted) {
					snapshots.set(snapshot, data);
					setLoaded({ key, state: { status: "ready", data } });
				}
			} catch {
				if (!controller.signal.aborted)
					setLoaded({
						key,
						state: {
							status: "error",
							message:
								"The data file is missing, unreadable, or does not match the published catalog. Try again or choose another game.",
						},
					});
			}
		})();
		return () => controller.abort();
	}, [game, entry, key, retry]);
	if (!entry) return { status: "pending" };
	if (!entry.snapshot)
		return {
			status: "unavailable",
			message:
				entry.unavailableReason ||
				"This game's analyzed snapshot has not been published. No substitute catalog is shown.",
		};
	return loaded.key === key ? loaded.state : { status: "pending" };
}

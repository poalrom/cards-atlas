import { createFileRoute } from "@tanstack/react-router";
import type { AtlasSearch } from "../features/atlas/AtlasView";
import { AtlasView } from "../features/atlas/AtlasView";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>): AtlasSearch => {
		const state: AtlasSearch = {};
		for (const key of ["game", "group", "card", "similar"] as const) {
			const value = search[key];
			if (value === undefined) continue;
			if (typeof value !== "string" || !value.trim()) {
				state.invalid = `Invalid ${key} parameter. Choose a game to open its full atlas.`;
				continue;
			}
			state[key] = value;
		}
		return state;
	},
	component: AtlasRoute,
});

function AtlasRoute() {
	const state = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<AtlasView
			state={state}
			onNavigate={(next) => {
				void navigate({ search: next });
			}}
		/>
	);
}

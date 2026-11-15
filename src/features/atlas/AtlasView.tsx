import {
	ArrowLeft,
	ArrowRight,
	Compass,
	Info,
	PanelLeft,
	Search,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
	AtlasManifest,
	AtlasSnapshot,
	GameId,
} from "../../entities/catalog/types";
import { AtlasMap } from "./AtlasMap";
import { CardInspector } from "./CardInspector";
import { createCardSearch, isGame } from "./catalog";
import { useManifest, useSnapshot } from "./use-catalog";
import "./atlas-view.css";

export interface AtlasSearch {
	game?: string;
	group?: string;
	card?: string;
	similar?: string;
	invalid?: string;
}
interface Props {
	state: AtlasSearch;
	onNavigate: (state: AtlasSearch) => void;
}

export function AtlasView({ state, onNavigate }: Props) {
	const [retry, setRetry] = useState(0);
	const manifest = useManifest(retry);
	const requestedGame = state.game ?? "riftbound";
	const game = isGame(requestedGame) ? requestedGame : undefined;
	const entry =
		manifest.status === "ready"
			? manifest.data.games.find((item) => item.id === game)
			: undefined;
	const snapshot = useSnapshot(game, entry, retry);
	const [about, setAbout] = useState(false);
	let problem: string | undefined;
	if (state.invalid) problem = state.invalid;
	else if (!game)
		problem = `Unknown game “${requestedGame}”. Choose a catalog to recover.`;
	else if (manifest.status === "error")
		problem = `Catalog manifest unavailable. ${manifest.message}`;
	else if (snapshot.status === "error")
		problem = `The published snapshot could not be loaded. ${snapshot.message}`;
	else if (snapshot.status === "unavailable") problem = snapshot.message;
	return (
		<div className="atlas-view">
			{!problem && game && snapshot.status === "ready" ? (
				<LiveAtlas
					key={game}
					snapshot={snapshot.data}
					state={state}
					onNavigate={onNavigate}
					onAbout={() => setAbout(true)}
				/>
			) : (
				<>
					<header className="a-header a-loading-header">
						<Brand onClick={() => onNavigate({ game: game ?? "riftbound" })} />
						<GameSwitch game={game} onGame={(id) => onNavigate({ game: id })} />
						<button
							type="button"
							className="a-icon-button"
							aria-label="About Cards Atlas"
							onClick={() => setAbout(true)}
						>
							<Info size={20} />
						</button>
					</header>
					<main className="a-status-panel" aria-live="polite">
						<Compass size={32} />
						<h1>{problem ? "Catalog unavailable" : "Loading catalog"}</h1>
						<p>
							{problem ??
								(manifest.status === "pending"
									? "Reading the published catalog manifest…"
									: "Loading the prepared game snapshot…")}
						</p>
						{problem && (
							<>
								<p className="a-muted">
									No sample cards or substitute map are shown.
								</p>
								{(manifest.status === "error" ||
									snapshot.status === "error") && (
									<button
										type="button"
										className="a-primary-button"
										onClick={() => setRetry((value) => value + 1)}
									>
										Try again
									</button>
								)}
							</>
						)}
					</main>
				</>
			)}
			<About
				open={about}
				onClose={() => setAbout(false)}
				manifest={manifest.status === "ready" ? manifest.data : undefined}
				snapshot={
					snapshot.status === "ready" && game ? snapshot.data : undefined
				}
			/>
		</div>
	);
}

function Brand({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			className="a-brand"
			onClick={onClick}
			aria-label="Cards Atlas, reset this game"
		>
			<img src={`${import.meta.env.BASE_URL}atlas.svg`} alt="" />
			<span>
				<span className="a-brand-title">
					atlas<span className="a-title-dot">.</span>
				</span>
				<span className="a-brand-caption">CARDS CONNECTED BY MEANING</span>
			</span>
		</button>
	);
}
function GameSwitch({
	game,
	onGame,
}: {
	game?: GameId;
	onGame: (id: GameId) => void;
}) {
	return (
		<label className="a-game-switch">
			<span className="sr-only">Game catalog</span>
			<select
				value={game ?? ""}
				onChange={(event) => {
					const id = event.target.value;
					if (isGame(id)) onGame(id);
				}}
			>
				{!game && (
					<option value="" disabled>
						Choose a game
					</option>
				)}
				<option value="riftbound">Riftbound</option>
				<option value="mtg">Magic: The Gathering</option>
			</select>
		</label>
	);
}

function LiveAtlas({
	snapshot,
	state,
	onNavigate,
	onAbout,
}: Props & { snapshot: AtlasSnapshot; onAbout: () => void }) {
	const [compact, setCompact] = useState(window.innerWidth < 1200);
	const [groupsOpen, setGroupsOpen] = useState(window.innerWidth >= 1200);
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [activeResult, setActiveResult] = useState(0);
	const [page, setPage] = useState(0);
	const searchRef = useRef<HTMLInputElement>(null);
	const groupsButtonRef = useRef<HTMLButtonElement>(null);
	const cardsById = useMemo(
		() => new Map(snapshot.cards.map((card) => [card.id, card])),
		[snapshot],
	);
	const selected =
		state.card === undefined ? undefined : cardsById.get(state.card);
	const group =
		state.group === undefined
			? undefined
			: snapshot.categories.find((category) => category.id === state.group);
	const localEvaluation = snapshot.sources.some((source) => source.localOnly);
	const similar = state.similar === "on";
	let issue: string | undefined;
	if (state.group !== undefined && !group)
		issue = `Unknown category “${state.group}” in this snapshot.`;
	else if (state.card !== undefined && !selected)
		issue = `Card “${state.card}” is not in this game's published snapshot.`;
	else if (state.similar !== undefined && state.similar !== "on")
		issue = `Unknown similarity view “${state.similar}”.`;
	else if (similar && !selected)
		issue = "A similarity view needs a card from this game.";
	else if (
		selected &&
		group &&
		!selected.analysis.categories.includes(group.id)
	)
		issue = `The linked card is not part of the linked category. Open the full atlas to choose either one.`;
	const filtered = useMemo(
		() =>
			group
				? snapshot.cards.filter((card) =>
						card.analysis.categories.includes(group.id),
					)
				: snapshot.cards,
		[snapshot, group],
	);
	const search = useMemo(() => createCardSearch(snapshot.cards), [snapshot]);
	const searchResults = useMemo(() => search(query), [search, query]);
	const browsed = query.trim() ? searchResults : filtered;
	const resultPage = browsed.slice(page * 40, (page + 1) * 40);
	const suggestions = query.trim() ? searchResults.slice(0, 12) : [];
	useEffect(() => {
		const media = window.matchMedia("(max-width: 1199px)");
		const change = () => {
			setCompact(media.matches);
			setGroupsOpen(!media.matches);
		};
		media.addEventListener("change", change);
		return () => media.removeEventListener("change", change);
	}, []);
	useEffect(() => {
		setPage(0);
		setActiveResult(0);
	}, [query, state.group]);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (
				event.key !== "Escape" ||
				event.defaultPrevented ||
				document.querySelector("dialog[open]")
			)
				return;
			if (searchOpen && query.trim()) {
				setSearchOpen(false);
				searchRef.current?.focus();
			} else if (compact && groupsOpen) {
				setGroupsOpen(false);
				groupsButtonRef.current?.focus();
			} else if (similar) {
				onNavigate({ ...state, similar: undefined });
			} else if (selected) {
				onNavigate({ ...state, card: undefined, similar: undefined });
				searchRef.current?.focus();
			} else if (groupsOpen) {
				setGroupsOpen(false);
				groupsButtonRef.current?.focus();
			} else return;
			event.preventDefault();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		state,
		onNavigate,
		selected,
		similar,
		query,
		compact,
		searchOpen,
		groupsOpen,
	]);
	const openCard = (id: string) => {
		setQuery("");
		setSearchOpen(false);
		if (compact) setGroupsOpen(false);
		const card = cardsById.get(id);
		onNavigate({
			game: snapshot.game,
			group:
				group && card?.analysis.categories.includes(group.id)
					? group.id
					: undefined,
			card: id,
			similar: id === selected?.id ? state.similar : undefined,
		});
	};
	const openGroup = (id?: string) => {
		if (compact) setGroupsOpen(false);
		const keepsCard =
			selected &&
			(id === undefined || selected.analysis.categories.includes(id));
		onNavigate({
			game: snapshot.game,
			group: id,
			card: keepsCard ? selected.id : undefined,
			similar: keepsCard ? state.similar : undefined,
		});
	};
	return (
		<div
			className={`a-live-atlas ${selected && !issue ? "has-selection" : ""} ${groupsOpen ? "has-groups" : ""} ${localEvaluation ? "has-local-source" : ""}`}
		>
			{!issue && (
				<AtlasMap
					cards={filtered}
					categories={snapshot.categories}
					selected={
						selected && filtered.some((card) => card.id === selected.id)
							? selected
							: undefined
					}
					group={group?.id}
					sidebar={groupsOpen}
					onCard={openCard}
				/>
			)}
			<header className="a-header">
				<h1 className="sr-only">
					Cards Atlas:{" "}
					{snapshot.game === "mtg" ? "Magic: The Gathering" : "Riftbound"}
				</h1>
				<Brand
					onClick={() => {
						setQuery("");
						setSearchOpen(false);
						onNavigate({ game: snapshot.game });
					}}
				/>
				<GameSwitch
					game={snapshot.game}
					onGame={(game) => onNavigate({ game })}
				/>
				<div className="a-search-wrap">
					<Search size={18} />
					<input
						ref={searchRef}
						role="combobox"
						aria-label="Search all cards by name, rules, type, attributes, or tags"
						aria-autocomplete="list"
						aria-expanded={searchOpen && !!query.trim()}
						aria-controls="atlas-search-results"
						aria-activedescendant={
							searchOpen && suggestions[activeResult]
								? `search-option-${activeResult}`
								: undefined
						}
						placeholder="Name, rules, type, or tags…"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setSearchOpen(true);
							setActiveResult(0);
						}}
						onFocus={() => setSearchOpen(true)}
						onKeyDown={(event) => {
							if (event.key === "Escape" && searchOpen && query.trim()) {
								event.preventDefault();
								event.stopPropagation();
								setSearchOpen(false);
							} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
								event.preventDefault();
								setSearchOpen(true);
								setActiveResult((value) =>
									suggestions.length
										? (value +
												(event.key === "ArrowDown" ? 1 : -1) +
												suggestions.length) %
											suggestions.length
										: 0,
								);
							} else if (event.key === "Enter" && suggestions[activeResult]) {
								event.preventDefault();
								openCard(suggestions[activeResult].id);
							}
						}}
					/>
					{query && (
						<button
							type="button"
							className="a-icon-button"
							aria-label="Clear search"
							onClick={() => {
								setQuery("");
								setSearchOpen(false);
								searchRef.current?.focus();
							}}
						>
							<X size={17} />
						</button>
					)}
					{searchOpen && query.trim() && (
						<div className="a-search-results">
							<div
								id="atlas-search-results"
								role="listbox"
								aria-label="Search results"
							>
								{suggestions.map((card, index) => (
									<div
										key={card.id}
										id={`search-option-${index}`}
										role="option"
										tabIndex={-1}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												openCard(card.id);
											}
										}}
										aria-selected={activeResult === index}
										onPointerDown={(event) => event.preventDefault()}
										onClick={() => openCard(card.id)}
									>
										<span>{card.name}</span>
										<small>{card.type}</small>
									</div>
								))}
							</div>
							<p role="status">
								{searchResults.length
									? `${searchResults.length.toLocaleString("en")} matching cards${searchResults.length > 12 ? "; first 12 shown here" : ""}.`
									: "No cards match in this published catalog."}
							</p>
							{searchResults.length > 12 && (
								<button
									type="button"
									className="a-text-button"
									onClick={() => {
										setSearchOpen(false);
										setGroupsOpen(true);
									}}
								>
									Browse all matches
									<ArrowRight size={16} />
								</button>
							)}
							<button
								type="button"
								className="a-text-button"
								onClick={() => setSearchOpen(false)}
							>
								Close search results
							</button>
						</div>
					)}
				</div>
				<nav className="a-header-nav" aria-label="Atlas panels">
					<button
						type="button"
						ref={groupsButtonRef}
						aria-label="Browse categories and cards"
						aria-controls="atlas-groups"
						aria-expanded={groupsOpen}
						onClick={() => setGroupsOpen((value) => !value)}
					>
						<PanelLeft size={19} />
						<span>Browse</span>
					</button>
					<button
						type="button"
						aria-label="About Cards Atlas"
						onClick={onAbout}
					>
						<Info size={20} />
					</button>
				</nav>
			</header>
			{localEvaluation && (!selected || issue) && (
				<button type="button" className="a-local-banner" onClick={onAbout}>
					<strong>Local evaluation</strong>
					<span>Source coverage unverified · About</span>
				</button>
			)}
			{issue ? (
				<main className="a-status-panel" role="alert">
					<Info size={30} />
					<h2>Link not found</h2>
					<p>{issue}</p>
					<p className="a-muted">
						The link may refer to a different snapshot. No replacement card or
						category was selected.
					</p>
					<button
						type="button"
						className="a-primary-button"
						onClick={() => onNavigate({ game: snapshot.game })}
					>
						Open this game's full atlas
					</button>
				</main>
			) : (
				<>
					<div className={`a-map-caption ${groupsOpen ? "with-sidebar" : ""}`}>
						<div className="a-breadcrumb">
							{group ? (
								<>
									<button type="button" onClick={() => openGroup()}>
										<ArrowLeft size={16} />
										All cards
									</button>
									<span>/ {group.name}</span>
								</>
							) : (
								<span>
									All cards · {snapshot.cards.length.toLocaleString("en")}
								</span>
							)}
						</div>
						<span className="a-snapshot-date">
							As of {snapshot.asOf.slice(0, 10)}
						</span>
					</div>
					{selected && (
						<CardInspector
							card={selected}
							game={snapshot.game}
							categories={snapshot.categories}
							cards={cardsById}
							similar={similar}
							localEvaluation={localEvaluation}
							onAbout={onAbout}
							onCard={openCard}
							onGroup={openGroup}
							onSimilar={(value) =>
								onNavigate({ ...state, similar: value ? "on" : undefined })
							}
							onClose={() => {
								onNavigate({ ...state, card: undefined, similar: undefined });
								searchRef.current?.focus();
							}}
						/>
					)}
				</>
			)}
			{groupsOpen && (
				<aside
					className="a-sidebar"
					id="atlas-groups"
					aria-label="Browse categories and cards"
				>
					<div className="a-sidebar-heading">
						<span>BROWSE THE ATLAS</span>
						<button
							type="button"
							className="a-icon-button"
							aria-label="Close browser panel"
							onClick={() => {
								setGroupsOpen(false);
								groupsButtonRef.current?.focus();
							}}
						>
							<X size={18} />
						</button>
					</div>
					<button
						type="button"
						className={`a-group-button ${!group ? "a-active" : ""}`}
						onClick={() => openGroup()}
						aria-pressed={!group}
					>
						<Compass size={18} />
						<span>All cards</span>
						<span className="a-count">
							{snapshot.cards.length.toLocaleString("en")}
						</span>
					</button>
					<div className="a-categories">
						{snapshot.categories.map((category) => (
							<button
								type="button"
								key={category.id}
								className={`a-group-button ${group?.id === category.id ? "a-active" : ""}`}
								aria-pressed={group?.id === category.id}
								title={category.description}
								onClick={() => openGroup(category.id)}
							>
								<span
									className="a-category-dot"
									style={{ backgroundColor: category.color }}
								/>
								<span>{category.name}</span>
								<span className="a-count">
									{category.count.toLocaleString("en")}
								</span>
							</button>
						))}
					</div>
					<p className="a-sidebar-note">
						One dot per gameplay card. Categories may overlap; positions stay
						fixed when filtering.
					</p>
					{group && <p className="a-sidebar-note">{group.description}</p>}
					<h2 className="a-browse-heading">
						{query.trim()
							? "Search matches across all cards"
							: group
								? `${group.name} cards`
								: "Cards"}
					</h2>
					<p className="a-muted">
						{browsed.length.toLocaleString("en")}{" "}
						{query.trim() ? "matches" : "cards"}
					</p>
					<div className="a-card-list">
						{resultPage.map((card) => (
							<button
								type="button"
								key={card.id}
								onClick={() => openCard(card.id)}
								aria-current={selected?.id === card.id ? "true" : undefined}
							>
								<strong>{card.name}</strong>
								<small>{card.type}</small>
							</button>
						))}
					</div>
					{!browsed.length && <p>No cards match this selection.</p>}
					{browsed.length > 40 && (
						<div className="a-pagination">
							<button
								type="button"
								disabled={page === 0}
								onClick={() => setPage((value) => value - 1)}
								aria-label="Previous card page"
							>
								<ArrowLeft size={18} />
							</button>
							<span>
								{page + 1} / {Math.ceil(browsed.length / 40)}
							</span>
							<button
								type="button"
								disabled={(page + 1) * 40 >= browsed.length}
								onClick={() => setPage((value) => value + 1)}
								aria-label="Next card page"
							>
								<ArrowRight size={18} />
							</button>
						</div>
					)}
					<div className="a-snapshot">
						<strong>
							{localEvaluation
								? "LOCAL EVALUATION SNAPSHOT"
								: "STATIC SNAPSHOT"}
						</strong>
						<p>
							{snapshot.cards.length.toLocaleString("en")} gameplay cards
							<br />
							{snapshot.windowStart
								? `${snapshot.windowStart.slice(0, 10)} through ${snapshot.asOf.slice(0, 10)}`
								: `${localEvaluation ? "Local source" : "Official catalog"} as of ${snapshot.asOf.slice(0, 10)}`}
						</p>
						<small>
							Source rules and model interpretation are distinct. See About for
							provenance.
						</small>
					</div>
				</aside>
			)}
			{!selected && !issue && (
				<p className="a-map-note">
					Prepared semantic positions · drag or use map controls · browse to
					select with a keyboard
				</p>
			)}
		</div>
	);
}

function About({
	open,
	onClose,
	manifest,
	snapshot,
}: {
	open: boolean;
	onClose: () => void;
	manifest?: AtlasManifest;
	snapshot?: AtlasSnapshot;
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const localSources =
		snapshot?.sources.filter((source) => source.localOnly) ?? [];
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			openerRef.current =
				document.activeElement instanceof HTMLElement
					? document.activeElement
					: null;
			dialog.showModal();
		} else if (!open && dialog.open) dialog.close();
	}, [open]);
	return (
		<dialog
			ref={dialogRef}
			className="a-about"
			aria-labelledby="about-heading"
			onCancel={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onClose();
			}}
			onClose={() => {
				openerRef.current?.focus();
				if (open) onClose();
			}}
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) {
					const rect = event.currentTarget.getBoundingClientRect();
					if (
						event.clientX < rect.left ||
						event.clientX > rect.right ||
						event.clientY < rect.top ||
						event.clientY > rect.bottom
					)
						onClose();
				}
			}}
		>
			<button
				type="button"
				className="a-about-close a-icon-button"
				aria-label="Close About"
				onClick={onClose}
			>
				<X size={21} />
			</button>
			<Compass size={32} />
			<h2 id="about-heading">Cards connected by meaning.</h2>
			<p>
				Explore two independent game catalogs. Categories, structured effects,
				neighbors, and stable map coordinates are prepared together as static
				snapshots. The browser reads those files, not live catalog or model
				APIs.
			</p>
			<p>
				Production Riftbound catalogs use Riot's approved developer API. Local
				evaluation sources are identified separately and do not establish full
				approved-API coverage. Magic: The Gathering includes paper cards
				released or reprinted in the preceding 12 calendar months, with no
				future printing. Gameplay cards are deduplicated while their printings
				are retained.
			</p>
			<p>
				Analysis is prepared with Codex{" "}
				<strong>gpt-6-luna · low reasoning</strong>. Model summaries and
				mechanic labels can be wrong. Similarity is not interchangeability or a
				guarantee of full rules coverage. Use original English rules and
				official rulings for play.
			</p>
			{localSources.length > 0 && (
				<section className="a-warning">
					<h3>Local evaluation</h3>
					<p>
						This snapshot uses{" "}
						{localSources.map((source) => source.name).join("; ")} for local
						testing. It is real source data, but not an approved developer-API
						snapshot. Complete catalog coverage has not been verified. This
						source is not eligible for public publication.
					</p>
				</section>
			)}
			{snapshot ? (
				<section>
					<h3>Current snapshot</h3>
					<dl>
						<dt>Game</dt>
						<dd>
							{snapshot.game === "mtg" ? "Magic: The Gathering" : "Riftbound"}
						</dd>
						<dt>As of</dt>
						<dd>{snapshot.asOf}</dd>
						{snapshot.windowStart && (
							<>
								<dt>Release window starts</dt>
								<dd>{snapshot.windowStart}</dd>
							</>
						)}
						<dt>Prepared</dt>
						<dd>{snapshot.generatedAt}</dd>
						<dt>Snapshot</dt>
						<dd>{snapshot.id}</dd>
						<dt>Model</dt>
						<dd>
							{snapshot.model.name} · {snapshot.model.reasoning}
						</dd>
						<dt>Layout</dt>
						<dd>
							{snapshot.layout.method}: {snapshot.layout.description}
						</dd>
					</dl>
					<h3>Sources</h3>
					<ul>
						{snapshot.sources.map((source) => (
							<li key={source.url}>
								<a href={source.url} target="_blank" rel="noreferrer">
									{source.name} (new tab)
								</a>
								<p>
									Retrieved {source.retrievedAt}
									{source.version ? ` · ${source.version}` : ""}
									{source.localOnly ? " · Local evaluation only" : ""}
								</p>
							</li>
						))}
					</ul>
				</section>
			) : (
				<p className="a-warning">
					No analyzed snapshot is currently loaded. No data-source retrieval
					date or prepared map is claimed.
				</p>
			)}
			{manifest && (
				<section>
					<h3>Available catalogs</h3>
					<ul>
						{manifest.games.map((game) => (
							<li key={game.id}>
								{game.name}:{" "}
								{game.snapshot
									? `snapshot available${game.asOf ? `, as of ${game.asOf}` : ""}`
									: game.unavailableReason || "snapshot not available"}
							</li>
						))}
					</ul>
				</section>
			)}
			<h3>Attribution</h3>
			<p>
				Cards Atlas was created under Riot Games' "Legal Jibber Jabber" policy
				using assets owned by Riot Games. Riot Games does not endorse or sponsor
				this project.
			</p>
			<p>
				<a
					href="https://developer.riotgames.com/policies/riftbound"
					target="_blank"
					rel="noreferrer"
				>
					Riftbound developer policy (new tab)
				</a>
			</p>
			<p>
				Magic: The Gathering and its card names, text, and illustrations are ©
				Wizards of the Coast LLC. This is an unofficial fan project, not
				affiliated with or endorsed by Wizards of the Coast. Artwork remains the
				property of its respective rights holders; individual artists are
				identified where the source provides them.
			</p>
			<button type="button" className="a-primary-button" onClick={onClose}>
				Back to the atlas
				<ArrowRight size={17} />
			</button>
		</dialog>
	);
}

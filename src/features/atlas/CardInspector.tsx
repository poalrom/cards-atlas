import { ArrowLeft, ArrowRight, Link2, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
	AtlasCard,
	AtlasCategory,
	CardFace,
	GameId,
} from "../../entities/catalog/types";
import { CardText, featureName } from "./shared-ui";

export function OriginalFaces({
	card,
	game,
}: {
	card: AtlasCard;
	game: GameId;
}) {
	const faces: CardFace[] = card.faces;
	const cardAttributes = Object.entries(card.attributes ?? {}).filter(
		([name, value]) => !faces.some((face) => face.attributes?.[name] === value),
	);
	return (
		<div className="a-original-faces">
			{faces.map((face, index) => (
				<section
					className="a-face"
					// biome-ignore lint/suspicious/noArrayIndexKey: Faces retain source order within an immutable card snapshot.
					key={`${index}-${face.name}`}
					aria-label={face.name}
				>
					<div className="a-face-heading">
						<h3>{face.name}</h3>
						{face.cost && (
							<span className="a-cost">
								<span className="sr-only">Cost: </span>
								<CardText text={face.cost} game={game} />
							</span>
						)}
					</div>
					<p className="a-card-type">{face.type}</p>
					<p className="a-rules">
						{face.text ? (
							<CardText text={face.text} game={game} />
						) : (
							"No printed rules text."
						)}
					</p>
					{face.attributes && Object.keys(face.attributes).length > 0 && (
						<dl className="a-attributes">
							{Object.entries(face.attributes).map(([name, value]) => (
								<div key={name}>
									<dt>{featureName(name)}</dt>
									<dd>{value}</dd>
								</div>
							))}
						</dl>
					)}
				</section>
			))}
			{cardAttributes.length > 0 && (
				<dl className="a-attributes">
					{cardAttributes.map(([name, value]) => (
						<div key={name}>
							<dt>{featureName(name)}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			)}
			{!!card.tags?.length && (
				<p className="a-card-tags">
					<strong>Tags:</strong> {card.tags.join(" · ")}
				</p>
			)}
		</div>
	);
}

interface Props {
	card: AtlasCard;
	game: GameId;
	categories: AtlasCategory[];
	cards: Map<string, AtlasCard>;
	similar: boolean;
	localEvaluation: boolean;
	onAbout: () => void;
	onCard: (id: string) => void;
	onGroup: (id: string) => void;
	onSimilar: (value: boolean) => void;
	onClose: () => void;
}

export function CardInspector({
	card,
	game,
	categories,
	cards,
	similar,
	localEvaluation,
	onAbout,
	onCard,
	onGroup,
	onSimilar,
	onClose,
}: Props) {
	const [copyStatus, setCopyStatus] = useState("");
	const [failedImage, setFailedImage] = useState<string>();
	const panelRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		panelRef.current?.scrollTo({ top: 0 });
		headingRef.current?.focus({ preventScroll: true });
		setCopyStatus("");
	}, [card.id, similar]);
	const image =
		card.faces[0]?.image ??
		card.printings.find((printing) => printing.image)?.image;
	return (
		<aside
			ref={panelRef}
			className={`a-inspector ${similar ? "a-similarity" : ""}`}
			aria-labelledby="inspector-heading"
		>
			<div className="a-inspector-topline">
				<span>{similar ? "PRECOMPUTED NEIGHBORS" : "CARD DETAILS"}</span>
				<button
					type="button"
					aria-label={similar ? "Back to card details" : "Close card details"}
					onClick={() => (similar ? onSimilar(false) : onClose())}
				>
					{similar ? <ArrowLeft size={18} /> : <X size={18} />}
				</button>
			</div>
			{localEvaluation && (
				<button
					type="button"
					className="a-local-banner a-inspector-source"
					onClick={onAbout}
				>
					<strong>Local evaluation</strong>
					<span>Source coverage unverified · About</span>
				</button>
			)}
			<div className="a-inspector-body">
				<h2 id="inspector-heading" ref={headingRef} tabIndex={-1}>
					{similar ? `Similar to ${card.name}` : card.name}
				</h2>
				{similar ? (
					<>
						<p className="a-muted">
							Similarity is a prepared semantic score, not a claim of
							equivalence, legality, or complete effect coverage. Read both
							originals.
						</p>
						<details className="a-source-original">
							<summary>Original: {card.name}</summary>
							<OriginalFaces card={card} game={game} />
						</details>
						{card.similar.length ? (
							<div className="a-neighbors">
								{card.similar.map((neighbor) => {
									const candidate = cards.get(neighbor.id);
									if (!candidate) return null;
									return (
										<article className="a-result-card" key={neighbor.id}>
											<div className="a-result-top">
												<span>
													Semantic score {(neighbor.score * 100).toFixed(1)} /
													100
												</span>
											</div>
											<button
												type="button"
												className="a-result-name"
												onClick={() => onCard(candidate.id)}
											>
												{candidate.name}
												<ArrowRight size={17} />
											</button>
											<h3>Shared features</h3>
											<ul>
												{neighbor.shared.map((feature) => (
													<li key={feature}>
														<CardText text={feature} game={game} />
													</li>
												))}
											</ul>
											<OriginalFaces card={candidate} game={game} />
											<button
												type="button"
												className="a-text-button"
												onClick={() => onCard(candidate.id)}
											>
												Open full card details
												<ArrowRight size={16} />
											</button>
										</article>
									);
								})}
							</div>
						) : (
							<p className="a-warning">
								No neighbors were published for this card. This is not a claim
								that no similar cards exist.
							</p>
						)}
					</>
				) : (
					<>
						{image &&
							(failedImage === image ? (
								<p className="a-image-unavailable" role="status">
									Card image unavailable. Original card text remains below.
								</p>
							) : (
								<img
									key={image}
									className="a-card-image"
									src={image}
									alt={`Printed card: ${card.faces[0]?.name ?? card.name}`}
									onError={() => setFailedImage(image)}
								/>
							))}
						<div className="a-rules-label">ORIGINAL ENGLISH TEXT</div>
						<OriginalFaces card={card} game={game} />
						<div className="a-rules-label">MODEL SUMMARY</div>
						<p>
							<CardText text={card.analysis.summary} game={game} />
						</p>
						<p className="a-muted">
							Machine-prepared interpretation. The original rules take
							precedence.
						</p>
						{card.analysis.keywords.length > 0 && (
							<p className="a-keywords">
								<strong>Keywords:</strong>{" "}
								{card.analysis.keywords.map(featureName).join(" · ")}
							</p>
						)}
						<h3>Effects, targets, and conditions</h3>
						{card.analysis.effects.length ? (
							<ol className="a-effects">
								{card.analysis.effects.map((effect, index) => (
									<li
										// biome-ignore lint/suspicious/noArrayIndexKey: Repeated effects retain their printed order within an immutable analysis.
										key={index}
									>
										<strong>
											<CardText text={featureName(effect.action)} game={game} />
										</strong>
										<dl>
											<dt>Targets</dt>
											<dd>
												{effect.targets.length ? (
													<CardText
														text={effect.targets.map(featureName).join("; ")}
														game={game}
													/>
												) : (
													"None identified"
												)}
											</dd>
											<dt>Conditions</dt>
											<dd>
												{effect.conditions.length ? (
													<CardText
														text={effect.conditions.map(featureName).join("; ")}
														game={game}
													/>
												) : (
													"None identified"
												)}
											</dd>
											{effect.mode !== null && (
												<>
													<dt>Mode</dt>
													<dd>
														<CardText
															text={featureName(effect.mode)}
															game={game}
														/>
													</dd>
												</>
											)}
										</dl>
									</li>
								))}
							</ol>
						) : (
							<p className="a-muted">No structured effects were identified.</p>
						)}
						<h3>Mechanic categories</h3>
						<div className="a-memberships">
							{card.analysis.categories.length ? (
								card.analysis.categories.map((id) => {
									const category = categories.find(
										(candidate) => candidate.id === id,
									);
									return category ? (
										<button type="button" key={id} onClick={() => onGroup(id)}>
											{category.name}
											<ArrowRight size={15} />
										</button>
									) : null;
								})
							) : (
								<p className="a-muted">No categories assigned.</p>
							)}
						</div>
						<button
							type="button"
							className="a-primary-button"
							onClick={() => onSimilar(true)}
						>
							<Sparkles size={17} />
							Explore similar cards
							<ArrowRight size={17} />
						</button>
						<button
							type="button"
							className="a-copy-link"
							onClick={() => {
								setCopyStatus("");
								void (async () => {
									try {
										await navigator.clipboard.writeText(window.location.href);
										setCopyStatus("Link copied.");
									} catch {
										setCopyStatus(
											"Could not copy. Copy this page's address from your browser instead.",
										);
									}
								})();
							}}
						>
							<Link2 size={16} />
							Copy card link
						</button>
						<p className="a-copy-status" role="status">
							{copyStatus}
						</p>
						<h3>Printings ({card.printings.length.toLocaleString("en")})</h3>
						<p className="a-muted">
							One gameplay card on the map; all imported printings retained
							here.
						</p>
						<div className="a-printings">
							{card.printings.map((printing) => (
								<details key={printing.id}>
									<summary>
										{printing.setName || printing.setCode} · {printing.number}
									</summary>
									<dl>
										<dt>Set</dt>
										<dd>
											{printing.setName} ({printing.setCode})
										</dd>
										<dt>Collector number</dt>
										<dd>{printing.number || "Not provided"}</dd>
										<dt>Release date</dt>
										<dd>{printing.releasedAt ?? "Not provided by source"}</dd>
										<dt>Printing ID</dt>
										<dd>{printing.id}</dd>
									</dl>
									{printing.sourceUrl && (
										<a
											href={printing.sourceUrl}
											target="_blank"
											rel="noreferrer"
										>
											View source printing (new tab)
										</a>
									)}
									{printing.image && (
										<a href={printing.image} target="_blank" rel="noreferrer">
											View original image (new tab)
										</a>
									)}
								</details>
							))}
						</div>
						{card.faces.some((face) => face.artist) && (
							<p className="a-muted">
								Art:{" "}
								{[
									...new Set(
										card.faces.map((face) => face.artist).filter(Boolean),
									),
								].join("; ")}
							</p>
						)}
					</>
				)}
			</div>
		</aside>
	);
}

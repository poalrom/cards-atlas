import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Focus,
	Minus,
	Plus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AtlasCard, AtlasCategory } from "../../entities/catalog/types";

interface Props {
	cards: AtlasCard[];
	categories: AtlasCategory[];
	selected?: AtlasCard;
	group?: string;
	sidebar: boolean;
	onCard: (id: string) => void;
}
interface Point {
	x: number;
	y: number;
}

export function AtlasMap({
	cards,
	categories,
	selected,
	group,
	sidebar,
	onCard,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const hitGrid = useRef(
		new Map<string, { card: AtlasCard; x: number; y: number }[]>(),
	);
	const pointers = useRef(new Map<number, Point>());
	const gesture = useRef<{
		point: Point;
		distance: number;
		moved: boolean;
	} | null>(null);
	const [size, setSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});
	const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [hovered, setHovered] = useState<string>();
	const bounds = useMemo(() => {
		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity;
		for (const card of cards) {
			minX = Math.min(minX, card.x);
			maxX = Math.max(maxX, card.x);
			minY = Math.min(minY, card.y);
			maxY = Math.max(maxY, card.y);
		}
		return cards.length
			? {
					x: (minX + maxX) / 2,
					y: (minY + maxY) / 2,
					width: Math.max(maxX - minX, 0.1),
					height: Math.max(maxY - minY, 0.1),
				}
			: { x: 0, y: 0, width: 1, height: 1 };
	}, [cards]);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const observer = new ResizeObserver(([entry]) =>
			setSize({
				width: entry.contentRect.width,
				height: entry.contentRect.height,
			}),
		);
		observer.observe(canvas);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		setPan({ x: 0, y: 0 });
		setZoom(1);
	}, [group, selected?.id]);
	const phone = size.width < 768;
	const compact = size.width < 1200;
	const bottomPanel = compact && size.height > 600;
	const left =
		!compact && sidebar ? 340 : phone && selected && !bottomPanel ? 112 : 36;
	const right =
		selected && !bottomPanel
			? compact
				? Math.min(424, size.width * 0.5 + 12)
				: 450
			: 36;
	const top = phone ? 200 : 160;
	const bottom =
		bottomPanel && selected ? Math.min(size.height * 0.53, 500) + 24 : 90;
	const width = Math.max(80, size.width - left - right);
	const height = Math.max(60, size.height - top - bottom);
	const scale =
		Math.min(width / (bounds.width * 1.15), height / (bounds.height * 1.15)) *
		zoom;
	const origin = { x: left + width / 2 + pan.x, y: top + height / 2 + pan.y };
	const center = selected ?? bounds;

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(size.width * ratio);
		canvas.height = Math.round(size.height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		const styles = getComputedStyle(canvas);
		const background = styles.getPropertyValue("--atlas-background").trim();
		const muted = styles.getPropertyValue("--atlas-muted").trim();
		const accent = styles.getPropertyValue("--atlas-accent").trim();
		const surface = styles.getPropertyValue("--atlas-surface").trim();
		ctx.clearRect(0, 0, size.width, size.height);
		ctx.fillStyle = styles.getPropertyValue("--atlas-border").trim();
		for (let x = 13; x < size.width; x += 26)
			for (let y = 13; y < size.height; y += 26) {
				ctx.beginPath();
				ctx.arc(x, y, 0.8, 0, Math.PI * 2);
				ctx.fill();
			}
		const colors = new Map(
			categories.map((category) => [category.id, category.color]),
		);
		const positions = new Map<string, Point>();
		for (const card of cards)
			positions.set(card.id, {
				x: origin.x + (card.x - center.x) * scale,
				y: origin.y + (card.y - center.y) * scale,
			});
		if (selected) {
			const start = positions.get(selected.id);
			if (start)
				for (const neighbor of selected.similar) {
					const end = positions.get(neighbor.id);
					if (!end) continue;
					ctx.beginPath();
					ctx.moveTo(start.x, start.y);
					ctx.lineTo(end.x, end.y);
					ctx.strokeStyle = accent;
					ctx.globalAlpha = 0.2;
					ctx.lineWidth = 1;
					ctx.stroke();
					ctx.globalAlpha = 1;
				}
		}
		const grid = new Map<string, { card: AtlasCard; x: number; y: number }[]>();
		const radius = cards.length > 3000 ? 2.5 : cards.length > 500 ? 3.5 : 5;
		for (const card of cards) {
			const point = positions.get(card.id);
			if (!point) throw new Error(`Missing screen position for ${card.id}`);
			if (
				point.x < -40 ||
				point.y < -40 ||
				point.x > size.width + 40 ||
				point.y > size.height + 40
			)
				continue;
			const active = selected?.id === card.id;
			const highlighted = active || hovered === card.id;
			const color = colors.get(card.analysis.categories[0]) ?? accent;
			if (highlighted) {
				ctx.beginPath();
				ctx.arc(point.x, point.y, 16, 0, Math.PI * 2);
				ctx.fillStyle = surface;
				ctx.fill();
				ctx.strokeStyle = accent;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
			ctx.beginPath();
			ctx.arc(point.x, point.y, active ? 8 : radius, 0, Math.PI * 2);
			ctx.fillStyle = active ? accent : color;
			ctx.fill();
			const key = `${Math.floor(point.x / 32)},${Math.floor(point.y / 32)}`;
			const bucket = grid.get(key) ?? [];
			bucket.push({ card, ...point });
			grid.set(key, bucket);
		}
		hitGrid.current = grid;
		ctx.font = `15px ${styles.fontFamily}`;
		ctx.textAlign = "center";
		ctx.lineWidth = 5;
		ctx.strokeStyle = background;
		for (const category of categories) {
			if (group && category.id !== group) continue;
			const x = origin.x + (category.x - center.x) * scale;
			const y = origin.y + (category.y - center.y) * scale - 24;
			ctx.strokeText(category.name, x, y);
			ctx.fillStyle = muted;
			ctx.fillText(category.name, x, y);
		}
		for (const id of new Set([hovered, selected?.id])) {
			const card = cards.find((candidate) => candidate.id === id);
			const point = id ? positions.get(id) : undefined;
			if (!card || !point) continue;
			if (id === selected?.id) {
				ctx.beginPath();
				ctx.arc(point.x, point.y, 16, 0, Math.PI * 2);
				ctx.fillStyle = surface;
				ctx.fill();
				ctx.strokeStyle = accent;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
				ctx.fillStyle = accent;
				ctx.fill();
				ctx.strokeStyle = background;
				ctx.lineWidth = 5;
			}
			ctx.strokeText(card.name, point.x, point.y + 32);
			ctx.fillStyle = accent;
			ctx.fillText(card.name, point.x, point.y + 32);
		}
	}, [
		cards,
		categories,
		selected,
		hovered,
		group,
		size,
		origin.x,
		origin.y,
		center.x,
		center.y,
		scale,
	]);

	const nearest = (x: number, y: number) => {
		let closest: AtlasCard | undefined;
		let distance = 22;
		const cellX = Math.floor(x / 32),
			cellY = Math.floor(y / 32);
		for (let dx = -1; dx <= 1; dx++)
			for (let dy = -1; dy <= 1; dy++) {
				for (const point of hitGrid.current.get(
					`${cellX + dx},${cellY + dy}`,
				) ?? []) {
					const candidate = Math.hypot(point.x - x, point.y - y);
					if (candidate < distance) {
						closest = point.card;
						distance = candidate;
					}
				}
			}
		return closest;
	};
	return (
		<>
			<main className="a-map-section" aria-label="Semantic card atlas">
				<canvas
					ref={canvasRef}
					className="a-map-canvas"
					tabIndex={0}
					aria-label="Card map. Drag to pan, pinch to zoom. Arrow keys pan; plus and minus zoom; Home resets. Use Search or Browse cards for accessible card selection."
					onKeyDown={(event) => {
						const steps: Record<string, Point> = {
							ArrowLeft: { x: 60, y: 0 },
							ArrowRight: { x: -60, y: 0 },
							ArrowUp: { x: 0, y: 60 },
							ArrowDown: { x: 0, y: -60 },
						};
						const step = steps[event.key];
						if (step) {
							event.preventDefault();
							setPan((previous) => ({
								x: previous.x + step.x,
								y: previous.y + step.y,
							}));
						} else if (event.key === "+" || event.key === "=") {
							event.preventDefault();
							setZoom((value) => Math.min(value * 1.3, 100));
						} else if (event.key === "-") {
							event.preventDefault();
							setZoom((value) => Math.max(value / 1.3, 0.2));
						} else if (event.key === "Home") {
							event.preventDefault();
							setZoom(1);
							setPan({ x: 0, y: 0 });
						}
					}}
					onWheel={(event) => {
						setZoom((value) =>
							Math.max(
								0.2,
								Math.min(100, value * (event.deltaY < 0 ? 1.1 : 1 / 1.1)),
							),
						);
					}}
					onPointerDown={(event) => {
						event.currentTarget.setPointerCapture(event.pointerId);
						pointers.current.set(event.pointerId, {
							x: event.clientX,
							y: event.clientY,
						});
						const points = [...pointers.current.values()];
						gesture.current = {
							point: { x: event.clientX, y: event.clientY },
							distance:
								points.length > 1
									? Math.hypot(
											points[0].x - points[1].x,
											points[0].y - points[1].y,
										)
									: 0,
							moved: points.length > 1,
						};
					}}
					onPointerMove={(event) => {
						const previous = pointers.current.get(event.pointerId);
						const activeGesture = gesture.current;
						if (!previous || !activeGesture) {
							setHovered(nearest(event.clientX, event.clientY)?.id);
							return;
						}
						pointers.current.set(event.pointerId, {
							x: event.clientX,
							y: event.clientY,
						});
						const points = [...pointers.current.values()];
						if (points.length > 1) {
							const distance = Math.hypot(
								points[0].x - points[1].x,
								points[0].y - points[1].y,
							);
							const previousDistance = activeGesture.distance;
							if (previousDistance > 0)
								setZoom((value) =>
									Math.max(
										0.2,
										Math.min(100, (value * distance) / previousDistance),
									),
								);
							activeGesture.distance = distance;
						} else {
							setPan((value) => ({
								x: value.x + event.clientX - previous.x,
								y: value.y + event.clientY - previous.y,
							}));
						}
						if (
							Math.hypot(
								event.clientX - activeGesture.point.x,
								event.clientY - activeGesture.point.y,
							) > 5
						)
							activeGesture.moved = true;
					}}
					onPointerUp={(event) => {
						if (!gesture.current?.moved) {
							const card = nearest(event.clientX, event.clientY);
							if (card) onCard(card.id);
						}
						pointers.current.delete(event.pointerId);
						if (!pointers.current.size) gesture.current = null;
					}}
					onPointerCancel={() => {
						pointers.current.clear();
						gesture.current = null;
					}}
					onPointerLeave={() => setHovered(undefined)}
				/>
			</main>
			<nav className="a-map-navigation" aria-label="Map navigation">
				<button
					type="button"
					onClick={() => setZoom((value) => Math.min(value * 1.4, 100))}
					aria-label="Zoom in"
				>
					<Plus size={18} />
				</button>
				<button
					type="button"
					onClick={() => setZoom((value) => Math.max(value / 1.4, 0.2))}
					aria-label="Zoom out"
				>
					<Minus size={18} />
				</button>
				<button
					type="button"
					onClick={() => {
						setZoom(1);
						setPan({ x: 0, y: 0 });
					}}
					aria-label="Reset map view"
				>
					<Focus size={18} />
				</button>
				<div className="a-pan-buttons">
					<button
						type="button"
						onClick={() => setPan((value) => ({ ...value, x: value.x + 80 }))}
						aria-label="Pan left"
					>
						<ArrowLeft size={18} />
					</button>
					<button
						type="button"
						onClick={() => setPan((value) => ({ ...value, y: value.y + 80 }))}
						aria-label="Pan up"
					>
						<ArrowUp size={18} />
					</button>
					<button
						type="button"
						onClick={() => setPan((value) => ({ ...value, y: value.y - 80 }))}
						aria-label="Pan down"
					>
						<ArrowDown size={18} />
					</button>
					<button
						type="button"
						onClick={() => setPan((value) => ({ ...value, x: value.x - 80 }))}
						aria-label="Pan right"
					>
						<ArrowRight size={18} />
					</button>
				</div>
			</nav>
		</>
	);
}

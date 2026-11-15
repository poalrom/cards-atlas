import type { GameId } from "../../entities/catalog/types";

const symbolLabels: Record<string, string> = {
	"1": "One generic mana",
	"2": "Two generic mana",
	W: "White mana",
	U: "Blue mana",
	B: "Black mana",
	R: "Red mana",
	G: "Green mana",
	C: "Colorless mana",
	T: "Tap",
};

export function featureName(value: string): string {
	const label = value.replaceAll("-", " ");
	return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CardText({ text, game }: { text: string; game: GameId }) {
	if (game !== "mtg") {
		return (
			<>
				{text
					.split(/(:rb_[a-z][a-z0-9_]*:)/g)
					.map((part) =>
						/^:rb_[a-z][a-z0-9_]*:$/.test(part)
							? `[${featureName(part.slice(4, -1).replaceAll("_", "-"))}]`
							: part,
					)}
			</>
		);
	}
	return (
		<>
			{text.split(/(\{[^{}]+\})/g).map((part, index) => {
				const symbol =
					part.startsWith("{") && part.endsWith("}")
						? part.slice(1, -1)
						: undefined;
				const label =
					symbol !== undefined && Object.hasOwn(symbolLabels, symbol)
						? symbolLabels[symbol]
						: undefined;
				return label ? (
					<img
						// biome-ignore lint/suspicious/noArrayIndexKey: Repeated mana symbols are stateless positions in an immutable rules string.
						key={index}
						className="a-mtg-symbol"
						src={`${import.meta.env.BASE_URL}symbols/${symbol}.svg`}
						alt={label}
						title={label}
					/>
				) : (
					part
				);
			})}
		</>
	);
}

import { Ban, BookOpen, CircleHelp, Flower2, Layers3, RotateCcw, Skull, Sprout, Swords } from 'lucide-react';
import type { DemoCard, GroupId } from './types';

const mechanicIcons = { counter: Ban, removal: Swords, draw: BookOpen, ramp: Sprout, mill: Skull, graveyard: RotateCcw, other: Layers3 };
export function MechanicIcon({ id, size = 18 }: { id: GroupId; size?: number }) {
  const Icon = mechanicIcons[id];
  return <Icon size={size} strokeWidth={1.65} aria-hidden="true" />;
}
export function ManaCost({ symbols }: { symbols: string[] }) {
  return <span className="mana-cost" aria-label={`Mana cost: ${symbols.join(' ')}`}>{symbols.map((symbol, index) => <span key={index} className={`mana-symbol mana-${symbol}`}>{symbol}</span>)}</span>;
}
export function CardArt({ card, className = '' }: { card: DemoCard; className?: string }) {
  return <div className={`card-art card-art-${card.groups[0]} ${className}`}>{card.art ? <img src={card.art} alt={`Card artwork ${card.name}`} /> : <div className="card-art-placeholder"><Flower2 size={56} strokeWidth={0.8} /><span>{card.name}</span></div>}</div>;
}
export function UnknownPrice() {
  return <span className="unknown-price"><CircleHelp size={12} /> Price unknown</span>;
}

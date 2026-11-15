import type { Comparison, CompareMode, DemoCard, GroupId, MechanicGroup } from './types';

// Fixed, hand-curated control examples, NOT an MTGJSON 24-month import.
export const groups: MechanicGroup[] = [
  { id: 'counter', name: 'Counterspells', short: 'Counter', description: 'Prevent a spell from resolving', color: '#5779e8', x: 290, y: 180 },
  { id: 'removal', name: 'Permanent removal', short: 'Removal', description: 'Clear the battlefield', color: '#d88867', x: 660, y: 170 },
  { id: 'draw', name: 'Card draw', short: 'Draw', description: 'More cards, more possibilities', color: '#57a69d', x: 470, y: 410 },
  { id: 'ramp', name: 'Mana ramp', short: 'Ramp', description: 'Gain a resource advantage', color: '#91aa63', x: 190, y: 580 },
  { id: 'mill', name: 'Filling the graveyard', short: 'Graveyard', description: 'Turn the library into a resource', color: '#ac91bf', x: 770, y: 415 },
  { id: 'graveyard', name: 'Graveyard recursion', short: 'Recursion', description: 'Give cards a second life', color: '#c4a457', x: 590, y: 635 },
  { id: 'other', name: 'Other', short: 'Other', description: 'Beyond the initial mechanics', color: '#929aa9', x: 860, y: 650 },
];
export const cards: DemoCard[] = [
  { id: 'dismiss', name: 'Dismiss', mana: ['2','U','U'], type: 'Instant', text: 'Counter target spell.\nDraw a card.', groups: ['counter','draw'], effects: ['Counter any spell', 'Draw a card'], target: 'any', art: '/art/dismiss.jpg' },
  { id: 'negate', name: 'Negate', mana: ['1','U'], type: 'Instant', text: 'Counter target noncreature spell.', groups: ['counter'], effects: ['Counter a noncreature spell'], target: 'noncreature', art: '/art/negate.jpg' },
  { id: 'counterspell', name: 'Counterspell', mana: ['U','U'], type: 'Instant', text: 'Counter target spell.', groups: ['counter'], effects: ['Counter any spell'], target: 'any', art: '/art/counterspell.jpg' },
  { id: 'spell-pierce', name: 'Spell Pierce', mana: ['U'], type: 'Instant', text: 'Counter target noncreature spell unless its controller pays {2}.', groups: ['counter'], effects: ['Counter a noncreature spell'], target: 'noncreature', condition: 'Unless its controller pays {2}' },
  { id: 'offer', name: 'An Offer You Can’t Refuse', mana: ['U'], type: 'Instant', text: 'Counter target noncreature spell. Its controller creates two Treasure tokens.', groups: ['counter'], effects: ['Counter a noncreature spell'], target: 'noncreature', sideEffect: 'The target controller creates 2 Treasure tokens' },
  { id: 'essence-scatter', name: 'Essence Scatter', mana: ['1','U'], type: 'Instant', text: 'Counter target creature spell.', groups: ['counter'], effects: ['Counter a creature spell'], target: 'creature' },
  { id: 'arcane-denial', name: 'Arcane Denial', mana: ['1','U'], type: 'Instant', text: 'Counter target spell. Its controller may draw up to two cards at the beginning of the next turn’s upkeep.\nYou draw a card at the beginning of the next turn’s upkeep.', groups: ['counter','draw'], effects: ['Counter any spell', 'Draw a card at the beginning of the next upkeep'], target: 'any', condition: 'Drawing is delayed until the next upkeep', sideEffect: 'The target controller may draw up to 2 cards' },
  { id: 'cryptic-command', name: 'Cryptic Command', mana: ['1','U','U','U'], type: 'Instant', text: 'Choose two —\n• Counter target spell.\n• Return target permanent to its owner’s hand.\n• Tap all creatures your opponents control.\n• Draw a card.', groups: ['counter','draw'], effects: ['Counter any spell', 'Draw a card'], target: 'any', sideEffect: 'Choose two modes' },
  { id: 'charm', name: 'Izzet Charm', mana: ['U','R'], type: 'Instant', text: 'Choose one —\n• Counter target noncreature spell unless its controller pays {2}.\n• Izzet Charm deals 2 damage to target creature.\n• Draw two cards, then discard two cards.', groups: ['counter','draw','removal'], effects: ['Counter a noncreature spell', 'Draw two cards, then discard two cards'], target: 'noncreature', condition: 'Unless its controller pays {2}', modal: true, sideEffect: 'Choose only one mode' },
  { id: 'opt', name: 'Opt', mana: ['U'], type: 'Instant', text: 'Scry 1.\nDraw a card.', groups: ['draw'], effects: ['Draw a card'], sideEffect: 'Scry 1' },
  { id: 'consider', name: 'Consider', mana: ['U'], type: 'Instant', text: 'Surveil 1.\nDraw a card.', groups: ['draw','mill'], effects: ['Surveil 1', 'Draw a card'] },
  { id: 'divination', name: 'Divination', mana: ['2','U'], type: 'Sorcery', text: 'Draw two cards.', groups: ['draw'], effects: ['Draw two cards'] },
  { id: 'sign-in-blood', name: 'Sign in Blood', mana: ['B','B'], type: 'Sorcery', text: 'Target player draws two cards and loses 2 life.', groups: ['draw'], effects: ['Target player draws two cards'], sideEffect: 'Target player loses 2 life' },
  { id: 'swords', name: 'Swords to Plowshares', mana: ['W'], type: 'Instant', text: 'Exile target creature. Its controller gains life equal to its power.', groups: ['removal'], effects: ['Exile a creature'], art: '/art/swords.jpg', sideEffect: 'Its controller gains life equal to the creature power' },
  { id: 'murder', name: 'Murder', mana: ['1','B','B'], type: 'Instant', text: 'Destroy target creature.', groups: ['removal'], effects: ['Destroy a creature'] },
  { id: 'feed-the-swarm', name: 'Feed the Swarm', mana: ['1','B'], type: 'Sorcery', text: 'Destroy target creature or enchantment an opponent controls. You lose life equal to that permanent’s mana value.', groups: ['removal'], effects: ['Destroy a creature or enchantment'], sideEffect: 'Lose life equal to the target mana value' },
  { id: 'cultivate', name: 'Cultivate', mana: ['2','G'], type: 'Sorcery', text: 'Search your library for up to two basic land cards, reveal those cards, and put one onto the battlefield tapped and the other into your hand. Then shuffle.', groups: ['ramp'], effects: ['Find basic lands for the battlefield and your hand'], art: '/art/cultivate.jpg' },
  { id: 'llanowar-elves', name: 'Llanowar Elves', mana: ['G'], type: 'Creature — Elf Druid', text: '{T}: Add {G}.', groups: ['ramp'], effects: ['Add green mana'] },
  { id: 'sol-ring', name: 'Sol Ring', mana: ['1'], type: 'Artifact', text: '{T}: Add {C}{C}.', groups: ['ramp'], effects: ['Add two colorless mana'] },
  { id: 'growth-spiral', name: 'Growth Spiral', mana: ['G','U'], type: 'Instant', text: 'Draw a card. You may put a land card from your hand onto the battlefield.', groups: ['draw','ramp'], effects: ['Draw a card', 'Put a land from your hand onto the battlefield'] },
  { id: 'millstone', name: 'Millstone', mana: ['2'], type: 'Artifact', text: '{2}, {T}: Target player mills two cards.', groups: ['mill'], effects: ['Target player mills two cards'] },
  { id: 'stitcher', name: 'Stitcher’s Supplier', mana: ['B'], type: 'Creature — Zombie', text: 'When this creature enters or dies, mill three cards.', groups: ['mill'], effects: ['Mill three cards on entering or dying'] },
  { id: 'reanimate', name: 'Reanimate', mana: ['B'], type: 'Sorcery', text: 'Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to its mana value.', groups: ['graveyard'], effects: ['Return a creature from a graveyard to the battlefield'], art: '/art/reanimate.jpg', sideEffect: 'Lose life equal to its mana value' },
  { id: 'regrowth', name: 'Regrowth', mana: ['1','G'], type: 'Sorcery', text: 'Return target card from your graveyard to your hand.', groups: ['graveyard'], effects: ['Return a card from your graveyard to your hand'] },
  { id: 'eternal-witness', name: 'Eternal Witness', mana: ['1','G','G'], type: 'Creature — Human Shaman', text: 'When this creature enters, you may return target card from your graveyard to your hand.', groups: ['graveyard'], effects: ['Return a card from your graveyard to your hand'] },
  { id: 'grist', name: 'Grist, the Hunger Tide', mana: ['1','B','G'], type: 'Legendary Planeswalker — Grist', text: 'As long as Grist isn’t on the battlefield, it’s a 1/1 Insect creature in addition to its other types.\n+1: Create a 1/1 black and green Insect creature token, then mill a card. If an Insect card was milled this way, put a loyalty counter on Grist and repeat this process.', groups: ['other'], effects: ['Complex repeating effect'], incomplete: true },
];
export const groupCards = (id: GroupId) => cards.filter(card => card.groups.includes(id));
export const manaValue = (card: DemoCard) => card.mana.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : 1), 0);
export function compareCards(source: DemoCard, mode: CompareMode): Comparison[] {
  const requested: GroupId[] = source.groups.some(id => id === 'counter' || id === 'draw') ? mode === 'both' ? ['counter','draw'] : [mode] : [source.groups[0]];
  return cards.filter(card => card.id !== source.id && requested.some(id => card.groups.includes(id))).map(card => {
    const matches = requested.every(id => card.groups.includes(id));
    const hasCounter = requested.includes('counter') && card.groups.includes('counter');
    const noOverlap = hasCounter && ((source.target === 'noncreature' && card.target === 'creature') || (source.target === 'creature' && card.target === 'noncreature'));
    const partialTarget = hasCounter && source.target === 'any' && card.target !== 'any';
    const coverage: Comparison['coverage'] = noOverlap ? 'none' : matches && !(card.modal && mode === 'both') && !partialTarget ? 'full' : 'partial';
    const reasons = [
      noOverlap ? 'No shared targets: creatures and noncreature do not overlap' : !matches ? 'Only one of the two effects matches' : partialTarget ? 'A narrower range of targets' : hasCounter && card.target === 'any' ? 'Any spell: full target coverage' : 'Requested actions match',
      card.modal && mode === 'both' ? 'Modes are mutually exclusive: both effects cannot occur in one casting' : '',
      card.condition,
      card.sideEffect,
      card.id === 'counterspell' ? 'Two blue symbols: a more restrictive colored cost' : '',
    ].filter(Boolean);
    return { card, coverage, label: coverage === 'full' ? 'Full coverage' : coverage === 'partial' ? 'Partial match' : 'No coverage', explanation: reasons.join(' · '), manaDelta: manaValue(card) - manaValue(source) };
  }).sort((a,b) => {
    const rank = { full: 0, partial: 1, none: 2 };
    return rank[a.coverage] - rank[b.coverage] || Number(Boolean(a.card.condition)) - Number(Boolean(b.card.condition)) || Number(Boolean(a.card.sideEffect)) - Number(Boolean(b.card.sideEffect)) || Math.abs(a.manaDelta) - Math.abs(b.manaDelta) || a.card.name.localeCompare(b.card.name, 'en');
  });
}

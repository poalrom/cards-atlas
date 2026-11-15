// Throwaway design prototype. The spatial atlas was selected by the user.
import { useEffect } from 'react';
import { cards, groups, compareCards } from './data';
import type { AtlasSearch } from './types';
import { AtlasView } from './AtlasView';

export function AtlasPrototype({ state, onNavigate }: { state: AtlasSearch; onNavigate: (patch: Partial<AtlasSearch>) => void }) {
  const selected = cards.find(card => card.id === state.card);
  const group = groups.find(item => item.id === state.group);

  useEffect(() => {
    console.info('[ATLAS PROTOTYPE STATE]', {
      ...state,
      uniqueCards: cards.length,
      selected: selected?.name,
      memberships: selected?.groups,
      dataset: 'fixed control examples; not an imported snapshot',
    });
  }, [state]);

  return <AtlasView
    state={state}
    selected={selected}
    group={group}
    comparisons={selected ? compareCards(selected, state.compare ?? (selected.groups.includes('counter') ? 'counter' : 'draw')) : []}
    onGroup={id => onNavigate({ group: id })}
    onCard={id => onNavigate({ card: id })}
    onCompare={compare => onNavigate({ compare })}
    onCloseCard={() => onNavigate({ card: undefined, compare: undefined })}
    onReset={() => onNavigate({ group: 'all', card: undefined, compare: undefined })}
  />;
}

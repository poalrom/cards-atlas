// Throwaway: three designs of the MTG mechanics atlas on one shareable route.
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clapperboard, Code2, X } from 'lucide-react';
import { cards, groups, compareCards } from './data';
import type { AtlasSearch, AtlasViewProps, Variant } from './types';
import { VariantA } from './VariantA';
import { VariantB } from './VariantB';
import { VariantC } from './VariantC';

const variants: Variant[] = ['A', 'B', 'C'];
const names = { A: 'Spatial atlas', B: 'Workbench', C: 'Field guide' };
export function AtlasPrototype({ state, onNavigate }: { state: AtlasSearch; onNavigate: (patch: Partial<AtlasSearch>, replace?: boolean) => void }) {
  const [drawer, setDrawer] = useState<'scenes' | 'state' | null>(null);
  const selected = cards.find(card => card.id === state.card);
  const group = groups.find(item => item.id === state.group);
  const cycle = (direction: number) => onNavigate({ variant: variants[(variants.indexOf(state.variant) + direction + variants.length) % variants.length] }, true);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowRight' ? 1 : -1); }
      if (event.key === 'Escape') setDrawer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.variant, onNavigate]);
  useEffect(() => { console.info('[ATLAS PROTOTYPE STATE]', { ...state, pool: cards.length, selected: selected?.name, groups: selected?.groups, data: 'fixed control examples; not an imported snapshot' }); }, [state]);
  const props: AtlasViewProps = {
    state, selected, group,
    visibleCards: group ? cards.filter(card => card.groups.includes(group.id)) : cards,
    comparisons: selected ? compareCards(selected, state.compare ?? (selected.groups.includes('counter') ? 'counter' : 'draw')) : [],
    onGroup: id => onNavigate({ group: id }),
    onCard: id => onNavigate({ card: id }),
    onCompare: compare => onNavigate({ compare }),
    onReset: () => onNavigate({ group: 'all', card: undefined, compare: undefined }),
  };
  return <>
    {state.variant === 'A' ? <VariantA {...props} /> : state.variant === 'B' ? <VariantB {...props} /> : <VariantC {...props} />}
    {import.meta.env.DEV && <>
      {drawer && <aside className="prototype-drawer" aria-label={drawer === 'scenes' ? 'Article scenarios' : 'Prototype state'}>
        <button className="prototype-drawer-close" aria-label="Close" onClick={() => setDrawer(null)} style={{ position: 'absolute', right: 15, top: 15, background: 'none', border: 0, color: '#cdd7ea' }}><X size={16} /></button>
        <h2>{drawer === 'scenes' ? 'Three article scenes' : 'Current state'}</h2>
        {drawer === 'scenes' ? <><div className="prototype-scene-list">
          <button onClick={() => { props.onReset(); setDrawer(null); }}>01 · Full collection and mechanic clusters</button>
          <button onClick={() => { onNavigate({ group: 'counter', card: 'dismiss', compare: undefined }); setDrawer(null); }}>02 · Dismiss: counter and draw</button>
          <button onClick={() => { onNavigate({ group: 'counter', card: 'dismiss', compare: 'both' }); setDrawer(null); }}>03 · Neighbors: both effects in one casting</button>
        </div><p>Copy the address to share this view. The cluster, card, date, mode and design are stored in URL.</p></> : <><pre>{JSON.stringify({ ...state, uniqueCards: cards.length, recognized: cards.filter(card => !card.incomplete).length, dataset: 'control-examples' }, null, 2)}</pre><p>Design prototype. The date provides context but does not filter the control collection. MTGJSON, live prices and a server are not connected.</p></>}
      </aside>}
      <nav className="prototype-tools" aria-label="Choose prototype design">
        <button aria-label="Previous design" onClick={() => cycle(-1)}><ArrowLeft size={16} /></button>
        <div className="prototype-variant-label"><small>Design prototype · {variants.indexOf(state.variant) + 1} / 3</small><span>{state.variant} · {names[state.variant]}</span></div>
        <button aria-label="Next design" onClick={() => cycle(1)}><ArrowRight size={16} /></button>
        <span className="prototype-tools-divider" />
        <button className="prototype-scenes" aria-label="Article scenarios" aria-expanded={drawer === 'scenes'} onClick={() => setDrawer(drawer === 'scenes' ? null : 'scenes')}><Clapperboard size={14} />Scenes</button>
        <button aria-label="Show state" aria-expanded={drawer === 'state'} onClick={() => setDrawer(drawer === 'state' ? null : 'state')}><Code2 size={15} /></button>
      </nav>
    </>}
  </>;
}

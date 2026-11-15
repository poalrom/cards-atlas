import { useMemo, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowRight, Check, CircleDashed, Command, CornerDownRight, Crosshair, Database, Layers3, ListFilter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { cards, groups, manaValue } from './data';
import { CardArt, ManaCost, MechanicIcon } from './shared-ui';
import type { AtlasViewProps, Comparison, CompareMode } from './types';
import './variant-b.css';

const modes: { id: CompareMode; label: string; detail: string }[] = [
  { id: 'counter', label: 'Counter', detail: 'Compare target coverage' },
  { id: 'draw', label: 'Draw', detail: 'Compare card draw' },
  { id: 'both', label: 'Both effects', detail: 'Find a combination of actions' },
];
const coverageNames = { full: 'Full coverage', partial: 'Partial coverage', none: 'No coverage' };

export function VariantB({ state, selected, group, visibleCards, comparisons, onGroup, onCard, onCompare, onReset }: AtlasViewProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [coverage, setCoverage] = useState('all');
  const comparing = Boolean(selected && state.compare);
  const normalizedQuery = query.trim().toLowerCase();
  const catalog = useMemo(() => {
    const result = visibleCards.filter(card => [card.name, card.text, card.type, ...card.effects, ...card.groups.map(id => groups.find(group => group.id === id)?.name)].join(' ').toLowerCase().includes(normalizedQuery));
    if (sort === 'mana') result.sort((a, b) => manaValue(a) - manaValue(b) || a.name.localeCompare(b.name));
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [visibleCards, normalizedQuery, sort]);
  const matches = useMemo(() => {
    const result = comparisons.filter(item => [item.card.name, item.card.text, item.card.type, ...item.card.effects, ...item.card.groups.map(id => groups.find(group => group.id === id)?.name)].join(' ').toLowerCase().includes(normalizedQuery) && (coverage === 'all' || item.coverage === coverage));
    if (sort === 'mana') result.sort((a, b) => manaValue(a.card) - manaValue(b.card) || a.card.name.localeCompare(b.card.name));
    if (sort === 'name') result.sort((a, b) => a.card.name.localeCompare(b.card.name));
    return result;
  }, [comparisons, normalizedQuery, coverage, sort]);
  const clearFilters = () => { setQuery(''); setCoverage('all'); setSort('relevance'); };
  const reset = () => { clearFilters(); onReset(); };
  const openCard = (id: string) => { clearFilters(); onCard(id); };
  const setMode = (mode: CompareMode | undefined) => { setCoverage('all'); onCompare(mode); };
  const groupCounts = groups.map(item => ({ ...item, count: cards.filter(card => card.groups.includes(item.id)).length }));

  return (
    <div className="variant-b">
      <header className="b-header">
        <div className="b-brand"><span className="b-brand-mark"><Layers3 size={21} /></span><div>ATLAS<span>MTG / MECHANICS WORKBENCH</span></div></div>
        <div className="b-header-status"><span className="b-live-dot" /> DEMO COLLECTION <span className="b-header-divider">/</span> {cards.length} CARDS</div>
        <button className="b-reset" onClick={reset}><RotateCcw size={14} /><span>Reset</span></button>
      </header>

      <nav className="b-group-nav" aria-label="Mechanic clusters">
        <button className={state.group === 'all' ? 'b-group-tab b-active' : 'b-group-tab'} aria-pressed={state.group === 'all'} onClick={() => onGroup('all')}><Database size={15} />All cards<span>{cards.length}</span></button>
        {groupCounts.map(item => <button key={item.id} className={state.group === item.id ? 'b-group-tab b-active' : 'b-group-tab'} aria-pressed={state.group === item.id} onClick={() => onGroup(item.id)}><MechanicIcon id={item.id} size={15} />{item.short}<span>{item.count}</span></button>)}
      </nav>

      <div className="b-workspace">
        <aside className="b-source-column" aria-label="Source card and settings">
          <div className="b-panel-label"><span><Crosshair size={13} /> 01 / SOURCE CARD</span><span className="b-panel-status">{selected ? 'SELECTED' : 'NOT SELECTED'}</span></div>
          {selected ? <>
            <div className="b-source-art"><CardArt card={selected} className="b-card-art" /><span className="b-art-caption">SOURCE / {selected.id.toUpperCase()}</span></div>
            <div className="b-source-content">
              <div className="b-source-title"><h2>{selected.name}</h2><ManaCost symbols={selected.mana} /></div>
              <p className="b-source-type">{selected.type} <span>MV {manaValue(selected)}</span></p>
              <div className="b-source-groups">{selected.groups.map(id => <button key={id} onClick={() => onGroup(id)}><MechanicIcon id={id} size={13} />{groups.find(item => item.id === id)?.short}<ArrowRight size={12} /></button>)}</div>
              <div className="b-rules"><span className="b-mini-label">ORIGINAL TEXT</span><p lang="en">{selected.text}</p></div>
              <div className="b-source-effects">{selected.effects.map(effect => <p key={effect}><CornerDownRight size={13} />{effect}</p>)}</div>
              {selected.incomplete && <p className="b-source-warning">Complex mechanic: the demonstration description is incomplete.</p>}
              <div className="b-mode-section"><span className="b-mini-label">WHAT ARE WE COMPARING?</span><div className="b-mode-list">{modes.map(mode => <button key={mode.id} aria-pressed={state.compare === mode.id} className={state.compare === mode.id ? 'b-mode b-mode-active' : 'b-mode'} onClick={() => setMode(mode.id)}><span className="b-radio">{state.compare === mode.id && <span />}</span><span><strong>{mode.label}</strong><small>{mode.detail}</small></span>{state.compare === mode.id && <Check size={14} />}</button>)}</div></div>
              {state.compare && <button className="b-back-catalog" onClick={() => setMode(undefined)}><Database size={14} />Back to catalog<ArrowRight size={14} /></button>}
            </div>
          </> : <div className="b-source-empty">
            <div className="b-empty-crosshair"><Crosshair size={38} strokeWidth={1} /><span>?</span></div>
            <h2>Where to start?</h2><p>Choose a card to explore its actions, targets and similar approaches.</p>
            <button className="b-demo-source" onClick={() => openCard('dismiss')}><span><small>EXPLORE AN EXAMPLE</small><strong>Dismiss</strong><span className="b-demo-effects">Counter + draw</span></span><ArrowRight size={19} /></button>
            <div className="b-source-steps"><span><b>01</b> Choose a source card</span><span><b>02</b> Select the effect you need</span><span><b>03</b> Compare restrictions</span></div>
          </div>}
          <div className="b-sidebar-note"><CircleDashed size={15} /><p>Similar effect ≠ a one-for-one replacement. Check targets, conditions and colored costs.</p></div>
        </aside>

        <main className="b-main">
          <div className="b-main-heading"><div><div className="b-eyebrow">02 / {comparing ? 'COMPARISON ENGINE' : 'CARD EXPLORER'}</div><h1>{comparing ? 'Comparison matrix' : group ? group.name : 'Mechanics catalog'}<span className="b-heading-dot">.</span></h1><p>{comparing ? `Source card: ${selected?.name} → ${modes.find(mode => mode.id === state.compare)?.label.toLowerCase()}. Coverage first, then restrictions.` : group ? group.description : 'Actions, not names. Find a card and compare how it meets your needs.'}</p></div><span className="b-workbench-tag"><Command size={13} /> WORKBENCH B</span></div>

          {comparing ? <div className="b-coverage-summary" aria-label="Candidate coverage">{(['full', 'partial', 'none'] as const).map(value => <button key={value} aria-pressed={coverage === value} className={`b-summary-item b-coverage-${value} ${coverage === value ? 'b-summary-active' : ''}`} onClick={() => setCoverage(coverage === value ? 'all' : value)}><span className="b-coverage-dot" /><span>{coverageNames[value]}</span><strong>{comparisons.filter(item => item.coverage === value).length.toString().padStart(2, '0')}</strong></button>)}</div> : <div className="b-overview-strip"><div><span className="b-mini-label">AVAILABLE IN THE DEMO</span><strong>{cards.length}<small>unique cards</small></strong></div><div><span className="b-mini-label">MECHANICS</span><strong>{groups.length.toString().padStart(2, '0')}<small>action clusters</small></strong></div><p><SlidersHorizontal size={18} />A card can belong to several clusters. Cluster counts are not additive.</p></div>}

          <div className="b-results-panel">
            <div className="b-toolbar"><label className="b-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={comparing ? 'Search candidates…' : 'Name, action or rules text…'} aria-label={comparing ? 'Search candidates' : 'Search this cluster'} />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label><label className="b-sort"><ArrowDownUp size={14} /><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort results"><option value="relevance">{comparing ? 'By match' : 'Collection order'}</option><option value="mana">Mana: low to high</option><option value="name">Name: A–Z</option></select></label></div>
            <div className="b-results-caption"><span><ListFilter size={12} />{comparing ? `${matches.length} of ${comparisons.length} candidates` : `${catalog.length} of ${visibleCards.length} cards in this cluster`}</span><span>{comparing ? 'Δ MV BACK TO SOURCE CARD' : 'CONTROL COLLECTION / NOT A COMPLETE POOL'}</span></div>
            {comparing ? <>
              <div className="b-table-head b-comparison-grid" aria-hidden="true"><span>CARD / COST</span><span>COVERAGE AND RESTRICTIONS</span><span>Δ MANA</span><span /></div>
              <div className="b-result-list">{matches.map(item => <ComparisonRow key={item.card.id} item={item} onOpen={() => openCard(item.card.id)} />)}</div>
            </> : <>
              <div className="b-table-head b-catalog-grid" aria-hidden="true"><span>CARD / COST</span><span>ACTION / MECHANICS</span><span /></div>
              <div className="b-result-list">{catalog.map((card, index) => <div key={card.id} className={`b-catalog-row b-catalog-grid ${selected?.id === card.id ? 'b-row-selected' : ''}`}><div className="b-result-card"><span className="b-row-index">{String(index + 1).padStart(2, '0')}</span><div><button className="b-card-name" onClick={() => openCard(card.id)}>{card.name}{selected?.id === card.id && <span className="b-selected-label">SOURCE</span>}</button><div className="b-card-meta"><ManaCost symbols={card.mana} /><span>{card.type}</span></div></div></div><div className="b-card-actions"><p>{card.effects.join(' · ')}</p><div className="b-row-groups">{card.groups.map(id => <button key={id} onClick={() => onGroup(id)}>{groups.find(item => item.id === id)?.short}</button>)}{card.incomplete && <span className="b-incomplete">Incomplete description</span>}</div></div><button className="b-open-card" onClick={() => openCard(card.id)} aria-label={`Select ${card.name}`}><span>Select</span><ArrowRight size={15} /></button></div>)}</div>
            </>}
            {(comparing ? matches.length : catalog.length) === 0 && <div className="b-no-results"><Search size={25} /><h3>No matches found</h3><p>Change your query or clear the local filters.</p><button onClick={clearFilters}>Clear filters<RotateCcw size={13} /></button></div>}
            <div className="b-results-footer"><span><span className="b-live-dot" />{comparing ? 'Effect coverage, not a power ranking' : 'Choose a card to start comparing'}</span><ArrowDown size={13} /></div>
          </div>

          <div className="b-method-note"><div className="b-method-symbol">i</div><div><strong>Data for exploring the idea, not building a deck</strong><p>Hand-curated demonstration collection of {cards.length} unique cards. This is not an import MTGJSON and not a complete pool for 24 months. Coverage describes matching actions and targets, not card equivalence.</p></div><span className="b-method-label">DEMO DATA</span></div>
        </main>
      </div>
      <footer className="b-footer"><span>ATLAS / MECHANICS LAB</span><span>COMPARE CONDITIONS, NOT JUST MANA</span></footer>
    </div>
  );
}

function ComparisonRow({ item, onOpen }: { item: Comparison; onOpen: () => void }) {
  const { card, coverage, explanation, manaDelta } = item;
  return <div className={`b-comparison-row b-comparison-grid b-coverage-${coverage}`}>
    <div className="b-result-card"><div><button className="b-card-name" onClick={onOpen}>{card.name}</button><div className="b-card-meta"><ManaCost symbols={card.mana} /><span>{card.type}</span></div><span className="b-target"><Crosshair size={11} />{card.target === 'any' ? 'Any spell' : card.target === 'noncreature' ? 'Noncreatures only' : card.target === 'creature' ? 'Creatures only' : 'By rules text'}</span></div></div>
    <div className="b-comparison-explanation"><span className="b-coverage-badge"><span className="b-coverage-dot" />{coverageNames[coverage]}</span><p>{explanation}</p></div>
    <div className={`b-mana-delta ${manaDelta < 0 ? 'b-delta-lower' : ''}`}><strong>{manaDelta > 0 ? '+' : manaDelta < 0 ? '−' : ''}{Math.abs(manaDelta)}</strong><span>Δ MV</span></div>
    <button className="b-open-card" onClick={onOpen} aria-label={`Open ${card.name}`}><span>Open</span><ArrowRight size={15} /></button>
  </div>;
}

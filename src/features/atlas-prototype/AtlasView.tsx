// Throwaway UI: the selected spatial atlas, with the map as the entire application surface.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Compass, Focus, Info, Link2, Minus, PanelLeft, Plus, Search, Sparkles, X } from 'lucide-react';
import { cards, groupCards, groups } from './data';
import { CardArt, ManaCost, MechanicIcon, UnknownPrice } from './shared-ui';
import type { AtlasViewProps, CompareMode, DemoCard, GroupId } from './types';
import './atlas-view.css';

const comparisonModes: { id: CompareMode; name: string }[] = [
  { id: 'counter', name: 'Counter' },
  { id: 'draw', name: 'Draw' },
  { id: 'both', name: 'Both effects' },
];

export function AtlasView({ state, selected, group, comparisons, onCard, onGroup, onReset, onCloseCard, onCompare }: AtlasViewProps) {
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const compact = viewport.width < 1000;
  const [groupsOpen, setGroupsOpen] = useState(!compact);
  const [query, setQuery] = useState('');
  const [about, setAbout] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const demo = cards[0];
  const searchResults = query.trim() ? cards.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7) : [];

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(svgRef.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setGroupsOpen(!compact); }, [compact]);
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [state.group]);
  useEffect(() => { inspectorRef.current?.scrollTo({ top: 0 }); }, [selected?.id, state.compare]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (query) setQuery('');
      else if (about) setAbout(false);
      else if (state.compare) onCompare(undefined);
      else if (selected) onCloseCard();
      else setGroupsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [query, about, state.compare, selected, onCompare, onCloseCard]);

  const leftInset = !compact && groupsOpen ? 282 : 24;
  const rightInset = !compact && selected ? 374 : 24;
  const topInset = viewport.width <= 650 ? 160 : 126;
  const bottomInset = compact && selected
    ? Math.min(viewport.height * (state.compare ? 0.52 : 0.46), 460) + 58
    : state.compare ? Math.min(viewport.height * 0.43, 370) + 40 : 76;
  const availableWidth = Math.max(viewport.width - leftInset - rightInset, 150);
  const availableHeight = Math.max(viewport.height - topInset - bottomInset, 150);
  const scale = Math.min(availableWidth / (group ? 405 : 1040), availableHeight / (group ? 300 : 770)) * zoom;
  const origin = { x: leftInset + availableWidth / 2, y: topInset + availableHeight / 2 };
  const center = group ? { x: group.x, y: group.y } : { x: 520, y: 385 };

  const point = (id: GroupId, index: number) => {
    const item = groups.find(candidate => candidate.id === id)!;
    const count = groupCards(id).length;
    if (group?.id === id) {
      const columns = Math.min(count, 3);
      const rows = Math.ceil(count / columns);
      return { x: item.x + (index % columns - (columns - 1) / 2) * 110, y: item.y + (Math.floor(index / columns) - (rows - 1) / 2) * 64 };
    }
    const angle = index * 2.39996 - 0.5;
    const radius = 26 + Math.sqrt(index / Math.max(count, 1)) * 65;
    return { x: item.x + Math.cos(angle) * radius, y: item.y + Math.sin(angle) * radius * 0.72 };
  };
  const openGroup = (id: GroupId | 'all') => {
    onGroup(id);
    if (compact) setGroupsOpen(false);
  };
  const openCard = (card: DemoCard, revealGroup = false) => {
    onCard(card.id);
    if (revealGroup) onGroup(card.groups[0]);
    setQuery('');
    if (compact) setGroupsOpen(false);
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <div className={`atlas-view ${selected ? 'has-selection' : ''} ${state.compare ? 'is-comparing' : ''} ${groupsOpen ? 'has-groups' : ''}`}>
    <main className="a-map-section" aria-label="Interactive mechanics map">
      <svg ref={svgRef} viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="a-map-svg" aria-label="Mechanic clusters and cards"
        onPointerDown={event => {
          if ((event.target as Element).closest('[data-interactive]')) return;
          drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (drag.current) setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y });
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <defs>
          <pattern id="atlas-grid" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="0.75" fill="#c3cddd" opacity=".55" /></pattern>
          {groups.map(item => <radialGradient id={`glow-${item.id}`} key={item.id}><stop offset="0%" stopColor={item.color} stopOpacity=".16" /><stop offset="100%" stopColor={item.color} stopOpacity=".035" /></radialGradient>)}
        </defs>
        <rect width="100%" height="100%" fill="url(#atlas-grid)" />
        <g className="a-map-world" transform={`translate(${origin.x + pan.x},${origin.y + pan.y}) scale(${scale}) translate(${-center.x},${-center.y})`}>
          {showLinks && <g className="a-map-connections">{(selected ? [selected] : [demo, cards.find(card => card.id === 'growth-spiral')!, cards.find(card => card.id === 'consider')!])
            .filter(card => card.groups.length > 1)
            .flatMap(card => card.groups.slice(1).map((destination, index) => {
              const firstGroup = card.groups[0];
              const start = point(firstGroup, groupCards(firstGroup).findIndex(item => item.id === card.id));
              const end = point(destination, groupCards(destination).findIndex(item => item.id === card.id));
              return <path key={`${card.id}-${index}`} d={`M ${start.x} ${start.y} Q ${(start.x + end.x) / 2 + 45} ${(start.y + end.y) / 2 - 25} ${end.x} ${end.y}`} fill="none" stroke={selected ? '#8395c5' : '#bdc9de'} strokeWidth={selected ? 1.8 : 1.2} strokeDasharray="4 6" />;
            }))}</g>}
          {groups.map(item => {
            const members = groupCards(item.id);
            const dimmed = Boolean(group && group.id !== item.id);
            return <g key={item.id} opacity={dimmed ? 0.2 : 1} className="a-cluster">
              <ellipse cx={item.x} cy={item.y} rx={item.id === 'counter' ? 154 : 130} ry={item.id === 'counter' ? 118 : 100} fill={`url(#glow-${item.id})`} stroke={item.color} strokeOpacity=".16" strokeDasharray={item.id === 'other' ? '4 5' : undefined} />
              <g data-interactive="true" className="a-cluster-label" role="button" tabIndex={dimmed ? -1 : 0}
                aria-label={`Open cluster ${item.name}, ${members.length} cards`} onClick={() => openGroup(item.id)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openGroup(item.id); } }}>
                <rect x={item.x - 130} y={item.y - 120} width="260" height="35" rx="10" fill="transparent" />
                <text x={item.x} y={item.y - 97} textAnchor="middle" fill="#536078" fontSize={compact && !group ? Math.max(16, 10 / scale) : 16} fontWeight="450">
                  {compact && !group ? item.short : item.name} <tspan fill={item.color} fontSize="12">{members.length}</tspan>
                </text>
              </g>
              {members.map((card, index) => {
                const p = point(item.id, index);
                const active = selected?.id === card.id;
                const inFocus = group?.id === item.id;
                const showName = inFocus || active || (!compact && card.id === 'dismiss');
                return <g key={card.id} data-interactive="true" className={`a-card-node ${active ? 'is-selected' : ''}`}
                  role="button" tabIndex={dimmed ? -1 : 0} aria-label={`${card.name}, ${item.name}`} onClick={() => openCard(card)}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCard(card); } }}>
                  <circle className="a-node-hit-area" cx={p.x} cy={p.y} r="18" fill="transparent" />
                  {active && <circle cx={p.x} cy={p.y} r="19" fill={item.color} fillOpacity=".12" stroke={item.color} strokeOpacity=".45" />}
                  <circle className="a-node-dot" cx={p.x} cy={p.y} r={active ? 10 : card.groups.length > 1 ? 8.5 : 6.5} fill={item.color} fillOpacity={active ? 1 : .68 + (index % 3) * .1} stroke="white" strokeWidth={active ? 3 : 2} />
                  {card.condition && <circle cx={p.x} cy={p.y} r="2.1" fill="white" />}
                  {card.groups.length > 1 && !active && <circle cx={p.x} cy={p.y} r="12" fill="none" stroke={item.color} strokeOpacity=".35" />}
                  {showName && <text x={inFocus ? p.x : p.x + 14} y={inFocus ? p.y + 24 : p.y + 4} textAnchor={inFocus ? 'middle' : 'start'} fill={active ? '#3d5696' : '#748197'} fontSize="11" fontWeight={active ? 550 : 400} paintOrder="stroke" stroke="#f8fafd" strokeWidth="4" strokeLinejoin="round">{card.name.length > 18 ? `${card.name.slice(0, 16)}…` : card.name}</text>}
                  <title>{card.name}{card.condition ? ` · ${card.condition}` : ''}</title>
                </g>;
              })}
            </g>;
          })}
        </g>
      </svg>
    </main>

    <header className="a-header">
      <h1 className="sr-only">Mechanics Atlas Magic: The Gathering</h1>
      <button className="a-brand" onClick={onReset} aria-label="Atlas home"><img src="/atlas.svg" alt="" /><span><span className="a-brand-title">atlas<span className="a-title-dot">.</span></span><span className="a-brand-caption">MECHANICS MAGIC: THE GATHERING</span></span></button>
      <div className="a-search-wrap">
        <Search size={17} /><input aria-label="Search cards by name" placeholder="Find a card by name…" value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && searchResults[0]) openCard(searchResults[0], true); }} /><kbd>↵</kbd>
        {query && <div className="a-search-results">{searchResults.length ? searchResults.map(card => <button key={card.id} onClick={() => openCard(card, true)}><span>{card.name}{card.incomplete && <small>Incomplete analysis</small>}</span><ManaCost symbols={card.mana} /></button>) : <p>No card with that name is in the control collection.</p>}</div>}
      </div>
      <nav className="a-header-nav">
        <span className="a-collection-count"><strong>{cards.length}</strong> cards<span />control collection</span>
        <button className={groupsOpen ? 'is-active' : ''} aria-label="Atlas clusters" aria-expanded={groupsOpen} aria-controls="atlas-groups" onClick={() => setGroupsOpen(!groupsOpen)}><PanelLeft size={18} /><span>Clusters</span></button>
        <button aria-label="About the atlas" onClick={() => setAbout(true)}><Info size={18} /></button>
      </nav>
    </header>

    <div className={`a-map-caption ${groupsOpen ? 'with-sidebar' : ''}`}>
      <div className="a-breadcrumb">{group ? <><button onClick={() => openGroup('all')}><ArrowLeft size={13} />Full collection</button><ChevronRight size={12} /><span>{group.name}</span></> : <><span className="a-live-dot" />Full collection<span className="a-map-breadcrumb-note">/ {groups.length} mechanic clusters</span></>}</div>
      <button className={`a-links-button ${showLinks ? 'is-on' : ''}`} aria-pressed={showLinks} onClick={() => setShowLinks(!showLinks)}><Link2 size={13} />Connections</button>
    </div>

    {groupsOpen && <aside className="a-sidebar" id="atlas-groups" aria-label="Atlas clusters">
      <div className="a-sidebar-heading"><span>ATLAS CLUSTERS</span><button aria-label="Hide clusters" onClick={() => setGroupsOpen(false)}><X size={15} /></button></div>
      <button className={`a-group-button a-all ${!group ? 'a-active' : ''}`} onClick={() => openGroup('all')}><Compass size={18} /><span>Full collection</span><span className="a-count">{cards.length}</span></button>
      <div className="a-group-separator" />
      {groups.map(item => <button key={item.id} className={`a-group-button ${group?.id === item.id ? 'a-active' : ''}`} onClick={() => openGroup(item.id)} style={{ '--group-color': item.color } as React.CSSProperties}><span className="a-group-icon"><MechanicIcon id={item.id} /></span><span>{item.name}</span><span className="a-count">{groupCards(item.id).length}</span></button>)}
      <div className="a-sidebar-note"><Link2 size={15} /><p>A card can belong<br />to several clusters.</p></div>
      <div className="a-snapshot"><span>CONTROL COLLECTION <b>DEMO</b></span><p>{cards.length} cards · {cards.filter(card => !card.incomplete).length} with analysis</p><small>24 months through {state.asOf.split('-').reverse().join('.')}<br />Interface context, not a complete snapshot.</small></div>
    </aside>}

    <div className="a-map-navigation" aria-label="Map zoom and position">
      <button onClick={() => setZoom(Math.min(zoom + .25, 3))} aria-label="Zoom in"><Plus size={17} /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom(Math.max(zoom - .25, .5))} aria-label="Zoom out"><Minus size={17} /></button>
      <span className="a-control-divider" />
      <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Center map"><Focus size={17} /></button>
    </div>
    {!selected && <>
      <p className="a-map-note">Clusters are not distances. Details explain the similarities.</p>
      <button className="a-intro-card" onClick={() => openCard(demo, true)}><CardArt card={demo} /><span><small>START WITH A CONNECTION</small><strong>Dismiss</strong><span>Counter + draw</span></span><ArrowRight size={17} /></button>
    </>}

    {selected && <aside ref={inspectorRef} className="a-inspector" aria-label={`Card ${selected.name}`}>
      <div className="a-inspector-topline"><span>ATLAS CARD</span><button onClick={onCloseCard} aria-label="Close selected card"><X size={17} /></button></div>
      <CardArt card={selected} className="a-selected-art" />
      <div className="a-inspector-body">
        <div className="a-card-heading"><h2>{selected.name}</h2><ManaCost symbols={selected.mana} /></div>
        <div className="a-card-type">{selected.type}<UnknownPrice /></div>
        <div className="a-rules-label">ORACLE TEXT</div><p className="a-rules">{selected.text}</p>
        {selected.incomplete && <div className="a-warning"><Info size={14} />Analysis incomplete. Original text is shown; the complex effect is not classified.</div>}
        <div className="a-rules-label">WHAT THE CARD DOES</div>
        <div className="a-effects">{selected.effects.map((effect, index) => <span key={effect}><span className="a-effect-index">0{index + 1}</span>{effect}</span>)}</div>
        {selected.condition && <p className="a-card-condition">Condition: {selected.condition}</p>}
        {selected.sideEffect && <p className="a-card-condition">Additional effect: {selected.sideEffect}</p>}
        <div className="a-rules-label">FIND IN CLUSTERS</div>
        <div className="a-memberships">{selected.groups.map(id => {
          const item = groups.find(candidate => candidate.id === id)!;
          return <button key={id} onClick={() => openGroup(id)} style={{ '--group-color': item.color } as React.CSSProperties}><MechanicIcon id={id} size={14} />{item.short}<ArrowRight size={12} /></button>;
        })}</div>
        <button className="a-primary-button" onClick={() => onCompare(state.compare ? undefined : selected.groups.includes('counter') ? 'counter' : 'draw')}><Sparkles size={15} />{state.compare ? 'Hide similar cards' : 'Find similar cards'}<ArrowRight size={15} /></button>
        <button className="a-copy-link" onClick={copyLink}>{copied ? <Check size={13} /> : <Link2 size={13} />}{copied ? 'Link copied' : 'Link to this card'}</button>
      </div>
    </aside>}

    {selected && state.compare && <section className={`a-comparison ${groupsOpen ? 'with-sidebar' : ''}`} aria-label="Similar cards">
      <div className="a-comparison-heading"><div><span className="a-eyebrow">SIMILAR DOES NOT MEAN IDENTICAL</span><h2>Alternatives to {selected.name}<span>.</span></h2></div><button aria-label="Close comparison" onClick={() => onCompare(undefined)}><X size={18} /></button></div>
      <div className="a-comparison-toolbar"><div className="a-mode-switch" aria-label="Choose effects to compare">{comparisonModes.map(mode => <button key={mode.id} className={state.compare === mode.id ? 'is-active' : ''} aria-pressed={state.compare === mode.id} onClick={() => onCompare(mode.id)}>{mode.name}</button>)}</div><span>{comparisons.length} candidates</span></div>
      <div className="a-comparison-grid">{comparisons.map(result => <button key={result.card.id} className="a-result-card" onClick={() => onCard(result.card.id)}>
        <div className="a-result-top"><span className={`a-coverage a-coverage-${result.coverage}`}><span />{result.label}</span><ArrowRight size={14} /></div>
        <div className="a-result-name"><strong>{result.card.name}</strong><ManaCost symbols={result.card.mana} /></div>
        <p>{result.explanation}</p><footer><span>{result.manaDelta > 0 ? '+' : ''}{result.manaDelta} mana difference</span><UnknownPrice /></footer>
      </button>)}</div>
    </section>}

    {about && <div className="a-modal-backdrop" onClick={() => setAbout(false)}><section className="a-about" role="dialog" aria-modal="true" aria-label="About the atlas" onClick={event => event.stopPropagation()}>
      <button className="a-about-close" autoFocus aria-label="Close description" onClick={() => setAbout(false)}><X size={20} /></button><Compass size={30} /><h2>Meaning connects cards.</h2>
      <p>Explore mechanics Magic: The Gathering: from clusters to cards, then effects and possible alternatives. Drag the map and use the zoom controls.</p>
      <p>Design prototype using {cards.length} fixed examples. The snapshot date is illustrative. Full import MTGJSON, prices and a server are not connected. Positions indicate a mechanic cluster, not numerical similarity.</p>
      <details><summary>Current state</summary><pre>{JSON.stringify(state, null, 2)}</pre></details>
      <p>Artwork © Wizards of the Coast. <a href="/art/credits.json" target="_blank" rel="noreferrer">Artists and sources</a>.</p>
      <button className="a-primary-button" onClick={() => setAbout(false)}>Explore the atlas<ArrowRight size={15} /></button>
    </section></div>}
  </div>;
}

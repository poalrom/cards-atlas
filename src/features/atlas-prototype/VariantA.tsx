// A: a light, spatial atlas. B and C deliberately use different structures.
import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowRight, Check, ChevronRight, Compass, ExternalLink, Focus, Info, Link2, Minus, MoveUpRight, Plus, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { cards, groupCards, groups } from './data';
import { CardArt, ManaCost, MechanicIcon, UnknownPrice } from './shared-ui';
import type { AtlasViewProps, CompareMode, GroupId } from './types';
import './variant-a.css';

export function VariantA(props: AtlasViewProps) {
  const { state, selected, group, onCard, onGroup, onReset, onCompare } = props;
  const [query, setQuery] = useState('');
  const [about, setAbout] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);
  const demo = cards[0];
  const searchResults = query.trim() ? cards.filter(card => card.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 7) : [];
  const focusZoom = group ? window.matchMedia('(max-width: 650px)').matches ? 2.8 : 1.55 : 1;
  useEffect(() => { setZoom(focusZoom); setPan({ x: 0, y: 0 }); }, [state.group, focusZoom]);
  const center = group ? { x: group.x, y: group.y } : { x: 520, y: 385 };
  const point = (id: GroupId, index: number) => {
    const g = groups.find(item => item.id === id)!;
    const count = groupCards(id).length;
    if (group?.id === id) {
      const columns = Math.min(count, 3);
      const rows = Math.ceil(count / columns);
      return { x: g.x + (index % columns - (columns - 1) / 2) * 110, y: g.y + (Math.floor(index / columns) - (rows - 1) / 2) * 64 };
    }
    const angle = index * 2.39996 - 0.5;
    const radius = 26 + Math.sqrt(index / Math.max(count, 1)) * 65;
    return { x: g.x + Math.cos(angle) * radius, y: g.y + Math.sin(angle) * radius * 0.72 };
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return <div className="variant-a">
    <header className="a-header">
      <button className="a-brand" onClick={onReset} aria-label="Atlas home"><img src="/atlas.svg" alt="" /><span>atlas<span className="a-brand-caption">MAGIC: THE GATHERING</span></span></button>
      <div className="a-search-wrap">
        <Search size={17} /><input aria-label="Search cards by name" placeholder="Find a card by name…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && searchResults[0]) { onCard(searchResults[0].id); onGroup(searchResults[0].groups[0]); setQuery(''); } if (event.key === 'Escape') setQuery(''); }} /><kbd>↵</kbd>
        {query && <div className="a-search-results">{searchResults.length ? searchResults.map(card => <button key={card.id} onClick={() => { onCard(card.id); onGroup(card.groups[0]); setQuery(''); }}><span>{card.name}{card.incomplete && <small>Incomplete analysis</small>}</span><ManaCost symbols={card.mana} /></button>) : <p>No card with that name is in the control collection.</p>}</div>}
      </div>
      <nav className="a-header-nav"><span className="a-demo-badge"><span />Design prototype</span><button onClick={() => setAbout(!about)}><Info size={16} /><span>About the atlas</span></button></nav>
    </header>
    <main className="a-main">
      <section className="a-heading">
        <div><div className="a-eyebrow"><span className="a-small-line" />FROM EFFECTS TO POSSIBILITIES</div><h1>Mechanics Atlas<span className="a-title-dot">.</span></h1><p>Explore connections between cards. Find what your game needs.</p></div>
        <div className="a-snapshot"><div className="a-snapshot-top"><span className="a-snapshot-icon"><SlidersHorizontal size={17} strokeWidth={1.5} /></span><div><strong>Control collection</strong><span>{cards.length} unique cards · {cards.filter(card => !card.incomplete).length} with analysis</span></div><span className="a-demo-tag">DEMO</span></div><div className="a-snapshot-date">Snapshot context: 24 months through {state.asOf.split('-').reverse().join('.')}<span title="The date provides context; it does not filter the demo collection"><Info size={12} /></span></div></div>
      </section>
      <div className="a-workspace">
        <aside className="a-sidebar">
          <div className="a-sidebar-label">ATLAS CLUSTERS <span>07</span></div>
          <button className={`a-group-button a-all ${!group ? 'a-active' : ''}`} onClick={() => onGroup('all')}><Compass size={18} /><span>Full collection</span><span className="a-count">{cards.length}</span></button>
          <div className="a-group-separator" />
          {groups.map(item => <button key={item.id} className={`a-group-button ${group?.id === item.id ? 'a-active' : ''}`} onClick={() => onGroup(item.id)} style={{ '--group-color': item.color } as React.CSSProperties}><span className="a-group-icon"><MechanicIcon id={item.id} /></span><span>{item.name}</span><span className="a-count">{groupCards(item.id).length}</span></button>)}
          <div className="a-sidebar-note"><Link2 size={17} /><p>A card can belong<br />to several clusters.</p></div>
          <div className="a-guide"><span className="a-guide-symbol"><Sparkles size={17} /></span><strong>Start with a connection</strong><p>What connects countering spells and drawing cards?</p><button onClick={() => { onGroup('counter'); onCard('dismiss'); }}>Explore Dismiss <ArrowRight size={14} /></button></div>
          <a className="a-method-link" href="https://mtgjson.com/" target="_blank" rel="noreferrer">Source for a future snapshot<ExternalLink size={11} /></a>
        </aside>
        <section className="a-map-section" aria-label="Interactive mechanics map">
          <div className="a-map-topbar"><div className="a-breadcrumb">{group ? <><button onClick={() => onGroup('all')}><ArrowLeft size={13} />Full collection</button><ChevronRight size={12} /><span>{group.short}</span></> : <><span className="a-live-dot" />Full collection<span className="a-map-breadcrumb-note">/ mechanics overview</span></>}</div><button className={`a-links-button ${showLinks ? 'is-on' : ''}`} aria-pressed={showLinks} onClick={() => setShowLinks(!showLinks)}><Link2 size={13} />Connections</button></div>
          <div className="a-map-canvas">
            <svg ref={svgRef} viewBox="0 0 1040 770" className="a-map-svg" aria-label="Mechanic clusters and cards" onPointerDown={event => { if ((event.target as Element).closest('[data-interactive]')) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!drag.current || !svgRef.current) return; const ratio = 1040 / svgRef.current.getBoundingClientRect().width; setPan({ x: drag.current.px + (event.clientX - drag.current.x) * ratio, y: drag.current.py + (event.clientY - drag.current.y) * ratio }); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
              <defs>
                <pattern id="atlas-grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="0.85" fill="#cbd1dc" opacity=".55" /></pattern>
                {groups.map(item => <radialGradient id={`glow-${item.id}`} key={item.id}><stop offset="0%" stopColor={item.color} stopOpacity=".13" /><stop offset="100%" stopColor={item.color} stopOpacity=".025" /></radialGradient>)}
              </defs>
              <rect width="1040" height="770" fill="url(#atlas-grid)" />
              <g transform={`translate(${520 + pan.x},${385 + pan.y}) scale(${zoom}) translate(${-center.x},${-center.y})`}>
                {showLinks && <g className="a-map-connections">{(selected ? [selected] : [demo, cards.find(card => card.id === 'growth-spiral')!, cards.find(card => card.id === 'consider')!]).filter(card => card.groups.length > 1).flatMap(card => card.groups.slice(1).map((destination, index) => { const firstGroup = card.groups[0]; const start = point(firstGroup, groupCards(firstGroup).findIndex(item => item.id === card.id)); const end = point(destination, groupCards(destination).findIndex(item => item.id === card.id)); return <path key={`${card.id}-${index}`} d={`M ${start.x} ${start.y} Q ${(start.x + end.x) / 2 + 45} ${(start.y + end.y) / 2 - 25} ${end.x} ${end.y}`} fill="none" stroke={selected ? '#7285bd' : '#c0c9d9'} strokeWidth={selected ? 2 : 1.2} strokeDasharray="4 6" />; }))}</g>}
                {groups.map(item => { const members = groupCards(item.id); const dimmed = group && group.id !== item.id; return <g key={item.id} opacity={dimmed ? 0.25 : 1} className="a-cluster">
                  <ellipse cx={item.x} cy={item.y} rx={item.id === 'counter' ? 150 : 126} ry={item.id === 'counter' ? 116 : 96} fill={`url(#glow-${item.id})`} stroke={item.color} strokeOpacity=".17" strokeDasharray={item.id === 'other' ? '4 5' : undefined} />
                  <g data-interactive="true" role="button" tabIndex={0} aria-label={`Open cluster ${item.name}, ${members.length} cards`} onClick={() => onGroup(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onGroup(item.id); } }} className="a-cluster-label">
                    <rect x={item.x - 126} y={item.y - 113} width="252" height="29" rx="10" fill="transparent" />
                    <text x={item.x} y={item.y - 92} textAnchor="middle" fill={item.id === 'other' ? '#929aa9' : '#526074'} fontSize="16" fontWeight="480">{item.name} <tspan fill={item.color} fontSize="12">{members.length}</tspan></text>
                  </g>
                  {members.map((card, index) => { const p = point(item.id, index); const active = selected?.id === card.id; const showName = zoom > 1.2 || card.id === 'dismiss' || active; return <g key={card.id} data-interactive="true" className={`a-card-node ${active ? 'is-selected' : ''}`} role="button" tabIndex={dimmed ? -1 : 0} aria-label={`${card.name}, ${item.name}`} onClick={() => onCard(card.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCard(card.id); } }}>
                    {active && <circle cx={p.x} cy={p.y} r="19" fill={item.color} fillOpacity=".1" stroke={item.color} strokeOpacity=".4" />}
                    <circle cx={p.x} cy={p.y} r={active ? 10 : card.groups.length > 1 ? 8.5 : 6.5} fill={item.color} fillOpacity={active ? 1 : .65 + (index % 3) * .1} stroke="white" strokeWidth={active ? 3 : 2} />
                    {card.condition && <circle cx={p.x} cy={p.y} r="2.1" fill="white" />}
                    {card.groups.length > 1 && !active && <circle cx={p.x} cy={p.y} r="12" fill="none" stroke={item.color} strokeOpacity=".35" strokeWidth="1" />}
                    {showName && <text x={group?.id === item.id ? p.x : p.x + 14} y={group?.id === item.id ? p.y + 24 : p.y + 4} textAnchor={group?.id === item.id ? 'middle' : 'start'} fill={active ? '#344c91' : '#667186'} fontSize="11" fontWeight={active ? 600 : 400} paintOrder="stroke" stroke="#f8fafd" strokeWidth="4" strokeLinejoin="round">{card.name.length > 18 ? `${card.name.slice(0, 16)}…` : card.name}</text>}
                    <title>{card.name}{card.condition ? ` · ${card.condition}` : ''}</title>
                  </g>; })}
                </g>; })}
              </g>
            </svg>
            {!group && !selected && <div className="a-map-prompt"><span><MoveUpRight size={14} />Choose a cluster to zoom in</span></div>}
            <div className="a-map-navigation"><button onClick={() => setZoom(Math.min(zoom + .3, 3))} aria-label="Zoom in"><Plus size={16} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.max(zoom - .3, .55))} aria-label="Zoom out"><Minus size={16} /></button><span className="a-control-divider" /><button onClick={() => { setZoom(focusZoom); setPan({ x: 0, y: 0 }); }} aria-label="Center map"><Focus size={16} /></button></div>
            <div className="a-map-compass"><span>N</span><Compass size={27} strokeWidth={1} /></div>
          </div>
          <footer className="a-map-footer"><span><i className="a-legend-node" />Card<i className="a-legend-ring" />Multiple mechanics<i className="a-legend-condition" />Conditional</span><span className="a-map-hint">Drag the map</span></footer>
        </section>
        <aside className="a-inspector" aria-label={selected ? `Card ${selected.name}` : 'About the atlas'}>
          {selected ? <>
            <div className="a-inspector-topline"><span>ATLAS CARD</span><button onClick={onReset} aria-label="Close selected card"><X size={15} /></button></div>
            <CardArt card={selected} className="a-selected-art" />
            <div className="a-inspector-body"><div className="a-card-heading"><h2>{selected.name}</h2><ManaCost symbols={selected.mana} /></div><div className="a-card-type">{selected.type}<UnknownPrice /></div>
              <div className="a-rules-label">ORACLE TEXT</div><p className="a-rules">{selected.text}</p>
              {selected.incomplete && <div className="a-warning"><Info size={14} />Analysis incomplete. Original text is shown; the complex effect is not classified.</div>}
              <div className="a-rules-label">WHAT THE CARD DOES</div><div className="a-effects">{selected.effects.map((effect, index) => <span key={effect}><span className="a-effect-index">0{index + 1}</span>{effect}</span>)}</div>
              {selected.condition && <p className="a-card-condition">Condition: {selected.condition}</p>}{selected.sideEffect && <p className="a-card-condition">Additional effect: {selected.sideEffect}</p>}
              <div className="a-rules-label">FIND IN CLUSTERS</div><div className="a-memberships">{selected.groups.map(id => { const item = groups.find(g => g.id === id)!; return <button key={id} onClick={() => onGroup(id)} style={{ '--group-color': item.color } as React.CSSProperties}><MechanicIcon id={id} size={13} />{item.short}<ArrowRight size={11} /></button>; })}</div>
              <button className="a-primary-button" onClick={() => onCompare(state.compare ? undefined : selected.groups.includes('counter') ? 'counter' : 'draw')}><Sparkles size={15} />{state.compare ? 'Hide similar cards' : 'Find similar cards'}<ArrowRight size={14} /></button>
              <button className="a-copy-link" onClick={copyLink}>{copied ? <Check size={12} /> : <Link2 size={12} />}{copied ? 'Link copied' : 'Link to this card'}</button>
            </div>
          </> : <>
            <div className="a-inspector-topline"><span>BETWEEN CLUSTERS</span><Link2 size={14} /></div>
            <CardArt card={demo} className="a-feature-art" />
            <div className="a-inspector-body"><span className="a-feature-kicker">ONE CARD. TWO POSSIBILITIES.</span><div className="a-card-heading"><h2>Dismiss</h2><ManaCost symbols={demo.mana} /></div><p className="a-feature-description">Stop an opposing plan.<br />And keep your own going.</p><p className="a-feature-copy">Countering a spell and drawing a card connect two atlas clusters.</p><div className="a-feature-bridge"><span><i style={{ background: '#5779e8' }} />Counter</span><span className="a-bridge-line" /><Link2 size={13} /><span className="a-bridge-line" /><span><i style={{ background: '#57a69d' }} />Draw</span></div><button className="a-primary-button" onClick={() => { onCard('dismiss'); onGroup('counter'); }}>View card<ArrowRight size={15} /></button><p className="a-intro-hint"><ArrowDownLeft size={17} />Or start anywhere on the map</p></div>
          </>}
        </aside>
      </div>
      {selected && state.compare && <section className="a-comparison" aria-label="Similar cards"><div className="a-comparison-heading"><div><div className="a-eyebrow">MEANING IN THE DETAILS</div><h2>Similar does not mean identical<span>.</span></h2><p>Comparing with {selected.name}. Target coverage and conditions are separate.</p></div><div className="a-mode-switch" aria-label="Choose effects to compare">{([['counter','Counter'],['draw','Draw'],['both','Both effects']] as [CompareMode,string][]).map(([mode,label]) => <button key={mode} className={state.compare === mode ? 'is-active' : ''} onClick={() => onCompare(mode)}>{label}</button>)}</div></div><div className="a-comparison-grid">{props.comparisons.map(result => <button key={result.card.id} className="a-result-card" onClick={() => onCard(result.card.id)}><div className="a-result-top"><span className={`a-coverage a-coverage-${result.coverage}`}><span />{result.label}</span><ArrowRight size={14} /></div><div className="a-result-name"><strong>{result.card.name}</strong><ManaCost symbols={result.card.mana} /></div><p>{result.explanation}</p><footer><span>{result.manaDelta > 0 ? '+' : ''}{result.manaDelta} mana difference</span><UnknownPrice /></footer></button>)}</div></section>}
      <footer className="a-page-footer"><span>Meaning, not distance. Positions indicate a mechanic cluster, not numerical similarity.</span><span>Control collection · not a complete snapshot MTGJSON</span></footer>
    </main>
    {about && <div className="a-modal-backdrop" onClick={() => setAbout(false)}><section className="a-about" role="dialog" aria-modal="true" aria-label="About the atlas" onClick={event => event.stopPropagation()}><button className="a-about-close" aria-label="Close description" onClick={() => setAbout(false)}><X size={20} /></button><Compass size={30} /><h2>Meaning connects cards.</h2><p>This atlas helps explore mechanics Magic: The Gathering: from clusters to cards, then effects and possible alternatives.</p><p>This is currently a design prototype using {cards.length} fixed examples. The snapshot date is illustrative. Full import MTGJSON, prices and a server are not connected; state is stored only in the URL.</p><p>Artwork © Wizards of the Coast. <a href="/art/credits.json" target="_blank" rel="noreferrer">Artists and sources</a>.</p><button className="a-primary-button" onClick={() => setAbout(false)}>Explore the atlas<ArrowRight size={15} /></button></section></div>}
  </div>;
}

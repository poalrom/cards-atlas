import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowDownLeft, ArrowRight, BookOpen, Check, CornerDownRight, Layers3, MoveUpRight, Search, X } from 'lucide-react';
import { cards, groupCards, groups } from './data';
import { CardArt, ManaCost, MechanicIcon } from './shared-ui';
import type { AtlasViewProps, CompareMode } from './types';
import './variant-c.css';

const comparisonModes: { id: CompareMode; label: string }[] = [
  { id: 'counter', label: 'Counter' },
  { id: 'draw', label: 'Draw' },
  { id: 'both', label: 'Both effects' },
];
const featured = cards.find(card => card.id === 'dismiss')!;

export function VariantC({ state, selected, group, visibleCards, comparisons, onGroup, onCard, onCompare, onReset }: AtlasViewProps) {
  const dossierRef = useRef<HTMLElement>(null);
  const previousCard = useRef<string | undefined>(undefined);
  const [query, setQuery] = useState('');
  const entries = query.trim() ? cards.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase())) : visibleCards;
  useEffect(() => {
    if (selected && previousCard.current !== selected.id) dossierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    previousCard.current = selected?.id;
  }, [selected]);
  const chapterNumber = group ? String(groups.findIndex(item => item.id === group.id) + 1).padStart(2, '0') : '00';

  return (
    <div className="variant-c">
      <div className="c-paper">
        <header className="c-masthead">
          <button className="c-brand" onClick={onReset} aria-label="Mechanics Atlas home"><BookOpen size={26} strokeWidth={1.4} /><span>ATLAS<span className="c-brand-small">mechanics Magic</span></span></button>
          <div className="c-masthead-note">Field guide<br /><span>for curious players</span></div>
          <div className="c-issue"><span>COLLECTION № 01</span><strong>{cards.length} cards · {groups.length} chapters</strong></div>
        </header>

        <section className="c-cover" aria-labelledby="c-cover-title">
          <div className="c-cover-copy">
            <div className="c-eyebrow"><span className="c-ink-dot" /> MAGIC IN THE DETAILS</div>
            <h1 id="c-cover-title">More than cards.<br /><em>Possibilities.</em></h1>
            <p className="c-cover-description">Read between the rules. Explore mechanics, find unexpected connections and understand what each card actually does.</p>
            <a className="c-text-link" href="#c-chapters">Open guide <ArrowDown size={17} /></a>
            <div className="c-cover-footnote"><span>FIELD NOTES</span><p>A card can belong to several chapters.<br />The interesting part is where they intersect.</p></div>
          </div>
          <figure className="c-cover-figure">
            <div className="c-art-frame"><CardArt card={featured} className="c-cover-art" /><span className="c-art-caption">EXPLORE INTERSECTIONS</span><span className="c-art-number">01</span></div>
            <figcaption><div><span className="c-caption-label">FEATURED CARD</span><button onClick={() => onCard(featured.id)}>Dismiss <MoveUpRight size={17} /></button></div><span className="c-figure-note">Counter it.<br />And draw a card.</span></figcaption>
          </figure>
        </section>

        <div className="c-section-rule"><span>FROM ACTIONS TO CARDS</span><span>CONTROL COLLECTION</span><ArrowDownLeft size={18} /></div>
        <label className="c-collection-search"><Search size={17} /><span>FIND AN ENTRY</span><input aria-label="Search the entire guide" placeholder="Card name…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && entries[0]) { onCard(entries[0].id); setQuery(''); } if (event.key === 'Escape') setQuery(''); }} />{query && <button aria-label="Clear guide search" onClick={() => setQuery('')}><X size={14} /></button>}</label>

        <div className="c-reading-layout" id="c-chapters">
          <aside className="c-contents" aria-label="Mechanics contents">
            <div className="c-eyebrow">CONTENTS</div>
            <h2>Seven ways to<br /><em>change the game.</em></h2>
            <button className={`c-all-chapters ${state.group === 'all' ? 'is-active' : ''}`} onClick={() => onGroup('all')} aria-pressed={state.group === 'all'}><Layers3 size={15} /> All mechanics <span>{cards.length}</span></button>
            <nav className="c-chapter-index">{groups.map((item, index) => (
              <button key={item.id} className={`c-chapter-link ${state.group === item.id ? 'is-active' : ''}`} aria-pressed={state.group === item.id} onClick={() => onGroup(item.id)}>
                <span className="c-chapter-number">{String(index + 1).padStart(2, '0')}</span><span className="c-chapter-name">{item.name}</span><span className="c-chapter-count">{groupCards(item.id).length}</span><ArrowRight size={15} />
              </button>
            ))}</nav>
            <div className="c-margin-note"><span className="c-note-symbol">✳</span><p>A small collection for exploring the interface. Not a full catalog MTG and not an import MTGJSON.</p></div>
          </aside>

          <main className="c-chapter-body">
            <header className="c-chapter-heading"><div><span className="c-eyebrow">CHAPTER {chapterNumber}</span><h2>{group?.name ?? 'Beyond names'}</h2><p>{group?.description ?? 'Every card has a role. Sometimes several.'}</p></div><span className="c-entry-count">{visibleCards.length}<small>cards in this selection</small></span></header>

            {!selected ? (
              <article className="c-editorial-preview">
                <div className="c-eyebrow">AN EXAMPLE TO READ CLOSELY</div>
                <h3>One spell.<br /><em>Two actions.</em></h3>
                <div className="c-preview-content"><div><p>Dismiss stops an opposing plan and leaves a new card in your hand. Explore alternatives by one effect or their combination.</p><button className="c-solid-button" onClick={() => onCard('dismiss')}>Explore Dismiss <ArrowRight size={17} /></button></div><div className="c-preview-rules"><span>DISMISS</span><ManaCost symbols={featured.mana} /><blockquote>Counter target spell.<br />Draw a card.</blockquote></div></div>
              </article>
            ) : (
              <article className="c-dossier" ref={dossierRef} aria-labelledby="c-dossier-title">
                <div className="c-dossier-top"><span className="c-eyebrow">CARD IN FOCUS</span><span className="c-dossier-type">{selected.type}</span></div>
                <div className="c-dossier-title"><h3 id="c-dossier-title">{selected.name}</h3><ManaCost symbols={selected.mana} /></div>
                <div className="c-dossier-reading"><figure className="c-dossier-art"><CardArt card={selected} className="c-detail-image" /><figcaption>Card artwork{selected.artist ? ` · ${selected.artist}` : ''}</figcaption></figure><div className="c-original-text"><span className="c-eyebrow">ORIGINAL TEXT</span><blockquote>{selected.text}</blockquote></div></div>
                <div className="c-effects"><span className="c-eyebrow">WHAT HAPPENS</span><ul>{selected.effects.map((effect, index) => <li key={`${effect}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{effect}</li>)}</ul></div>
                {(selected.condition || selected.sideEffect || selected.incomplete) && <div className="c-card-notes">{selected.condition && <p><strong>Condition.</strong> {selected.condition}</p>}{selected.sideEffect && <p><strong>Note.</strong> {selected.sideEffect}</p>}{selected.incomplete && <p><strong>Incomplete analysis.</strong> The current comparison model does not cover this complex repeating effect.</p>}</div>}
                <div className="c-cross-links"><span>Explore the chapters</span>{selected.groups.map(id => <button key={id} onClick={() => onGroup(id)}><MechanicIcon id={id} size={14} />{groups.find(item => item.id === id)?.short}<MoveUpRight size={12} /></button>)}</div>
                <section className="c-comparison" aria-labelledby="c-compare-title">
                  <div className="c-compare-heading"><div><span className="c-eyebrow">COMPARISON NOTES</span><h4 id="c-compare-title">What about alternatives?</h4></div>{state.compare && <button className="c-close-comparison" onClick={() => onCompare(undefined)} aria-label="Close comparison"><X size={16} /></button>}</div>
                  <p className="c-compare-intro">Choose the action you want to preserve. Shared mechanics do not make cards interchangeable.</p>
                  <div className="c-compare-modes" aria-label="Effects to compare">{comparisonModes.map(mode => <button key={mode.id} onClick={() => onCompare(mode.id)} aria-pressed={state.compare === mode.id} className={state.compare === mode.id ? 'is-active' : ''}>{state.compare === mode.id && <Check size={13} />}{mode.label}</button>)}</div>
                  {state.compare ? <div className="c-candidates"><div className="c-candidate-caption">{comparisons.length} candidates in the control collection · relative to {selected.name}</div>{comparisons.map(comparison => <button className="c-candidate" key={comparison.card.id} onClick={() => onCard(comparison.card.id)}><div className="c-candidate-top"><strong>{comparison.card.name}</strong><ManaCost symbols={comparison.card.mana} /><ArrowRight size={16} /></div><div className="c-coverage-line"><span className={`c-coverage c-coverage-${comparison.coverage}`}>{comparison.label}</span><span>Mana: {comparison.manaDelta > 0 ? '+' : ''}{comparison.manaDelta}</span></div><p>{comparison.explanation}</p></button>)}{comparisons.length === 0 && <p className="c-no-results">No other cards in the control collection match this comparison.</p>}</div> : <p className="c-comparison-hint"><CornerDownRight size={15} /> Start with one effect or preserve both.</p>}
                </section>
              </article>
            )}

            <section className="c-card-collection" aria-labelledby="c-collection-title"><div className="c-collection-heading"><h3 id="c-collection-title">{query ? 'Matching entries' : group ? 'Cards in this chapter' : 'Browsing the collection'}</h3><span>{String(entries.length).padStart(2, '0')} ENTRIES</span></div><div className="c-card-entries">{entries.map((card, index) => <button className={`c-card-entry ${selected?.id === card.id ? 'is-selected' : ''}`} key={card.id} onClick={() => onCard(card.id)} aria-pressed={selected?.id === card.id}><span className="c-entry-number">{String(index + 1).padStart(2, '0')}</span><div className="c-entry-main"><div className="c-entry-title"><h4>{card.name}</h4><ManaCost symbols={card.mana} /></div><span className="c-entry-type">{card.type}</span><p>{card.text}</p><div className="c-entry-tags">{card.groups.map(id => <span key={id}>{groups.find(item => item.id === id)?.short}</span>)}</div></div><MoveUpRight className="c-entry-arrow" size={17} /></button>)}</div>{entries.length === 0 && <div className="c-no-results"><h4>Nothing on this page yet.</h4><p>Change the search query or open another chapter.</p><button className="c-text-link" onClick={() => { setQuery(''); onReset(); }}>Back to collection <ArrowRight size={16} /></button></div>}</section>
          </main>
        </div>
        <footer className="c-footer"><span>MECHANICS ATLAS</span><p>Not a power ranking or buying advice.<br />A way to read cards more closely.</p><span>CONTROL COLLECTION<br />{cards.length} CARDS / {groups.length} MECHANICS</span></footer>
      </div>
    </div>
  );
}

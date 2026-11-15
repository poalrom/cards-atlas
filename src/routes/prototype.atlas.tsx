import { createFileRoute } from '@tanstack/react-router';
import { AtlasPrototype } from '../features/atlas-prototype/AtlasPrototype';
import { groups, cards } from '../features/atlas-prototype/data';
import type { AtlasSearch, CompareMode, GroupId, Variant } from '../features/atlas-prototype/types';

export const Route = createFileRoute('/prototype/atlas')({
  validateSearch: (search: Record<string, unknown>): AtlasSearch => ({
    variant: ['A','B','C'].includes(String(search.variant)) ? search.variant as Variant : 'A',
    group: groups.some(group => group.id === search.group) ? search.group as GroupId : 'all',
    card: cards.some(card => card.id === search.card) ? String(search.card) : undefined,
    compare: ['counter','draw','both'].includes(String(search.compare)) ? search.compare as CompareMode : undefined,
    asOf: /^\d{4}-\d{2}-\d{2}$/.test(String(search.asOf)) ? String(search.asOf) : '2026-11-15',
  }),
  component: PrototypeRoute,
});
function PrototypeRoute() {
  const state = Route.useSearch();
  const navigate = Route.useNavigate();
  return <AtlasPrototype state={state} onNavigate={(patch, replace = false) => { void navigate({ search: previous => ({ ...previous, ...patch }), replace }); }} />;
}

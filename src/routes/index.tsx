import { createFileRoute, redirect } from '@tanstack/react-router';
export const Route = createFileRoute('/')({ beforeLoad: () => { throw redirect({ to: '/prototype/atlas', search: { variant: 'A', group: 'all', asOf: '2026-11-15' } }); } });

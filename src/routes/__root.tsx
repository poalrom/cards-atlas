import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
	component: () => <Outlet />,
	notFoundComponent: () => (
		<main className="atlas-view">
			<section className="a-status-panel">
				<h1>Page not found</h1>
				<p>This address does not point to an atlas page.</p>
				<a href="#/">Open Cards Atlas</a>
			</section>
		</main>
	),
});

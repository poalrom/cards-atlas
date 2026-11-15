import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function localSnapshots(): Plugin {
	return {
		name: "local-evaluation-snapshots",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use(async (request, response, next) => {
				const path = new URL(request.url ?? "/", "http://localhost").pathname;
				const match =
					/^\/(?:cards-atlas\/)?data\/([a-zA-Z0-9._-]+\.json)$/.exec(path);
				if (!match || request.method !== "GET") return next();
				try {
					const content = await readFile(
						resolve(".data/local-site/data", match[1]),
					);
					response.setHeader("Content-Type", "application/json");
					response.setHeader("Cache-Control", "no-store");
					response.end(content);
				} catch {
					response.statusCode = 404;
					response.end(
						"Local snapshot not found. Prepare the complete local catalog first.",
					);
				}
			});
		},
	};
}

export default defineConfig(({ command, mode }) => {
	if (mode === "local-data" && command !== "serve") {
		throw new Error(
			"Local-evaluation data is only available in the development server.",
		);
	}
	return {
		base: "/cards-atlas/",
		plugins: [
			tanstackRouter({ target: "react", autoCodeSplitting: true }),
			tailwindcss(),
			react(),
			...(mode === "local-data" ? [localSnapshots()] : []),
		],
		server: { host: "0.0.0.0", port: 3010, allowedHosts: [".ts.net"] },
	};
});

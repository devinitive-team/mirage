import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isVitest = process.env.VITEST === "true";

const reactPlugin = viteReact(
	isVitest
		? {}
		: {
				babel: {
					plugins: ["babel-plugin-react-compiler"],
				},
			},
);

const config = defineConfig({
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:2137",
				changeOrigin: true,
			},
		},
	},
	plugins: isVitest
		? [tsconfigPaths({ projects: ["./tsconfig.json"] }), reactPlugin]
		: [
				devtools(),
				tsconfigPaths({ projects: ["./tsconfig.json"] }),
				tailwindcss(),
				tanstackStart(),
				reactPlugin,
			],
});

export default config;

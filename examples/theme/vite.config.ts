import vue from "@vitejs/plugin-vue"
import path from "node:path"
import { defineConfig } from "vite"

// eslint-disable-next-line import/no-default-export
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve("src"),
		},
	},
	plugins: [vue()],
})

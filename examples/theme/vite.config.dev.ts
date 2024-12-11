import VueRouter from "unplugin-vue-router/vite"
import { defineConfig, mergeConfig } from "vite"
import viteConfig from "./vite.config"

const config = defineConfig({
	plugins: [
		VueRouter({
			routesFolder: "src/theme",
			dts: "src/auto-router.d.ts",
		}),
	],
})

// eslint-disable-next-line import/no-default-export
export default mergeConfig(viteConfig, config)

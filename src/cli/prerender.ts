import { renderSSRHead } from "@unhead/ssr"
import * as fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { InlineConfig } from "vite"
import { build } from "vite"
import { renderToString } from "vue/server-renderer"
import { fixResourcesPath } from "@/utils"
import type { BuildParams, BuildThemeContext } from "."
import { cleanDirectory } from "./fs"

type PrerenderContext = {
	tempEntries: string
	tempSsr: string
	dist: string
	templateHtml: string
	templateTs: string
	source: string
	debug: boolean
	manifest: Record<string, any> // Добавляем для хранения манифеста
}

export async function prerender(
	{ dist, source, temp }: BuildParams,
	themeContext: BuildThemeContext,
) {
	const files = fs.readdirSync(source).filter((file) => file.endsWith(".vue"))

	if (files.length === 0) {
		console.warn("[Prerender] No pages found in", source)
		return
	}

	const context: PrerenderContext = {
		tempEntries: path.resolve(temp, "entries"),
		tempSsr: path.resolve(temp, "ssr"),
		templateHtml: themeContext.htmlTemplate,
		templateTs: themeContext.mainTsTemplate,
		dist,
		source,
		debug: themeContext.debug ?? false,
		manifest: {}, // Инициализация манифеста
	}

	// Очистка dist и временных директорий
	cleanDirectory(dist, true)
	cleanDirectory(temp, true)
	cleanDirectory(context.tempEntries, true)
	cleanDirectory(context.tempSsr, true)

	// Генерация entry-файлов для каждой страницы на основе шаблона
	files.forEach((file) => generateEntryForPage(file, context))

	// Сборка клиентского бандла и assets
	await buildClientBundle(files, context)
	fixResourcePathsInCompiledFiles(context.dist, context)

	// Загрузка манифеста
	loadManifest(context)

	// Компилируем серверные модули для SSR
	const compiledModules = await buildSSRBundle(files, context)

	// Пререндерим страницы
	for (const [routePath, componentModule] of compiledModules) {
		await prerenderPage(componentModule, routePath, context)
	}

	console.log("[Prerender] All pages rendered successfully!")
}

// Генерация entry-файла для страницы
function generateEntryForPage(pageFileName: string, ctx: PrerenderContext) {
	const pageName = pageFileName.replace(".vue", "")
	const entryFilePath = path.resolve(ctx.tempEntries, `${pageName}-entry.ts`)
	const pageComponentPath = path
		.relative(ctx.tempEntries, path.resolve(ctx.source, pageFileName))
		.replace(/\\/g, "/")

	let mainTsTemplate = String(ctx.templateTs)
	mainTsTemplate = mainTsTemplate.replace(
		"PAGE_COMPONENT_IMPORT",
		pageComponentPath,
	)

	// Запись сгенерированного entry-файла
	fs.writeFileSync(entryFilePath, mainTsTemplate)
}

// Функция сборки клиентского бандла и assets
async function buildClientBundle(files: string[], ctx: PrerenderContext) {
	const input = files.reduce(
		(acc, file) => {
			const name = file.replace(".vue", "")
			acc[name] = path.resolve(ctx.tempEntries, `${name}-entry.ts`)
			return acc
		},
		{} as Record<string, string>,
	)

	const viteConfig: InlineConfig = {
		define: {
			"import.meta.env.DEV": ctx.debug,
		},
		build: {
			outDir: ctx.dist,
			manifest: true,
			rollupOptions: {
				input,
				output: {
					entryFileNames: "resources/[name]-entry-[hash].js",
					assetFileNames: "resources/[name]-[hash][extname]",
				},
			},
			assetsDir: "resources",
			copyPublicDir: false,
			cssCodeSplit: true,

			minify: true,
		},
		plugins: [
			// vue тут не нужен т.к. наследуется конфиг из корня
			// vue()
		],
	}

	await build(viteConfig)
}

// Функция загрузки манифеста
function loadManifest(ctx: PrerenderContext) {
	const manifestPath = path.resolve(ctx.dist, ".vite", "manifest.json")
	let manifest = {}
	if (fs.existsSync(manifestPath)) {
		manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
	}
	ctx.manifest = manifest
}

// Функция компиляции страниц с использованием Vite для SSR
async function buildSSRBundle(files: string[], ctx: PrerenderContext) {
	const input = files.reduce(
		(acc, file) => {
			const name = file.replace(".vue", "")
			acc[name] = path.resolve(ctx.tempEntries, `${name}-entry.ts`)
			return acc
		},
		{} as Record<string, string>,
	)

	const viteConfig: InlineConfig = {
		define: {
			"import.meta.env.DEV": ctx.debug,
		},
		build: {
			ssr: true,
			rollupOptions: {
				input,
				output: {
					format: "es",
				},
			},
			outDir: ctx.tempSsr,
			copyPublicDir: false,
			minify: false,
		},
		plugins: [
			// vue тут не нужен т.к. наследуется конфиг из корня
			// vue()
		],
	}

	await build(viteConfig)

	const compiledModules = new Map<string, any>()

	for (const [name, filePath] of Object.entries(input)) {
		const routePath = name
		const outputFilePath = path.resolve(ctx.tempSsr, `${name}.js`)
		const moduleUrl = pathToFileURL(outputFilePath).href
		const { app, head } = await import(moduleUrl)
		compiledModules.set(routePath, { app, head })
	}

	return compiledModules
}

// Асинхронная функция для пререндеринга страницы
async function prerenderPage(
	{ app, head }: { app: any; head: any },
	routePath: string,
	ctx: PrerenderContext,
): Promise<void> {
	const context = {}
	// Создаем SSR-приложение и рендерим
	const appHtml = await renderToString(app, context)
	const headPayload = await renderSSRHead(head)

	// Поиск клиентского скрипта и связанных CSS-файлов для текущей страницы
	const clientScriptPath = findClientScript(routePath, ctx)
	const cssLinks = findCSSAssets(routePath, ctx)

	// Создаем payload для заполнения html шаблона
	const payload = {
		...headPayload,
		// appHtml,
		clientScriptPath,
		cssLinks,
	}

	let html = String(ctx.templateHtml)

	Object.entries(payload).forEach(([key, value]) => {
		html = html.replace(`<!--${key}-->`, value)
	})

	const pageExt = ctx.debug ? "html" : "ftl"

	// Формируем путь для сохранения HTML-файла
	const outputFilePath = path.resolve(ctx.dist, `${routePath}.${pageExt}`)
	fs.writeFileSync(outputFilePath, html)

	console.log(`[Prerender] Page rendered: ${routePath}.${pageExt}`)
}

function findManifestEntry(ctx: PrerenderContext, routePath: string) {
	return Object.entries(ctx.manifest).find(
		([_, v]) => v.isEntry === true && v.name === routePath,
	)?.[1]
}

// Функция для поиска клиентского скрипта для каждой страницы
function findClientScript(
	routePath: string,
	ctx: PrerenderContext,
): string | null {
	const manifestEntry = findManifestEntry(ctx, routePath)

	if (manifestEntry && manifestEntry.file) {
		return fixResourcesPath(ctx.debug, manifestEntry.file, routePath)
	}
	return null
}

// Функция для поиска и вставки CSS в HTML для каждой страницы
function findCSSAssets(routePath: string, ctx: PrerenderContext): string {
	const manifestEntry = findManifestEntry(ctx, routePath)

	if (!manifestEntry) {
		console.error(
			`[Prerender] Manifest entry not found for route: ${routePath}`,
		)
		return ""
	}

	const cssFiles = new Set<string>()

	// Рекурсивная функция для сбора CSS
	const collectCSS = (entry: any) => {
		if (entry.css) {
			entry.css.forEach((cssFile: string) => cssFiles.add(cssFile))
		}

		if (entry.imports) {
			entry.imports.forEach((importedKey: string) => {
				const importedEntry = ctx.manifest[importedKey]
				if (importedEntry) {
					collectCSS(importedEntry) // Рекурсивно собираем CSS для импортируемых файлов
				}
			})
		}
	}

	// Собираем CSS для основного entry и его зависимостей
	collectCSS(manifestEntry)

	// Генерируем ссылки на CSS файлы
	return Array.from(cssFiles)
		.map(
			(cssFile: string) =>
				`<link rel="stylesheet" href="${fixResourcesPath(ctx.debug, cssFile, routePath)}" />`,
		)
		.join("\n")
}

function fixResourcePathsInCompiledFiles(
	distPath: string,
	ctx: PrerenderContext,
) {
	const jsFiles = fs
		.readdirSync(path.resolve(distPath, "resources"))
		.filter((file) => file.endsWith(".js"))

	jsFiles.forEach((file) => {
		const filePath = path.resolve(distPath, "resources", file)
		let fileContent = fs.readFileSync(filePath, "utf-8")

		// Регулярное выражение для поиска путей, начинающихся с 'resources/'
		const resourcePathRegex = /"resources\/[a-zA-Z0-9\-_.\/]+"/g

		// Замена всех вхождений путей на исправленные
		fileContent = fileContent.replaceAll(resourcePathRegex, (match) => {
			if (match.startsWith('"/resources/'))
				match = match.replace(
					"/resources/",
					".${window.ENVIRONMENT?.resourcesPath}/",
				)
			if (match.startsWith('"resources/'))
				match = match.replace(
					"resources/",
					".${window.ENVIRONMENT?.resourcesPath}/",
				)

			match = match.replaceAll('"', "`")

			return match
		})

		// Перезаписываем файл с исправленными путями
		fs.writeFileSync(filePath, fileContent)
		console.log(`[FixResourcePaths] Updated paths in ${file}`)
	})
}

import fs, { readFileSync } from "node:fs"
import path from "node:path"
import { buildEmail } from "./email"
import { cleanDirectory, copyDir } from "./fs"
import { prerender } from "./prerender"

type BuildThemeParams = {
	directory?: string
	htmlTemplate?: string
	mainTsTemplate?: string
}

export type BuildThemeContext = {
	temp: string
	dist: string

	publicDir: string
	sourceLoginDir: string
	sourceEmailDir: string

	htmlTemplate: string
	mainTsTemplate: string

	debug?: boolean
}

export type BuildParams = {
	source: string
	temp: string
	dist: string
}

async function buildKeycloakTheme(params: BuildThemeParams = {}) {
	const {
		directory = "src/theme",
		htmlTemplate = "src/theme/template.html",
		mainTsTemplate = "src/theme/template.ts",
	} = params

	const context: BuildThemeContext = {
		temp: path.resolve(process.cwd(), ".prerender"),
		dist: path.resolve(process.cwd(), "dist"),

		publicDir: path.resolve(process.cwd(), "public"),
		sourceLoginDir: path.resolve(process.cwd(), directory, "login"),
		sourceEmailDir: path.resolve(process.cwd(), directory, "email"),

		htmlTemplate: readFileSync(
			path.resolve(process.cwd(), htmlTemplate),
		).toString(),
		mainTsTemplate: readFileSync(
			path.resolve(process.cwd(), mainTsTemplate),
		).toString(),

		debug: false,
	}

	cleanDirectory(context.temp, true)
	cleanDirectory(context.dist, true)

	// сборка login темы
	await prerender(
		{
			source: context.sourceLoginDir,
			temp: fs.mkdtempSync(path.resolve(context.temp, "prerender-login-")),
			dist: path.resolve(context.dist, "login"),
		},
		context,
	)

	// сборка email темы
	await buildEmail(
		{
			source: context.sourceEmailDir,
			temp: fs.mkdtempSync(path.resolve(context.temp, "build-email-")),
			dist: path.resolve(context.dist, "email"),
		},
		context,
	)

	// копирование public в dist
	copyDir(context.publicDir, context.dist)

	// очистка временных директорий
	cleanDirectory(context.temp)
}

// Запуск основного скрипта
buildKeycloakTheme().catch((error) => {
	console.error(error)
	process.exit(1)
})

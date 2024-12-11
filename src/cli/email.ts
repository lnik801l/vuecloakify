import mjml2html from "mjml"
import * as fs from "node:fs"
import path from "node:path"
import type { BuildParams, BuildThemeContext } from "."
import { cleanDirectory } from "./fs"

export async function buildEmail(
	{ dist, source }: BuildParams,
	themeContext: BuildThemeContext,
) {
	const files = fs.readdirSync(source).filter((file) => file.endsWith(".mjml"))

	if (files.length === 0) {
		console.warn("[Prerender] No email templates found in", source)
		return
	}

	cleanDirectory(dist, true)

	for (const file of files) {
		const template = fs.readFileSync(path.resolve(source, file)).toString()
		fs.writeFileSync(
			path.resolve(dist, file.replace(".mjml", ".ftl")),
			mjml2html(template).html,
		)
	}
}

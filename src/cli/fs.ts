import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"

export function cleanDirectory(dir: string, create = false) {
	if (existsSync(dir)) {
		rmSync(dir, { recursive: true, force: true })
	}

	if (!create) return
	mkdirSync(dir, { recursive: true })
}

export function copyDir(source: string, destination: string) {
	cpSync(source, destination, { recursive: true, force: true })
}

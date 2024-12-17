/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-template-curly-in-string */
function getWindow() {
	try {
		//@ts-expect-error (TODO: fix types)
		return window as any
	} catch {
		return undefined
	}
}

export function fixResourcesPath(
	debug: boolean,
	path: string,
	routePath: string,
) {
	const w = getWindow()
	const resourcesPath =
		w === undefined ? "${url.resourcesPath}" : w.ENVIRONMENT?.resourcesPath
	const prefix = debug ? `/${routePath}/resources/` : `${resourcesPath}/`

	if (path.startsWith("/resources/"))
		path = path.replace("/resources/", prefix)
	if (path.startsWith("resources/")) path = path.replace("resources/", prefix)
	if (path.startsWith("/assets/")) path = path.replace("/assets/", prefix)

	return path
}

import { useHead } from "@unhead/vue"

type FtlBaseConfig = {
	field: string
	type: "string" | "number" | "boolean" | "string[]" | "object[]" | "number[]"
	default?:
		| null
		| string
		| number
		| boolean
		| string[]
		| number[]
		| Record<string, any>[]
	formatItem?: (item: string) => string // Опциональная функция форматирования для элементов массива строк
	itemConfig?: EnvironmentConfig // Конфигурация для объектов внутри массива, если тип object[]
}

export type EnvironmentConfig = {
	[key: string]: FtlBaseConfig | EnvironmentConfig
}

// Типизация, чтобы преобразовать EnvironmentConfig в объект с соответствующими значениями на клиенте
type FtlTypeMapping<T extends FtlBaseConfig> = T["type"] extends "string"
	? string
	: T["type"] extends "number"
		? number
		: T["type"] extends "boolean"
			? boolean
			: T["type"] extends "string[]"
				? string[]
				: never

type EnvironmentType<T extends EnvironmentConfig> = {
	[K in keyof T]: T[K] extends FtlBaseConfig
		? FtlTypeMapping<T[K]>
		: T[K] extends EnvironmentConfig
			? EnvironmentType<T[K]>
			: never
}

// Функции для создания объектов FtlBaseConfig
export function ftlString(config: {
	field: string
	default?: string | null
	debug?: string | null
}) {
	return {
		field: config.field,
		type: "string",
		default: import.meta.env.DEV ? config.debug : config.default,
	} satisfies FtlBaseConfig
}

export function ftlNumber(config: {
	field: string
	default?: number | null
	debug?: number | null
}) {
	return {
		field: config.field,
		type: "number",
		default: import.meta.env.DEV ? config.debug : config.default ?? 0,
	} satisfies FtlBaseConfig
}

export function ftlBoolean(config: {
	field: string
	default?: boolean | null
	debug?: boolean | null
}) {
	return {
		field: config.field,
		type: "boolean",
		default: import.meta.env.DEV ? config.debug : config.default ?? false,
	} satisfies FtlBaseConfig
}

export function ftlObjectArray<T extends Record<string, any>>(config: {
	field: string
	default?: T[]
	debug?: T[]
	itemConfig: EnvironmentConfig
}) {
	return {
		field: config.field,
		type: "object[]",
		default: import.meta.env.DEV ? config.debug : config.default ?? [],
		itemConfig: config.itemConfig,
	} satisfies FtlBaseConfig
}

export function ftlNumberArray(config: {
	field: string
	default?: number[]
	debug?: number[]
	formatItem?: (item: string) => string
}) {
	return {
		field: config.field,
		type: "number[]",
		default: import.meta.env.DEV ? config.debug : config.default ?? [],
		formatItem: config.formatItem ?? ((item: string) => `${item}`), // По умолчанию форматируем каждый элемент как строку
	} satisfies FtlBaseConfig
}

export function ftlStringArray(config: {
	field: string
	default?: string[]
	debug?: string[]
	formatItem?: (item: string) => string
}) {
	return {
		field: config.field,
		type: "string[]",
		default: import.meta.env.DEV ? config.debug : config.default ?? [],
		formatItem: config.formatItem ?? ((item: string) => item), // Если функция форматирования не передана, оставляем элемент как есть
	} satisfies FtlBaseConfig
}

// Основная функция для генерации окружения
export function generateFtlWithEnvironment(config: EnvironmentConfig): string {
	function formatStringValue(v: any) {
		const quotes = v !== null && v !== undefined
		return quotes ? `"${v}"` : v
	}

	function buildFtlObject(obj: EnvironmentConfig, indent = 0): string {
		const entries = Object.entries(obj).map(([key, value]) => {
			if ("field" in value && "type" in value) {
				switch (value.type) {
					case "string": {
						return `"${key}": <#if (${value.field})?has_content>"\${${value.field}}"<#else>${formatStringValue(
							value.default,
						)}</#if>`
					}
					case "number": {
						return `"${key}": <#if (${value.field})?has_content>\${${value.field}}<#else>${value.default}</#if>`
					}
					case "boolean": {
						return `"${key}": <#if (${value.field})?has_content>\${(${value.field})?c}<#else>${value.default}</#if>`
					}
					case "number[]": {
						const defaultNumberArray = (value.default as number[])
							.map((val) => `${val}`)
							.join(", ")
						const formattedNumberItems = `<#list ${value.field} as item>\${${
							value.formatItem && typeof value.formatItem == "function"
								? value.formatItem("item")
								: "item"
						}}<#if item_has_next>, </#if></#list>`
						return `"${key}": <#if (${value.field})?has_content>[${formattedNumberItems}]<#else>[${defaultNumberArray}]</#if>`
					}
					case "string[]": {
						const defaultArray = ((value.default ?? []) as string[])
							.map((val) => `"${val}"`)
							.join(", ")
						const formattedItems = `<#list ${value.field} as item>"\${${
							value.formatItem && typeof value.formatItem == "function"
								? value.formatItem("item")
								: "item"
						}}"<#if item_has_next>, </#if></#list>`
						return `"${key}": <#if (${value.field})?has_content>[${formattedItems}]<#else>[${defaultArray}]</#if>`
					}
					case "object[]": {
						// Обрабатываем массив объектов
						const objectItems = `<#list ${value.field} as item>{
                ${Object.entries(value.itemConfig!)
							.map(([itemKey, itemValue]) => {
								return `"${itemKey}": "\${item.${itemValue.field}}"`
							})
							.join(", ")}
            }<#if item_has_next>, </#if></#list>`
						return `"${key}": [${objectItems}]`
					}

					default:
						throw new Error("unsupported variable type")
				}
			} else {
				const nestedObject = buildFtlObject(
					value as EnvironmentConfig,
					indent + 2,
				)
				return `"${key}": { ${nestedObject} }`
			}
			return ""
		})

		const indentation = " ".repeat(indent)
		return entries.map((entry) => `${indentation}  ${entry}`).join(",\n")
	}

	const jsonContent = buildFtlObject(config)

	return `window.ENVIRONMENT = Object.assign(window.ENVIRONMENT ?? {}, { ${jsonContent} });`
}

// Функция для использования на сервере и на клиенте с типизацией
export function useEnvironment<T extends EnvironmentConfig>(
	config: T,
): EnvironmentType<T> | undefined {
	;(config as any).resourcesPath = ftlString({
		field: "url.resourcesPath",
		default: "/default/path",
	})

	if (import.meta.env.SSR) {
		// SSR: генерируем скрипт и добавляем его в head через unhead
		const scriptContent = generateFtlWithEnvironment(config)

		if (!import.meta.env.DEV) {
			useHead({
				script: [
					{
						innerHTML: scriptContent,
						type: "text/javascript",
					},
				],
			})
		}

		// В SSR возвращаем undefined, так как на сервере данные еще не инициализированы
		return undefined
	}
	// Клиент: возвращаем данные из window.ENVIRONMENT или значения по умолчанию в dev режиме
	const environment = (window as any).ENVIRONMENT as EnvironmentType<T>

	if (environment) {
		return environment
	}
	if (import.meta.env.DEV) {
		// В dev режиме возвращаем значения по умолчанию
		return buildDefaultEnvironment(config)
	}
}

export { fixResourcesPath } from "../utils"

function buildDefaultEnvironment<T extends EnvironmentConfig>(
	config: T,
): EnvironmentType<T> {
	function buildObject(obj: EnvironmentConfig): Record<string, any> {
		return Object.entries(obj).reduce(
			(acc, [key, value]) => {
				if ("field" in value && "type" in value) {
					switch (value.type) {
						case "string": {
							acc[key] = value.default ?? ""
							break
						}
						case "number": {
							acc[key] = value.default ?? 0
							break
						}
						case "boolean": {
							acc[key] = value.default ?? false
							break
						}
						case "number[]": {
							acc[key] = value.default ?? []
							break
						}
						case "string[]": {
							acc[key] = value.default ?? []
							break
						}
						case "object[]": {
							// Если тип объекта — это массив объектов, обрабатываем itemConfig для каждого объекта
							acc[key] = value.default ?? []
							break
						}
						default: {
							throw new Error("unsupported field type")
						}
					}
				} else {
					acc[key] = buildObject(value as EnvironmentConfig)
				}
				return acc
			},
			{} as Record<string, any>,
		)
	}
	return buildObject(config) as EnvironmentType<T>
}

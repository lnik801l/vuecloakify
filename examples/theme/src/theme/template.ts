import { createHead } from "@unhead/vue"
//@ts-expect-error (Получение компонента страницы (будет заменено при генерации))
// eslint-disable-next-line import/no-unresolved
import PageComponent from "PAGE_COMPONENT_IMPORT"
import { createApp } from "vue"

const app = createApp(PageComponent)
const head = createHead()
app.use(head)

// Если это клиент, монтируем приложение на элемент с ID "app"
if (typeof window !== "undefined") {
	app.mount("#app")
}

// Экспорт приложения и head для использования на сервере
export { app, head }

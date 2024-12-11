<script lang="ts" setup>
import { computed } from "vue";
import { routes } from "vue-router/auto-routes";

type Route = { name: string; path: string; children?: Route[]; component?: any };

function flattenRoutes(routes: Route[]) {
  const flatRoutes: Route[] = [];

  function recurse(routes: Route[], parentPath = "") {
    for (const route of routes) {
      const fullPath =
        parentPath && route.path !== "/" ? `${parentPath}/${route.path}`.replace(/\/+/g, "/") : route.path;

      const flatRoute = { ...route, path: fullPath };

      delete flatRoute.children;

      if (route.component) {
        flatRoutes.push(flatRoute);
      }

      // Если у маршрута есть вложенные, рекурсивно обходим их
      if (route.children) {
        recurse(route.children, fullPath);
      }
    }
  }

  recurse(routes);
  return flatRoutes;
}

const allRoutes = computed(() => flattenRoutes(routes));
</script>

<template>
  <div class="routes">
    <p>available routes:</p>
    <nav>
      <RouterLink :to="route.path" v-for="route of allRoutes">{{ route.path }}</RouterLink>
    </nav>
  </div>
</template>

<style lang="scss">
.routes {
  padding: 20px;
  nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}
</style>

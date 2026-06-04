<script setup lang="ts">
interface Crumb {
  label: string;
  href?: string;
}

withDefaults(defineProps<{ crumbs: Crumb[] }>(), {});
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(crumb, idx) in crumbs" :key="idx">
        <a v-if="crumb.href" :href="crumb.href" class="crumb-link">{{ crumb.label }}</a>
        <span v-else class="crumb-text">{{ crumb.label }}</span>
        <span v-if="idx < crumbs.length - 1" class="crumb-sep">/</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.breadcrumbs ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.breadcrumbs li {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.crumb-link {
  color: #3a5020;
  text-decoration: none;
  transition: color 0.15s;
}

.crumb-link:hover {
  color: #515f37;
  text-decoration: underline;
}

.crumb-text {
  color: #6b7280;
}

.crumb-sep {
  color: #d1d5db;
  margin: 0 0.25rem;
}
</style>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'text' | 'avatar' | 'heading' | 'custom';
  count?: number;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  lines?: number;
}

withDefaults(defineProps<Props>(), {
  type: 'card',
  count: 1,
  lines: 3,
});

function getSize(val: string | number | undefined): string {
  if (!val) return '100%';
  if (typeof val === 'number') return `${val}px`;
  return val;
}
</script>

<template>
  <div class="skeleton-wrapper">
    <template v-if="type === 'card'">
      <div v-for="i in count" :key="i" class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line" style="width: 80%"></div>
          <div class="skeleton-line" style="width: 60%"></div>
        </div>
      </div>
    </template>

    <template v-else-if="type === 'avatar'">
      <div v-for="i in count" :key="i" class="skeleton-avatar" :style="{ width: getSize(width), height: getSize(height) }"></div>
    </template>

    <template v-else-if="type === 'heading'">
      <div class="skeleton-heading"></div>
    </template>

    <template v-else-if="type === 'text'">
      <div v-for="i in lines" :key="i" class="skeleton-line"></div>
    </template>

    <template v-else-if="type === 'custom'">
      <slot></slot>
    </template>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: contents;
}

/* Skeleton animations */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

/* Card skeleton */
.skeleton-card {
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

.skeleton-content {
  padding: 16px;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
  display: block;

  &:last-child {
    margin-bottom: 0;
  }
}

/* Avatar skeleton */
.skeleton-avatar {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;

  &:last-child {
    margin-right: 0;
  }
}

/* Heading skeleton */
.skeleton-heading {
  width: 100%;
  height: 28px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
  border-radius: 4px;
  margin-bottom: 16px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .skeleton-image,
  .skeleton-line,
  .skeleton-avatar,
  .skeleton-heading {
    animation: none;
    background: #f0f0f0;
  }
}
</style>

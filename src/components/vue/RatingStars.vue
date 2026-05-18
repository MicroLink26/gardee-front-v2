<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ modelValue: number; readonly?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const hovered = ref(0);
</script>

<template>
  <div class="stars" :class="{ readonly: props.readonly }">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      class="star"
      :class="{ active: i <= (hovered || props.modelValue) }"
      :disabled="props.readonly"
      @mouseenter="!props.readonly && (hovered = i)"
      @mouseleave="hovered = 0"
      @click="!props.readonly && emit('update:modelValue', i)"
    >★</button>
  </div>
</template>

<style scoped>
.stars { display: flex; gap: 2px; }
.star { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #d1d5db; padding: 0; transition: color 0.1s; }
.star.active { color: #f59e0b; }
.stars.readonly .star { cursor: default; }
</style>

<template>
  <div class="layout relative">
    <slot />
    <UProgress
      v-if="progress.on"
      :value="progress.value"
      :max="progress.max"
      class="absolute left-0 right-0 bottom-0"
    />
  </div>
</template>

<script setup lang="ts">
const { progress } = useAppStore();
</script>
<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  min-width: 100vh;
}
</style>

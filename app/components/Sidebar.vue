<template>
  <div
    class="gap-1.5 p-4 sm:px-6 fixed left-0 h-full bg-white w-16 rounded-tr-md rounded-br-md flex justify-center items-start transition-all"
    :class="{ '-translate-x-full': !showSidebar }"
  >
    <UButton
      @click="openSlideover"
      icon="i-lucide-arrow-right"
      size="md"
      color="neutral"
      variant="ghost"
    />
  </div>

  <USlideover
    v-model:open="open"
    :overlay="false"
    :modal="false"
    :dismissible="false"
    title="Sometimes Lab"
    close-icon="i-lucide-arrow-left"
    side="left"
    :ui="{
      content: 'opacity-90 max-w-xs',
    }"
    @after:leave="showSidebar = true"
  >
    <template #body>
      <div class="h-full">placeholder</div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const open = ref(false);
const showSidebar = ref(true);

defineShortcuts({
  o: () => (open.value = !open.value),
});

const openSlideover = () => {
  open.value = true;
  showSidebar.value = false;
};
</script>

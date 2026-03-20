<script setup lang="ts">
import VarCardGalleryItem, { type VarCardGalleryCard } from "./VarCardGalleryItem.vue"

defineProps<{
  cards: VarCardGalleryCard[]
}>()

const emit = defineEmits<{
  (e: "preview", card: VarCardGalleryCard): void
  (e: "clone", card: VarCardGalleryCard): void
  (e: "edit", card: VarCardGalleryCard): void
}>()
</script>

<template>
  <div class="gallery-grid">
    <VarCardGalleryItem
      v-for="card in cards"
      :key="card.id"
      :card="card"
      @preview="emit('preview', $event)"
      @clone="emit('clone', $event)"
      @edit="emit('edit', $event)"
    />
  </div>
</template>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

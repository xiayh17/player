<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { NButton, NEmpty, NModal, NTag } from "naive-ui"
import type { VarCardGalleryCard } from "./VarCardGalleryItem.vue"
import VarCardPreviewSurface from "./VarCardPreviewSurface.vue"

const props = defineProps<{
  show: boolean
  card: VarCardGalleryCard | null
}>()

const emit = defineEmits<{
  (e: "update:show", value: boolean): void
  (e: "clone", card: VarCardGalleryCard): void
  (e: "edit", card: VarCardGalleryCard): void
}>()

const { t, locale } = useI18n()

const recorderLocale = computed(() => (locale.value === "zh" ? "zh-CN" : "en-US"))
const title = computed(() => props.card?.title ?? t("varCards.preview.emptyTitle"))
const isBuiltin = computed(() => props.card?.namespace === "builtin")
const actionLabel = computed(() =>
  isBuiltin.value ? t("varCards.actions.clone") : t("common.edit")
)

function closeDialog() {
  emit("update:show", false)
}

function handlePrimaryAction() {
  if (!props.card) return

  if (isBuiltin.value) {
    emit("clone", props.card)
    return
  }

  emit("edit", props.card)
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    class="preview-dialog"
    :title="title"
    :bordered="false"
    size="huge"
    @update:show="emit('update:show', $event)"
  >
    <div v-if="card" class="preview-dialog__body">
      <div class="preview-dialog__hero">
        <div class="preview-dialog__title-block">
          <div class="preview-dialog__badges">
            <NTag size="small" :bordered="false" :type="isBuiltin ? 'warning' : 'success'">
              {{ isBuiltin ? t("varCards.badges.builtin") : t("varCards.badges.user") }}
            </NTag>
            <NTag v-if="card.baseCardId" size="small" :bordered="false">
              {{ t("varCards.badges.cloned") }}
            </NTag>
          </div>
          <p class="preview-dialog__description">{{ card.description }}</p>
          <code class="preview-dialog__record-type">{{ card.recordType }}</code>
        </div>

        <div class="preview-dialog__actions">
          <NButton quaternary @click="closeDialog">{{ t("common.close") }}</NButton>
          <NButton type="primary" @click="handlePrimaryAction">{{ actionLabel }}</NButton>
        </div>
      </div>

      <div class="preview-dialog__canvas">
        <VarCardPreviewSurface
          v-if="card"
          :manifest="card"
          :readonly="false"
          :locale="recorderLocale"
          current-user-name="Dr. Lin"
        />
      </div>
    </div>

    <NEmpty v-else :description="t('varCards.preview.emptyState')" />
  </NModal>
</template>

<style scoped>
:deep(.preview-dialog) {
  width: min(1120px, calc(100vw - 32px));
}

.preview-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-dialog__hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.preview-dialog__title-block {
  min-width: 0;
}

.preview-dialog__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-dialog__description {
  margin: 0 0 10px;
  color: rgba(19, 34, 56, 0.78);
  line-height: 1.6;
}

.preview-dialog__record-type {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(19, 34, 56, 0.72);
}

.preview-dialog__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-dialog__canvas {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background:
    radial-gradient(circle at top left, rgba(229, 242, 255, 0.8), rgba(255, 255, 255, 0.92)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 246, 249, 0.96));
  padding: 20px;
  max-height: min(70vh, 900px);
  overflow: auto;
}

.preview-dialog__recorder {
  min-height: 420px;
}

@media (max-width: 768px) {
  .preview-dialog__hero {
    flex-direction: column;
  }

  .preview-dialog__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

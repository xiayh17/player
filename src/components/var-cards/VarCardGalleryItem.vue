<script setup lang="ts">
import { computed } from "vue"
import { NButton, NCard, NTag, NThing } from "naive-ui"
import { useI18n } from "vue-i18n"
import type { VarCardManifest } from "@/features/var-cards/types"

export type VarCardGalleryCard = VarCardManifest

const props = defineProps<{
  card: VarCardGalleryCard
}>()

const emit = defineEmits<{
  (e: "preview", card: VarCardGalleryCard): void
  (e: "clone", card: VarCardGalleryCard): void
  (e: "edit", card: VarCardGalleryCard): void
}>()

const { t } = useI18n()

const namespaceLabel = computed(() =>
  props.card.namespace === "builtin" ? t("varCards.badges.builtin") : t("varCards.badges.user")
)

const accentClass = computed(() =>
  props.card.namespace === "builtin" ? "gallery-item--builtin" : "gallery-item--user"
)

const actionLabel = computed(() =>
  props.card.readonly ? t("varCards.actions.clone") : t("common.edit")
)

const kindLabel = computed(() => t(`varCards.summary.kindValues.${props.card.schema.kind}`))

const layoutLabel = computed(() =>
  t(`varCards.summary.layoutValues.${props.card.layout.variant}`)
)

const densityLabel = computed(() =>
  t(`varCards.summary.densityValues.${props.card.layout.density}`)
)

const fieldLabel = computed(() => props.card.schema.label || props.card.title)

const helperCopy = computed(
  () =>
    props.card.schema.placeholder ||
    props.card.behavior.helpText ||
    props.card.behavior.validationHint ||
    props.card.description
)

const statusChips = computed(() => [
  props.card.behavior.required ? t("varCards.summary.required") : t("varCards.summary.optional"),
  props.card.behavior.liveValue ? t("varCards.summary.liveValue") : t("varCards.summary.staticValue"),
  props.card.behavior.allowManualInput
    ? t("varCards.summary.manualEntry")
    : t("varCards.summary.derivedValue"),
])

function handlePrimaryAction() {
  if (props.card.readonly) {
    emit("clone", props.card)
    return
  }

  emit("edit", props.card)
}
</script>

<template>
  <NCard :class="['gallery-item', accentClass]" embedded hoverable>
    <div class="gallery-item__hero">
      <div class="gallery-item__icon-wrap">
        <span class="gallery-item__icon">{{ card.icon ?? "◧" }}</span>
      </div>

      <div class="gallery-item__meta">
        <div class="gallery-item__badges">
          <NTag size="small" round :bordered="false" :type="card.namespace === 'builtin' ? 'warning' : 'success'">
            {{ namespaceLabel }}
          </NTag>
          <NTag v-if="card.baseCardId" size="small" round :bordered="false">
            {{ t("varCards.badges.cloned") }}
          </NTag>
        </div>

        <NThing>
          <template #header>
            <div class="gallery-item__title-row">
              <span class="gallery-item__title">{{ card.title }}</span>
            </div>
          </template>
          <template #description>
            <span class="gallery-item__record-type">{{ card.recordType }}</span>
          </template>
        </NThing>
      </div>
    </div>

    <p class="gallery-item__description">{{ card.description }}</p>

    <div class="gallery-item__summary">
      <div class="gallery-item__summary-head">
        <span class="gallery-item__summary-kicker">{{ t("varCards.summary.field") }}</span>
        <strong class="gallery-item__summary-title">{{ fieldLabel }}</strong>
        <p class="gallery-item__summary-copy">{{ helperCopy }}</p>
      </div>

      <div class="gallery-item__summary-grid">
        <div class="gallery-item__summary-metric">
          <span>{{ t("varCards.summary.kind") }}</span>
          <strong>{{ kindLabel }}</strong>
        </div>
        <div class="gallery-item__summary-metric">
          <span>{{ t("varCards.summary.layout") }}</span>
          <strong>{{ layoutLabel }}</strong>
        </div>
        <div class="gallery-item__summary-metric">
          <span>{{ t("varCards.summary.density") }}</span>
          <strong>{{ densityLabel }}</strong>
        </div>
      </div>

      <div class="gallery-item__summary-flags">
        <span v-for="chip in statusChips" :key="chip" class="gallery-item__summary-flag">
          {{ chip }}
        </span>
      </div>
    </div>

    <div class="gallery-item__tags">
      <span v-for="tag in card.tags" :key="tag" class="gallery-item__tag">{{ tag }}</span>
    </div>

    <div class="gallery-item__footer">
      <NButton quaternary @click="emit('preview', card)">
        {{ t("varCards.actions.preview") }}
      </NButton>
      <NButton type="primary" @click="handlePrimaryAction">
        {{ actionLabel }}
      </NButton>
    </div>
  </NCard>
</template>

<style scoped>
.gallery-item {
  height: 100%;
  border-radius: 22px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.82)),
    linear-gradient(180deg, rgba(247, 248, 250, 0.98), rgba(238, 242, 247, 0.98));
  backdrop-filter: blur(12px);
}

.gallery-item--builtin {
  box-shadow: 0 22px 40px rgba(15, 23, 42, 0.08);
}

.gallery-item--user {
  box-shadow: 0 24px 44px rgba(20, 83, 45, 0.12);
}

.gallery-item__hero {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}

.gallery-item__icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(59, 130, 246, 0.8));
  color: #fff;
  flex-shrink: 0;
}

.gallery-item__icon {
  font-size: 22px;
  line-height: 1;
}

.gallery-item__meta {
  min-width: 0;
  flex: 1;
}

.gallery-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.gallery-item__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.gallery-item__title {
  font-size: 18px;
  font-weight: 700;
  color: #132238;
}

.gallery-item__record-type {
  font-family: "SFMono-Regular", "Menlo", monospace;
  font-size: 11px;
  color: rgba(19, 34, 56, 0.64);
}

.gallery-item__description {
  margin: 0 0 16px;
  color: rgba(19, 34, 56, 0.78);
  line-height: 1.5;
  min-height: 44px;
}

.gallery-item__summary {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 251, 0.94));
  padding: 14px;
  min-height: 198px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gallery-item__summary-head {
  min-height: 0;
}

.gallery-item__summary-kicker {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 34, 56, 0.5);
}

.gallery-item__summary-title {
  display: block;
  color: #132238;
  font-size: 16px;
  line-height: 1.3;
}

.gallery-item__summary-copy {
  margin: 8px 0 0;
  color: rgba(19, 34, 56, 0.72);
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gallery-item__summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.gallery-item__summary-metric {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.gallery-item__summary-metric span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: rgba(19, 34, 56, 0.5);
}

.gallery-item__summary-metric strong {
  color: #132238;
  font-size: 13px;
  line-height: 1.3;
}

.gallery-item__summary-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gallery-item__summary-flag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: rgba(25, 78, 160, 0.88);
  font-size: 11px;
  font-weight: 600;
}

.gallery-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.gallery-item__tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(19, 34, 56, 0.7);
  font-size: 12px;
}

.gallery-item__footer {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 480px) {
  .gallery-item__summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

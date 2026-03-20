<script setup lang="ts">
import { computed } from "vue"
import type { ProtocolAnchor } from "@/composables/useProtocolNavigator"

const props = defineProps<{
  anchors: ProtocolAnchor[]
  activeAnchorId: string | null
  hoveredAnchorId: string | null
}>()

const emit = defineEmits<{
  (e: "anchor-click", anchorId: string): void
  (e: "anchor-hover", anchorId: string): void
  (e: "anchor-leave"): void
}>()

const activeAnchor = computed(() =>
  props.anchors.find((anchor) => anchor.id === props.activeAnchorId) ?? null,
)

const hoveredAnchor = computed(() =>
  props.anchors.find((anchor) => anchor.id === props.hoveredAnchorId) ?? null,
)

function anchorStyle(anchor: ProtocolAnchor): Record<string, string> {
  return {
    top: `${(anchor.topRatio * 100).toFixed(3)}%`,
  }
}

function previewStyle(anchor: ProtocolAnchor): Record<string, string> {
  const top = `${(anchor.topRatio * 100).toFixed(3)}%`
  return {
    top: `clamp(44px, ${top}, calc(100% - 44px))`,
  }
}

function kindLabel(anchor: ProtocolAnchor): string {
  switch (anchor.kind) {
    case "section":
      return anchor.level <= 1 ? "Section" : "Subsection"
    case "step":
      return "Step"
    case "check":
      return "Check"
    case "table":
      return "Table"
    case "quiz":
      return "Quiz"
    case "callout":
      return "Callout"
    default:
      return "Anchor"
  }
}
</script>

<template>
  <aside class="protocol-navigator-rail" aria-label="Protocol Navigator">
    <div class="protocol-navigator-rail__track">
      <button
        v-for="anchor in anchors"
        :key="anchor.id"
        class="protocol-navigator-rail__tick"
        :class="[
          `protocol-navigator-rail__tick--${anchor.kind}`,
          `protocol-navigator-rail__tick--level-${anchor.level}`,
          `protocol-navigator-rail__tick--status-${anchor.status}`,
          { 'is-active': anchor.id === activeAnchorId },
        ]"
        :style="anchorStyle(anchor)"
        type="button"
        :aria-label="`${kindLabel(anchor)}: ${anchor.title}`"
        :title="`${kindLabel(anchor)}: ${anchor.title}`"
        @click="emit('anchor-click', anchor.id)"
        @mouseenter="emit('anchor-hover', anchor.id)"
        @mouseleave="emit('anchor-leave')"
        @focus="emit('anchor-hover', anchor.id)"
        @blur="emit('anchor-leave')"
      />

      <div
        v-if="activeAnchor"
        class="protocol-navigator-rail__active-marker"
        :style="anchorStyle(activeAnchor)"
      />
    </div>

    <div
      v-if="hoveredAnchor"
      class="protocol-navigator-rail__preview"
      :style="previewStyle(hoveredAnchor)"
    >
      <p class="protocol-navigator-rail__preview-kind">
        {{ kindLabel(hoveredAnchor) }}
      </p>
      <p class="protocol-navigator-rail__preview-title">
        {{ hoveredAnchor.title }}
      </p>
      <p v-if="hoveredAnchor.summary" class="protocol-navigator-rail__preview-summary">
        {{ hoveredAnchor.summary }}
      </p>
    </div>
  </aside>
</template>

<style scoped>
.protocol-navigator-rail {
  width: 34px;
  position: relative;
  display: flex;
  justify-content: center;
  user-select: none;
  overflow: visible;
}

.protocol-navigator-rail__track {
  width: 18px;
  height: min(76vh, 620px);
  border-radius: 12px;
  background: linear-gradient(180deg, #f0f4f8 0%, #e6edf3 100%);
  border: 1px solid #d6e0ea;
  position: relative;
}

.protocol-navigator-rail__tick {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 11px;
  height: 2px;
  border: 0;
  border-radius: 999px;
  background: #6f7f8f;
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 120ms ease, transform 120ms ease, background-color 120ms ease;
}

.protocol-navigator-rail__tick:hover,
.protocol-navigator-rail__tick:focus-visible {
  opacity: 0.95;
  transform: translate(-50%, -50%) scaleX(1.08);
  outline: none;
}

.protocol-navigator-rail__tick--section {
  width: 13px;
}

.protocol-navigator-rail__tick--step {
  width: 10px;
}

.protocol-navigator-rail__tick--check,
.protocol-navigator-rail__tick--table,
.protocol-navigator-rail__tick--callout,
.protocol-navigator-rail__tick--quiz {
  width: 7px;
}

.protocol-navigator-rail__tick--status-completed {
  background: #2f7d32;
}

.protocol-navigator-rail__tick--status-warning {
  background: #b26a00;
}

.protocol-navigator-rail__tick--status-error {
  background: #b42318;
}

.protocol-navigator-rail__tick.is-active {
  opacity: 1;
}

.protocol-navigator-rail__active-marker {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 6px;
  border-radius: 999px;
  background: #1f3f63;
  box-shadow: 0 0 0 2px rgba(31, 63, 99, 0.16);
  pointer-events: none;
}

.protocol-navigator-rail__preview {
  position: absolute;
  left: calc(100% + 12px);
  transform: translateY(-50%);
  width: 210px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #d8e1ea;
  background: #fbfdff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.09);
  pointer-events: none;
  z-index: 2;
}

.protocol-navigator-rail__preview-kind {
  font-size: 11px;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #4f657a;
  margin: 0;
}

.protocol-navigator-rail__preview-title {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #162236;
  font-weight: 600;
}

.protocol-navigator-rail__preview-summary {
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #43576a;
}
</style>

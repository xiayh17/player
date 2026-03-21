<script setup lang="ts">
import { computed } from "vue"
import { NCard, NEmpty, NTag } from "naive-ui"
import VarCardPreviewSurface from "@/components/var-cards/VarCardPreviewSurface.vue"
import type { VarCardManifest } from "@/features/var-cards/types"

const props = defineProps<{
  draft: Record<string, any>
  readOnly: boolean
}>()

const options = computed(() =>
  String(props.draft.enumOptionsText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, label] = line.split("|").map((item) => item.trim())
      return {
        value: value || label,
        label: label || value,
      }
    }),
)

const parsedDemoValue = computed(() => {
  const raw = String(props.draft.demoValueText || "").trim()
  if (!raw) return ""

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
})

const formattedDemoValue = computed(() =>
  typeof parsedDemoValue.value === "string"
    ? parsedDemoValue.value
    : JSON.stringify(parsedDemoValue.value, null, 2),
)

const previewManifest = computed<VarCardManifest>(() => ({
  id: String(props.draft.id || "studio-preview"),
  namespace: props.readOnly ? "builtin" : "user",
  version: String(props.draft.version || "1.0.0"),
  title: String(props.draft.title || "Untitled card"),
  description: String(props.draft.description || ""),
  icon: null,
  tags: String(props.draft.tagsText || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean),
  readonly: props.readOnly,
  baseCardId: null,
  recordType: String(props.draft.recordType || "card:user/studio-preview"),
  demoValue: parsedDemoValue.value,
  schema: {
    kind: props.draft.layoutKind === "select" ? "select" : (props.draft.layoutKind || "text"),
    baseType: null,
    inputKind: null,
    label: String(props.draft.fieldLabel || props.draft.title || "Preview"),
    placeholder: String(props.draft.placeholder || ""),
    defaultValue: "",
    helperText: String(props.draft.helpText || ""),
    unit: null,
    format: null,
    rows:
      props.draft.layoutKind === "textarea"
      || props.draft.layoutKind === "code"
      || props.draft.layoutKind === "markdown"
      ? 4
      : null,
    min: null,
    max: null,
    step: null,
    language: props.draft.layoutKind === "code" ? "plaintext" : null,
    accept: props.draft.layoutKind === "asset" ? String(props.draft.assetAccept || "") : null,
    previewMode: props.draft.layoutKind === "asset" ? String(props.draft.assetPreviewMode || "auto") as VarCardManifest["schema"]["previewMode"] : null,
    serviceType: props.draft.layoutKind === "service" ? String(props.draft.serviceType || "ssh") as VarCardManifest["schema"]["serviceType"] : null,
    serviceProfileId: props.draft.layoutKind === "service" ? String(props.draft.serviceProfileId || "") : null,
    serviceHost: props.draft.layoutKind === "service" ? String(props.draft.serviceHost || "") : null,
    servicePort: props.draft.layoutKind === "service"
      ? Number.isFinite(Number(props.draft.servicePort)) ? Number(props.draft.servicePort) : 22
      : null,
    serviceUsername: props.draft.layoutKind === "service" ? String(props.draft.serviceUsername || "") : null,
    serviceRemotePath: props.draft.layoutKind === "service" ? String(props.draft.serviceRemotePath || "") : null,
    options: options.value,
  },
  layout: {
    variant:
      props.draft.layoutKind === "textarea"
      || props.draft.layoutKind === "code"
      || props.draft.layoutKind === "markdown"
      || props.draft.layoutKind === "dna"
      || props.draft.layoutKind === "asset"
      || props.draft.layoutKind === "service"
        ? "panel"
        : "inline",
    density: "comfortable",
    align: "stretch",
  },
  appearance: {
    accentColor: null,
    icon: null,
    badge: null,
  },
  behavior: {
    allowManualInput: !props.draft.readonlyBehavior,
    allowCopy: true,
    liveValue: false,
  },
}))
</script>

<template>
  <div class="preview-stack">
    <NCard title="Live Preview" size="large">
      <template #header-extra>
        <NTag size="small" round :type="readOnly ? 'warning' : 'default'">
          {{ draft.layoutKind }}
        </NTag>
      </template>

      <VarCardPreviewSurface
        :manifest="previewManifest"
        :readonly="!!draft.readonlyBehavior"
      />
    </NCard>

    <NCard title="Compiled Snapshot" size="small">
      <NEmpty v-if="!formattedDemoValue" description="No demo value configured yet." />
      <pre v-else class="compiled-snapshot-pre">{{ formattedDemoValue }}</pre>
    </NCard>
  </div>
</template>

<style scoped>
.preview-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.compiled-snapshot-pre {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  background: var(--aimd-bg-page);
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--aimd-text-primary);
}
</style>

<script setup lang="ts">
import { computed } from "vue"
import { NCard, NCode, NEmpty, NTag } from "naive-ui"
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

      <div class="preview-surface">
        <label class="preview-label">{{ draft.fieldLabel || draft.title || "Untitled card" }}</label>

        <div v-if="draft.layoutKind === 'boolean'" class="preview-toggle">
          <span>{{ parsedDemoValue ? "Enabled" : "Disabled" }}</span>
        </div>

        <div v-else-if="draft.layoutKind === 'asset'" class="preview-asset">
          <strong>{{ parsedDemoValue?.name || "No asset configured" }}</strong>
          <span>{{ draft.assetPreviewMode || "auto" }}</span>
          <code>{{ draft.assetAccept || "any file" }}</code>
        </div>

        <div v-else-if="draft.layoutKind === 'service'" class="preview-asset">
          <strong>{{ draft.serviceProfileId || draft.serviceHost || "SSH service" }}</strong>
          <span>{{ draft.serviceUsername || "user" }}@{{ draft.serviceHost || "host" }}:{{ draft.servicePort || "22" }}</span>
          <code>{{ draft.serviceRemotePath || "/" }}</code>
        </div>

        <select v-else-if="draft.layoutKind === 'select'" class="preview-input" disabled>
          <option v-for="option in options" :key="option.value" :selected="option.value === parsedDemoValue">
            {{ option.label }}
          </option>
        </select>

        <textarea
          v-else-if="draft.layoutKind === 'textarea' || draft.layoutKind === 'code'"
          class="preview-input preview-textarea"
          :value="formattedDemoValue"
          disabled
        />

        <input
          v-else
          class="preview-input"
          :value="formattedDemoValue"
          :placeholder="draft.placeholder || draft.emptyState || ''"
          disabled
        />

        <p v-if="draft.helpText" class="preview-help">{{ draft.helpText }}</p>
        <p v-if="draft.validationHint" class="preview-validation">{{ draft.validationHint }}</p>
      </div>
    </NCard>

    <NCard title="Compiled Snapshot" size="small">
      <NEmpty v-if="!formattedDemoValue" description="No demo value configured yet." />
      <NCode v-else :code="formattedDemoValue" language="json" word-wrap />
    </NCard>
  </div>
</template>

<style scoped>
.preview-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-surface {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 42%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.92));
}

.preview-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0f172a;
}

.preview-input {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  padding: 11px 14px;
  color: #0f172a;
}

.preview-textarea {
  min-height: 120px;
  resize: none;
}

.preview-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  font-weight: 600;
}

.preview-asset {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 88px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(14, 165, 233, 0.08);
  color: #0f172a;
}

.preview-asset span,
.preview-asset code {
  font-size: 12px;
  color: #475569;
}

.preview-help,
.preview-validation {
  margin: 0;
  font-size: 12px;
}

.preview-help {
  color: #475569;
}

.preview-validation {
  color: #b45309;
}
</style>

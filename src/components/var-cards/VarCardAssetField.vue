<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import type { VarCardAssetPreviewMode, VarCardAssetValue } from "@/features/var-cards/types"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  placeholder?: string
  accept?: string | null
  previewMode?: VarCardAssetPreviewMode | null
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: VarCardAssetValue | null): void
  (e: "blur"): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const localObjectUrl = ref<string | null>(null)

function guessNameFromSrc(src: string): string {
  const normalized = src.split("?")[0]?.split("#")[0] ?? src
  const segment = normalized.split("/").filter(Boolean).pop()
  return segment || "asset"
}

function guessMimeType(src: string): string | null {
  const normalized = src.toLowerCase()

  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/.test(normalized)) return "image/*"
  if (/\.(mp4|mov|m4v|webm|ogv)$/.test(normalized)) return "video/*"
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(normalized)) return "audio/*"
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/.test(normalized)) return "application/octet-stream"
  if (/\.(pdb|cif|mmcif|mol|mol2|sdf|stl|obj|glb|gltf)$/.test(normalized)) return "model/*"

  return null
}

function normalizeAssetValue(value: unknown): VarCardAssetValue | null {
  if (!value) return null

  if (typeof value === "string") {
    const src = value.trim()
    if (!src) return null

    return {
      src,
      name: guessNameFromSrc(src),
      mimeType: guessMimeType(src),
      size: null,
      lastModified: null,
    }
  }

  if (typeof value !== "object") return null

  const candidate = value as Record<string, unknown>
  const srcValue = candidate.src ?? candidate.url ?? candidate.path ?? candidate.href
  const src = typeof srcValue === "string" ? srcValue.trim() : ""

  if (!src) return null

  const nameValue = candidate.name ?? candidate.fileName ?? candidate.filename
  const mimeTypeValue = candidate.mimeType ?? candidate.type
  const sizeValue = candidate.size
  const lastModifiedValue = candidate.lastModified

  return {
    src,
    name: typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : guessNameFromSrc(src),
    mimeType:
      typeof mimeTypeValue === "string" && mimeTypeValue.trim()
        ? mimeTypeValue.trim()
        : guessMimeType(src),
    size: typeof sizeValue === "number" ? sizeValue : null,
    lastModified: typeof lastModifiedValue === "number" ? lastModifiedValue : null,
  }
}

function revokeLocalObjectUrl() {
  if (!localObjectUrl.value) return
  URL.revokeObjectURL(localObjectUrl.value)
  localObjectUrl.value = null
}

const asset = computed(() => normalizeAssetValue(props.modelValue))
const disabled = computed(() => Boolean(props.disabled))
const placeholderText = computed(() => props.placeholder || "")
const acceptText = computed(() => props.accept || "")

watch(
  () => asset.value?.src ?? null,
  (nextSrc) => {
    if (localObjectUrl.value && nextSrc !== localObjectUrl.value) {
      revokeLocalObjectUrl()
    }
  },
)

onBeforeUnmount(() => {
  revokeLocalObjectUrl()
})

const resolvedPreviewMode = computed<VarCardAssetPreviewMode>(() => {
  if (props.previewMode && props.previewMode !== "auto") {
    return props.previewMode
  }

  const mimeType = asset.value?.mimeType?.toLowerCase() ?? ""
  const src = asset.value?.src?.toLowerCase() ?? ""

  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("model/")) return "model3d"
  if (mimeType.includes("pdf")) return "document"
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/.test(src)) return "image"
  if (/\.(mp4|mov|m4v|webm|ogv)$/.test(src)) return "video"
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(src)) return "audio"
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/.test(src)) return "document"
  if (/\.(pdb|cif|mmcif|mol|mol2|sdf|stl|obj|glb|gltf)$/.test(src)) return "model3d"

  return "download"
})

function triggerPicker() {
  if (disabled.value) return
  fileInput.value?.click()
}

function emitBlur() {
  emit("blur")
}

function clearValue() {
  revokeLocalObjectUrl()
  emit("update:modelValue", null)
  emitBlur()
  if (fileInput.value) {
    fileInput.value.value = ""
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  revokeLocalObjectUrl()

  const src = URL.createObjectURL(file)
  localObjectUrl.value = src

  emit("update:modelValue", {
    src,
    name: file.name,
    mimeType: file.type || guessMimeType(file.name),
    size: file.size,
    lastModified: file.lastModified,
  })
  emitBlur()
}
</script>

<template>
  <div class="asset-field">
    <div class="asset-field__toolbar">
      <div class="asset-field__meta">
        <strong>{{ asset?.name || placeholderText || "No asset selected" }}</strong>
        <span v-if="asset?.mimeType">{{ asset.mimeType }}</span>
      </div>

      <div v-if="!disabled" class="asset-field__actions">
        <button type="button" class="asset-field__button" @click="triggerPicker">
          {{ asset ? "Replace file" : "Choose file" }}
        </button>
        <button
          v-if="asset"
          type="button"
          class="asset-field__button asset-field__button--ghost"
          @click="clearValue"
        >
          Clear
        </button>
      </div>
    </div>

      <input
        ref="fileInput"
        class="asset-field__input"
        type="file"
        :accept="acceptText || undefined"
        :disabled="disabled"
        @change="handleFileChange"
        @blur="emitBlur"
    />

    <div class="asset-field__canvas">
      <template v-if="asset?.src">
        <img
          v-if="resolvedPreviewMode === 'image'"
          class="asset-field__media asset-field__media--image"
          :src="asset.src"
          :alt="asset.name || 'Image asset preview'"
        />

        <video
          v-else-if="resolvedPreviewMode === 'video'"
          class="asset-field__media asset-field__media--video"
          :src="asset.src"
          controls
          preload="metadata"
        />

        <audio
          v-else-if="resolvedPreviewMode === 'audio'"
          class="asset-field__media asset-field__media--audio"
          :src="asset.src"
          controls
          preload="metadata"
        />

        <iframe
          v-else-if="resolvedPreviewMode === 'document'"
          class="asset-field__media asset-field__media--document"
          :src="asset.src"
          title="Document preview"
        />

        <div v-else-if="resolvedPreviewMode === 'model3d'" class="asset-field__placeholder">
          <strong>3D asset</strong>
          <span>{{ asset.name || "Model file" }}</span>
          <code>{{ asset.src }}</code>
        </div>

        <div v-else class="asset-field__placeholder">
          <strong>Downloadable asset</strong>
          <span>{{ asset.name || "Attached file" }}</span>
          <a class="asset-field__link" :href="asset.src" target="_blank" rel="noreferrer">
            Open asset
          </a>
        </div>
      </template>

      <div v-else class="asset-field__placeholder">
        <strong>No preview yet</strong>
        <span>{{ acceptText || "Any file type" }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asset-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-field__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.asset-field__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.asset-field__meta strong {
  font-size: 13px;
  color: var(--aimd-text-primary);
}

.asset-field__meta span {
  font-size: 11px;
  color: var(--aimd-text-secondary);
  word-break: break-word;
}

.asset-field__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.asset-field__button {
  min-height: 34px;
  border: 1px solid rgba(37, 99, 235, 0.24);
  border-radius: 999px;
  padding: 0 12px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font: inherit;
  cursor: pointer;
}

.asset-field__button--ghost {
  border-color: rgba(15, 23, 42, 0.14);
  background: rgba(15, 23, 42, 0.04);
  color: var(--aimd-text-secondary);
}

.asset-field__input {
  display: none;
}

.asset-field__canvas {
  overflow: hidden;
  border: 1px dashed rgba(15, 23, 42, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  min-height: 180px;
}

.asset-field__media {
  display: block;
  width: 100%;
  border: 0;
}

.asset-field__media--image,
.asset-field__media--video,
.asset-field__media--document {
  min-height: 180px;
  max-height: 420px;
  object-fit: contain;
  background: rgba(15, 23, 42, 0.04);
}

.asset-field__media--audio {
  padding: 20px;
}

.asset-field__placeholder {
  min-height: 180px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  color: var(--aimd-text-secondary);
}

.asset-field__placeholder strong {
  color: var(--aimd-text-primary);
}

.asset-field__placeholder code {
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
}

.asset-field__link {
  color: #1d4ed8;
  text-decoration: none;
}
</style>

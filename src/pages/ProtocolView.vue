<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useI18n } from "vue-i18n"
import { NButton, NSpace, NSelect, NSpin, NEmpty, NDrawer, NDrawerContent, useMessage } from "naive-ui"
import { AimdRecorder, createEmptyProtocolRecordData } from "@airalogy/aimd-recorder"
import "@airalogy/aimd-recorder/styles"
import type { AimdProtocolRecordData } from "@airalogy/aimd-recorder"
import { useWorkspaceStore } from "@/stores/workspace"
import ProtocolNavigatorRail from "@/components/ProtocolNavigatorRail.vue"
import { useProtocolNavigator } from "@/composables/useProtocolNavigator"
import { useVarCardRecorder } from "@/composables/useVarCardRecorder"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { dirname } from "@tauri-apps/api/path"
import { useMediaQuery } from "@vueuse/core"
import { isAbsoluteFilesystemPath, resolveProtocolFilePath, resolveWorkspacePath } from "@/utils/workspacePaths"

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

type Status = "loading" | "no-workspace" | "no-protocol" | "no-files" | "ready" | "error"

const status = ref<Status>("loading")
const files = ref<string[]>([])
const selectedFile = ref<string | null>(null)
const content = ref("")
const record = ref<AimdProtocolRecordData>(createEmptyProtocolRecordData())
const currentFileDirectory = ref<string | null>(null)
const errorMessage = ref("")
const scrollContainerRef = ref<HTMLElement | null>(null)
const protocolDocumentRef = ref<HTMLElement | null>(null)
const { typePlugins: recorderTypePlugins } = useVarCardRecorder()
const isMobile = useMediaQuery("(max-width: 768px)")
const tocDrawerOpen = ref(false)

const protocolId = computed(() => route.query.id as string | undefined)

const protocol = computed(() =>
  workspaceStore.current?.protocols.find((p) => p.id === protocolId.value) ?? null
)

const fileSelectOptions = computed(() =>
  files.value.map((f) => ({ label: f, value: f }))
)

function isExternalResource(path: string): boolean {
  if (isAbsoluteFilesystemPath(path)) {
    return false
  }

  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)
}

function toFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/")

  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`
  }

  if (normalized.startsWith("//")) {
    return `file:${encodeURI(normalized)}`
  }

  if (normalized.startsWith("/")) {
    return `file://${encodeURI(normalized)}`
  }

  return `file:///${encodeURI(normalized)}`
}

function resolveRelativeFilesystemPath(baseDir: string, relativePath: string): string {
  const preferBackslash = baseDir.includes("\\")
  const separator = preferBackslash ? "\\" : "/"
  const baseUrl = new URL(
    `${toFileUrl(baseDir).replace(/[\\/]+$/, "")}/`,
  )
  const resolvedUrl = new URL(relativePath.replace(/\\/g, "/"), baseUrl)
  const decodedPath = decodeURIComponent(resolvedUrl.pathname)

  if (/^\/[A-Za-z]:\//.test(decodedPath)) {
    const windowsPath = decodedPath.slice(1)
    return preferBackslash ? windowsPath.replace(/\//g, "\\") : windowsPath
  }

  return preferBackslash ? decodedPath.replace(/\//g, separator) : decodedPath
}

function resolveWorkspaceAsset(src: string): string | null {
  const trimmed = src.trim()
  if (!trimmed) {
    return null
  }

  if (isExternalResource(trimmed)) {
    return trimmed
  }

  if (isAbsoluteFilesystemPath(trimmed)) {
    return convertFileSrc(trimmed)
  }

  if (!currentFileDirectory.value) {
    return trimmed
  }

  return convertFileSrc(resolveRelativeFilesystemPath(currentFileDirectory.value, trimmed))
}

const navigatorEnabled = computed(() => status.value === "ready")
const {
  anchors,
  activeAnchorId,
  hoveredAnchorId,
  scrollToAnchor,
  setHoveredAnchor,
  clearHoveredAnchor,
} = useProtocolNavigator({
  scrollContainerRef,
  contentRootRef: protocolDocumentRef,
  content,
  enabled: navigatorEnabled,
})

async function load() {
  if (!workspaceStore.current) {
    status.value = "no-workspace"
    return
  }
  if (!protocol.value) {
    status.value = "no-protocol"
    return
  }

  status.value = "loading"
  errorMessage.value = ""

  try {
    if (protocol.value.type === "file") {
      files.value = [protocol.value.path.split(/[\\/]/).pop()!]
      await openFile(files.value[0])
      status.value = "ready"
      return
    }

    // folder protocol — list .aimd files inside
    const entries: { name: string; is_dir: boolean }[] = await invoke("list_files", {
      dir: resolveWorkspacePath(workspaceStore.current.path, protocol.value.path),
    })
    files.value = entries.filter((f) => !f.is_dir && f.name.endsWith(".aimd")).map((f) => f.name)

    if (files.value.length === 0) {
      status.value = "no-files"
      return
    }

    const target = files.value[0]
    await openFile(target)
    status.value = "ready"
  } catch (error) {
    errorMessage.value = String(error)
    status.value = "error"
    message.error(errorMessage.value)
  }
}

async function openFile(filename: string) {
  if (!protocol.value) return
  const fullPath = resolveProtocolFilePath(workspaceStore.current?.path, protocol.value, filename)
  content.value = await invoke<string>("read_file", { path: fullPath })
  currentFileDirectory.value = await dirname(fullPath)
  selectedFile.value = filename
}

async function handleFileSwitch(filename: string) {
  await openFile(filename)
}

function openEditor() {
  if (!protocolId.value) return
  router.push({ path: "/editor", query: { id: protocolId.value } })
}

onMounted(load)
watch(protocolId, (newId, oldId) => { if (newId !== oldId) load() })
</script>

<template>
  <div class="protocol-page">
    <div v-if="status === 'loading'" class="center-state">
      <NSpin size="large" />
    </div>

    <div v-else-if="status === 'no-workspace' || status === 'no-protocol'" class="center-state">
      <NEmpty :description="t('editor.noProject')">
        <template #extra>
          <NButton type="primary" @click="router.push('/projects')">
            {{ t("nav.projects") }}
          </NButton>
        </template>
      </NEmpty>
    </div>

    <div v-else-if="status === 'error'" class="center-state">
      <NEmpty :description="errorMessage || t('editor.saveFailed')">
        <template #extra>
          <NSpace :size="8">
            <NButton @click="router.push('/projects')">
              {{ t("nav.projects") }}
            </NButton>
            <NButton type="primary" @click="load">
              Retry
            </NButton>
          </NSpace>
        </template>
      </NEmpty>
    </div>

    <template v-else-if="status === 'no-files'">
      <header class="protocol-header">
        <NSpace align="center" :size="8">
          <NButton quaternary circle @click="router.push('/projects')">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </template>
          </NButton>
          <h2 class="protocol-title">{{ protocol?.title ?? protocol?.name }}</h2>
        </NSpace>
        <NButton type="primary" @click="openEditor">{{ t("editor.title") }}</NButton>
      </header>
      <div class="center-state">
        <NEmpty :description="t('editor.noFiles')">
          <template #extra>
            <NButton type="primary" @click="openEditor">{{ t("editor.newFile") }}</NButton>
          </template>
        </NEmpty>
      </div>
    </template>

    <template v-else>
      <header class="protocol-header">
        <NSpace align="center" :size="8">
          <NButton quaternary circle @click="router.push('/projects')">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </template>
          </NButton>
          <h2 class="protocol-title">{{ protocol?.title ?? protocol?.name }}</h2>
          <template v-if="files.length > 1">
            <span class="sep">/</span>
            <NSelect
              :value="selectedFile"
              :options="fileSelectOptions"
              size="small"
              style="width: 200px"
              @update:value="handleFileSwitch"
            />
          </template>
        </NSpace>
        <NSpace align="center" :size="8">
          <NButton
            v-if="isMobile && anchors.length > 0"
            quaternary
            circle
            aria-label="Table of Contents"
            @click="tocDrawerOpen = true"
          >
            <template #icon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="15" y2="12"/>
                <line x1="3" y1="18" x2="18" y2="18"/>
              </svg>
            </template>
          </NButton>
          <NButton @click="openEditor">{{ t("editor.title") }}</NButton>
        </NSpace>
      </header>

      <main ref="scrollContainerRef" class="protocol-content">
        <div class="protocol-layout">
          <div ref="protocolDocumentRef" class="protocol-document">
            <AimdRecorder
              v-model="record"
              :content="content"
              :resolve-file="resolveWorkspaceAsset"
              :type-plugins="recorderTypePlugins"
              locale="en-US"
            />
          </div>
          <ProtocolNavigatorRail
            v-if="anchors.length > 0 && !isMobile"
            class="protocol-navigator"
            :anchors="anchors"
            :active-anchor-id="activeAnchorId"
            :hovered-anchor-id="hoveredAnchorId"
            @anchor-click="scrollToAnchor"
            @anchor-hover="setHoveredAnchor"
            @anchor-leave="clearHoveredAnchor"
          />
        </div>
      </main>

      <NDrawer
        v-model:show="tocDrawerOpen"
        placement="bottom"
        :height="400"
        :trap-focus="true"
        :close-on-esc="true"
      >
        <NDrawerContent title="Table of Contents" :native-scrollbar="false">
          <div class="toc-sheet">
            <button
              v-for="anchor in anchors"
              :key="'toc-' + anchor.id"
              class="toc-sheet__item"
              :class="[
                `toc-sheet__item--level-${anchor.level}`,
                { 'toc-sheet__item--active': anchor.id === activeAnchorId },
              ]"
              type="button"
              @click="scrollToAnchor(anchor.id); tocDrawerOpen = false"
            >
              <span
                v-if="anchor.status !== 'default'"
                class="toc-sheet__status"
                :class="`toc-sheet__status--${anchor.status}`"
              />
              <span class="toc-sheet__text">{{ anchor.title }}</span>
              <span class="toc-sheet__kind">{{ anchor.kind }}</span>
            </button>
          </div>
        </NDrawerContent>
      </NDrawer>
    </template>
  </div>
</template>

<style scoped>
.protocol-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--aimd-bg-page);
}

.center-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.protocol-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--aimd-border-color);
  flex-shrink: 0;
}

.protocol-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--aimd-text-primary);
}

.sep {
  color: var(--aimd-text-secondary);
}

.protocol-content {
  flex: 1;
  overflow: auto;
  padding: 16px 22px 24px;
}

.protocol-layout {
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1040px) auto;
  justify-content: center;
  align-items: start;
  column-gap: 14px;
}

.protocol-document {
  min-width: 0;
}

.protocol-navigator {
  position: sticky;
  top: 16px;
  align-self: start;
}

@media (max-width: 768px) {
  .protocol-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .protocol-navigator {
    display: none;
  }
}

/* ── Bottom sheet TOC ── */

.toc-sheet {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toc-sheet__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  font-size: 14px;
  line-height: 1.4;
  color: var(--aimd-text-primary);
  transition: background-color 120ms ease;
}

.toc-sheet__item:hover,
.toc-sheet__item:focus-visible {
  background: rgba(26, 115, 232, 0.06);
  outline: none;
}

.toc-sheet__item--active {
  color: var(--aimd-color-primary);
  font-weight: 600;
}

.toc-sheet__item--level-2 { padding-left: 24px; }
.toc-sheet__item--level-3 { padding-left: 40px; }

.toc-sheet__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.toc-sheet__status--completed { background: #2f7d32; }
.toc-sheet__status--warning   { background: #b26a00; }
.toc-sheet__status--error     { background: #b42318; }

.toc-sheet__text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-sheet__kind {
  font-size: 11px;
  color: var(--aimd-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
</style>

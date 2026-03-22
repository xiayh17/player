<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useI18n } from "vue-i18n"
import { NButton, NSpace, NSelect, NSpin, NEmpty, NDrawer, NDrawerContent, useMessage } from "naive-ui"
import { AimdRecorder } from "@airalogy/aimd-recorder"
import "@airalogy/aimd-recorder/styles"
import { useWorkspaceStore } from "@/stores/workspace"
import ProtocolNavigatorRail from "@/components/ProtocolNavigatorRail.vue"
import { useProtocolNavigator } from "@/composables/useProtocolNavigator"
import { useVarCardRecorder } from "@/composables/useVarCardRecorder"
import { useMediaQuery } from "@vueuse/core"
import { useProtocolStepLiveActivity } from "@/composables/useProtocolStepLiveActivity"
import { useProtocolSession } from "@/shared/features/protocol/useProtocolSession"
import { tauriProtocolFileGateway } from "@/shared/platform/protocolFileGateway"

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

type Status = "loading" | "no-workspace" | "no-protocol" | "no-files" | "ready" | "error"

const scrollContainerRef = ref<HTMLElement | null>(null)
const protocolDocumentRef = ref<HTMLElement | null>(null)
const { typePlugins: recorderTypePlugins } = useVarCardRecorder()
const isMobile = useMediaQuery("(max-width: 768px)")
const tocDrawerOpen = ref(false)

const protocolId = computed(() => route.query.id as string | undefined)

const protocol = computed(() =>
  workspaceStore.current?.protocols.find((p) => p.id === protocolId.value) ?? null
)

const protocolSession = useProtocolSession({
  workspacePath: computed(() => workspaceStore.current?.path),
  protocol,
  gateway: tauriProtocolFileGateway,
  onLoadStart: (id) => {
    message.info(`Protocol load start: ${String(id ?? "missing")}`)
  },
  onNoWorkspace: () => {
    message.warning("Protocol load aborted: no workspace")
  },
  onNoProtocol: (id) => {
    message.warning(`Protocol not found for id: ${String(id ?? "missing")}`)
  },
  onReady: (id) => {
    message.success(`Protocol ready: ${id}`)
  },
  onError: (value) => {
    message.error(value)
  },
})

const status = computed<Status>(() => protocolSession.status.value)
const files = computed(() => protocolSession.files.value)
const selectedFile = computed(() => protocolSession.selectedFile.value)
const fileSelectOptions = computed(() => protocolSession.fileSelectOptions.value)
const content = computed(() => protocolSession.content.value)
const record = computed({
  get: () => protocolSession.record.value,
  set: (value) => {
    protocolSession.record.value = value
  },
})
const errorMessage = computed(() => protocolSession.errorMessage.value)

const navigatorEnabled = computed(() => protocolSession.status.value === "ready")
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

useProtocolStepLiveActivity({
  enabled: navigatorEnabled,
  protocolTitle: computed(() => protocol.value?.title ?? protocol.value?.name),
  anchors,
  activeAnchorId,
  record,
  locale: computed(() => "en-US"),
})

async function handleFileSwitch(filename: string) {
  await protocolSession.handleFileSwitch(filename)
}

function openEditor() {
  if (!protocolId.value) return
  router.push({ path: "/editor", query: { id: protocolId.value } })
}

onMounted(protocolSession.load)
onMounted(() => {
  message.info(`Protocol route mounted: ${String(protocolId.value ?? "missing")}`)
})

watch(protocolId, (nextId) => {
  message.info(`Protocol route changed: ${String(nextId ?? "missing")}`)
})

watch(protocolId, (newId, oldId) => {
  if (newId !== oldId) {
    protocolSession.resetRecord()
    void protocolSession.load()
  }
})
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
            <NButton type="primary" @click="protocolSession.load">
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
              :resolve-file="protocolSession.resolveWorkspaceAsset"
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

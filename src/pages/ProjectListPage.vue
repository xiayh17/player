<script setup lang="ts">
import { onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { NButton, NEmpty, NInput, NSpin, useMessage } from "naive-ui"
import { open } from "@tauri-apps/plugin-dialog"
import { useWorkspaceStore } from "@/stores/workspace"
import { useProjectList } from "@/shared/features/workspace/useProjectList"
import type { ProtocolEntry } from "@/shared/domain/workspace/workspaceTypes"

const { t } = useI18n()
const workspaceStore = useWorkspaceStore()
const message = useMessage()
const {
  searchQuery,
  protocols,
  initialize,
  openWorkspace,
  openProtocol,
} = useProjectList()

onMounted(async () => {
  await initialize()
})

async function openWorkspaceDialog() {
  const selected = await open({ directory: true, multiple: false })
  if (!selected) return
  const path = typeof selected === "string" ? selected : selected[0]
  await openWorkspace(path)
}

function handleProtocolActivate(event: Event, protocol: ProtocolEntry) {
  event.preventDefault()
  event.stopPropagation()
  message.info(`Opening protocol: ${protocol.id}`)
  void openProtocol(protocol)
}

function handleProtocolKeydown(event: KeyboardEvent, protocol: ProtocolEntry) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    void openProtocol(protocol)
  }
}
</script>

<template>
  <div class="projects-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ workspaceStore.current?.name ?? t("nav.projects") }}</h1>
        <p v-if="workspaceStore.current" class="workspace-path">{{ workspaceStore.current.path }}</p>
      </div>
      <NButton @click="openWorkspaceDialog">{{ t("welcome.openProject") }}</NButton>
    </header>

    <div v-if="workspaceStore.current" class="search-bar">
      <NInput v-model:value="searchQuery" :placeholder="t('projects.search')" clearable />
    </div>

    <main class="projects-content">
      <NSpin v-if="workspaceStore.loading" />

      <NEmpty v-else-if="!workspaceStore.current" :description="t('projects.noProjects')">
        <template #extra>
          <NButton type="primary" @click="openWorkspaceDialog">
            {{ t("welcome.openProject") }}
          </NButton>
        </template>
      </NEmpty>

      <NEmpty v-else-if="protocols.length === 0" :description="t('projects.noProjects')" />

      <div v-else class="projects-grid">
        <div
          v-for="protocol in protocols"
          :key="protocol.id"
          class="project-card"
          role="button"
          tabindex="0"
          @click="handleProtocolActivate($event, protocol)"
          @pointerup="handleProtocolActivate($event, protocol)"
          @touchend="handleProtocolActivate($event, protocol)"
          @keydown="handleProtocolKeydown($event, protocol)"
        >
          <div class="project-card-header">
            <span class="protocol-type-icon">{{ protocol.type === "folder" ? "📁" : "📄" }}</span>
            <h3 class="project-name">{{ protocol.title ?? protocol.name }}</h3>
          </div>
          <p class="project-description">{{ protocol.path }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.projects-page {
  min-height: 100vh;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.workspace-path {
  font-size: 12px;
  color: var(--aimd-text-secondary);
  margin: 0;
}

.search-bar {
  max-width: 400px;
  margin-bottom: 24px;
}

.projects-content {
  background: var(--aimd-bg-card);
  border-radius: 12px;
  padding: 24px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.project-card {
  display: block;
  width: 100%;
  background: var(--aimd-bg-page);
  border: 1px solid var(--aimd-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  transition: all 0.2s ease;
}

.project-card:hover {
  border-color: var(--aimd-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.project-card:focus-visible {
  outline: 2px solid var(--aimd-color-primary);
  outline-offset: 2px;
}

.project-card:active {
  transform: scale(0.995);
}

.project-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.protocol-type-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--aimd-text-primary);
}

.project-description {
  font-size: 12px;
  color: var(--aimd-text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

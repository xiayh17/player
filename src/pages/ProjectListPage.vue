<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { NButton, NEmpty, NInput, NSpin } from "naive-ui"
import { open } from "@tauri-apps/plugin-dialog"
import { useWorkspaceStore } from "@/stores/workspace"
import type { ProtocolEntry } from "@/stores/workspace"

const router = useRouter()
const { t } = useI18n()
const workspaceStore = useWorkspaceStore()

const searchQuery = ref("")

onMounted(async () => {
  if (!workspaceStore.current) {
    await workspaceStore.fetchRecentWorkspaces()
  }
})

const protocols = computed<ProtocolEntry[]>(() => {
  const list = workspaceStore.current?.protocols ?? []
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter((p) =>
    p.name.toLowerCase().includes(q)
    || (p.title ?? "").toLowerCase().includes(q)
    || p.path.toLowerCase().includes(q),
  )
})

async function openWorkspaceDialog() {
  const selected = await open({ directory: true, multiple: false })
  if (!selected) return
  const path = typeof selected === "string" ? selected : selected[0]
  await workspaceStore.openWorkspace(path)
}

function openProtocol(protocol: ProtocolEntry) {
  workspaceStore.setLastOpenedProtocol(protocol.id)
  router.push(`/protocol?id=${encodeURIComponent(protocol.id)}`)
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
          @click="openProtocol(protocol)"
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
  background: var(--aimd-bg-page);
  border: 1px solid var(--aimd-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-card:hover {
  border-color: var(--aimd-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

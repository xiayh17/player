<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { NButton, NSpace, NEmpty, NSpin } from "naive-ui"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { useWorkspaceStore } from "@/stores/workspace"
import type { RecentWorkspace } from "@/stores/workspace"

const router = useRouter()
const { t } = useI18n()
const workspaceStore = useWorkspaceStore()

const recentWorkspaces = ref<RecentWorkspace[]>([])
const loading = ref(true)

onMounted(async () => {
  await workspaceStore.fetchRecentWorkspaces()
  recentWorkspaces.value = workspaceStore.recentWorkspaces.slice(0, 6)
  loading.value = false

  const isFirst = await invoke<boolean>("check_first_launch")
  if (isFirst && recentWorkspaces.value.length === 0) {
    await openExampleWorkspace()
  }
})

async function openExampleWorkspace() {
  try {
    const ws = await invoke("open_example_workspace")
    if (ws) {
      await workspaceStore.fetchRecentWorkspaces()
      router.push("/projects")
    }
  } catch (e) {
    console.error("Failed to open example workspace:", e)
  }
}

async function openWorkspaceDialog() {
  const selected = await open({ directory: true, multiple: false })
  if (!selected) return
  const path = typeof selected === "string" ? selected : selected[0]
  const ws = await workspaceStore.openWorkspace(path)
  if (ws) router.push("/projects")
}

async function openRecent(ws: RecentWorkspace) {
  const info = await workspaceStore.openWorkspace(ws.path)
  if (info) router.push("/projects")
}

async function removeRecent(event: Event, ws: RecentWorkspace) {
  event.stopPropagation()
  await workspaceStore.removeRecentWorkspace(ws.path)
  recentWorkspaces.value = recentWorkspaces.value.filter((w) => w.path !== ws.path)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString()
}
</script>

<template>
  <div class="welcome-page">
    <header class="welcome-header">
      <h1 class="welcome-title">{{ t("welcome.title") }}</h1>
      <p class="welcome-subtitle">{{ t("welcome.subtitle") }}</p>
    </header>

    <main class="welcome-main">
      <NSpace vertical :size="24" class="action-buttons">
        <NButton type="primary" size="large" @click="openWorkspaceDialog">
          {{ t("welcome.openProject") }}
        </NButton>
      </NSpace>

      <section class="recent-files">
        <h2 class="section-title">{{ t("welcome.recentFiles") }}</h2>
        <div v-if="recentWorkspaces.length > 0" class="recent-grid">
          <div
            v-for="ws in recentWorkspaces"
            :key="ws.path"
            class="recent-card"
            @click="openRecent(ws)"
          >
            <div class="recent-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="recent-card-info">
              <h3 class="recent-card-name">{{ ws.name }}</h3>
              <p class="recent-card-date">{{ formatDate(ws.lastOpenedAt) }}</p>
            </div>
            <button
              class="recent-card-remove"
              :aria-label="`Remove ${ws.name}`"
              @click="removeRecent($event, ws)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <NEmpty v-else :description="t('welcome.noRecentFiles')" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.welcome-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 24px;
  background: linear-gradient(135deg, rgba(26, 115, 232, 0.08) 0%, transparent 50%);
}

.welcome-header {
  text-align: center;
  margin-bottom: 48px;
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--aimd-text-primary);
  margin-bottom: 12px;
}

.welcome-subtitle {
  font-size: 18px;
  color: var(--aimd-text-secondary);
}

.welcome-main {
  width: 100%;
  max-width: 600px;
}

.action-buttons {
  display: flex;
  justify-content: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--aimd-text-secondary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--aimd-border-color);
}

.recent-files {
  margin-top: 48px;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.recent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--aimd-bg-card);
  border: 1px solid var(--aimd-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-card:hover {
  border-color: var(--aimd-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recent-card-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--aimd-bg-page);
  border-radius: 8px;
  color: var(--aimd-color-primary);
}

.recent-card-info {
  min-width: 0;
}

.recent-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--aimd-text-primary);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-card-date {
  font-size: 12px;
  color: var(--aimd-text-secondary);
  margin: 0;
}

.recent-card-remove {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--aimd-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease, background-color 120ms ease;
}

.recent-card:hover .recent-card-remove {
  opacity: 1;
}

.recent-card-remove:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--aimd-text-primary);
}
</style>

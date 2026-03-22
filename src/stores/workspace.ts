import { defineStore } from "pinia"
import { ref } from "vue"
import { tauriWorkspaceGateway } from "@/shared/platform/workspaceGateway"
import type { ProtocolEntry, RecentWorkspace, WorkspaceInfo } from "@/shared/domain/workspace/workspaceTypes"

export type { ProtocolEntry, RecentWorkspace, WorkspaceInfo } from "@/shared/domain/workspace/workspaceTypes"

export const useWorkspaceStore = defineStore("workspace", () => {
  const current = ref<WorkspaceInfo | null>(null)
  const recentWorkspaces = ref<RecentWorkspace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function openWorkspace(path: string): Promise<WorkspaceInfo | null> {
    loading.value = true
    error.value = null
    try {
      const info = await tauriWorkspaceGateway.openWorkspace(path)
      current.value = info
      await fetchRecentWorkspaces()
      return info
    } catch (e) {
      error.value = String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function rescan(): Promise<void> {
    if (!current.value) return
    loading.value = true
    try {
      const protocols = await tauriWorkspaceGateway.scanWorkspace(current.value.path)
      current.value = { ...current.value, protocols }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchRecentWorkspaces(): Promise<void> {
    try {
      recentWorkspaces.value = await tauriWorkspaceGateway.getRecentWorkspaces()
    } catch (e) {
      error.value = String(e)
    }
  }

  async function setLastOpenedProtocol(protocolId: string): Promise<void> {
    if (!current.value) return
    try {
      await tauriWorkspaceGateway.setLastOpenedProtocol(current.value.path, protocolId)
      current.value = { ...current.value, lastOpenedProtocol: protocolId }
    } catch (e) {
      error.value = String(e)
    }
  }

  async function removeRecentWorkspace(path: string): Promise<void> {
    try {
      await tauriWorkspaceGateway.removeRecentWorkspace(path)
      recentWorkspaces.value = recentWorkspaces.value.filter((w) => w.path !== path)
      if (current.value?.path === path) {
        current.value = null
      }
    } catch (e) {
      error.value = String(e)
    }
  }

  async function checkFirstLaunch(): Promise<boolean> {
    try {
      return await tauriWorkspaceGateway.checkFirstLaunch()
    } catch (e) {
      error.value = String(e)
      return false
    }
  }

  async function openExampleWorkspace(): Promise<WorkspaceInfo | null> {
    loading.value = true
    error.value = null
    try {
      const info = await tauriWorkspaceGateway.openExampleWorkspace()
      current.value = info
      await fetchRecentWorkspaces()
      return info
    } catch (e) {
      error.value = String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  function setCurrentWorkspace(workspace: WorkspaceInfo | null): void {
    current.value = workspace
  }

  return {
    current,
    recentWorkspaces,
    loading,
    error,
    openWorkspace,
    rescan,
    fetchRecentWorkspaces,
    removeRecentWorkspace,
    setLastOpenedProtocol,
    checkFirstLaunch,
    openExampleWorkspace,
    setCurrentWorkspace,
  }
})

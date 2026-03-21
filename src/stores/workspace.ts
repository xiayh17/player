import { defineStore } from "pinia"
import { ref } from "vue"
import { invoke } from "@tauri-apps/api/core"

export interface ProtocolEntry {
  id: string
  name: string
  title?: string
  type: "file" | "folder"
  path: string
}

export interface WorkspaceInfo {
  path: string
  name: string
  lastOpenedAt: number
  lastOpenedProtocol: string | null
  protocols: ProtocolEntry[]
}

export interface RecentWorkspace {
  path: string
  name: string
  lastOpenedAt: number
  lastOpenedProtocol: string | null
}

export const useWorkspaceStore = defineStore("workspace", () => {
  const current = ref<WorkspaceInfo | null>(null)
  const recentWorkspaces = ref<RecentWorkspace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function openWorkspace(path: string): Promise<WorkspaceInfo | null> {
    loading.value = true
    error.value = null
    try {
      const info = await invoke<WorkspaceInfo>("open_workspace", { path })
      current.value = info
      // refresh recent list
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
      const protocols = await invoke<ProtocolEntry[]>("scan_workspace", {
        path: current.value.path,
      })
      current.value = { ...current.value, protocols }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchRecentWorkspaces(): Promise<void> {
    try {
      recentWorkspaces.value = await invoke<RecentWorkspace[]>("get_recent_workspaces")
    } catch (e) {
      error.value = String(e)
    }
  }

  async function setLastOpenedProtocol(protocolId: string): Promise<void> {
    if (!current.value) return
    try {
      await invoke("set_last_opened_protocol", {
        workspacePath: current.value.path,
        protocolId,
      })
      current.value = { ...current.value, lastOpenedProtocol: protocolId }
    } catch (e) {
      error.value = String(e)
    }
  }

  async function removeRecentWorkspace(path: string): Promise<void> {
    try {
      await invoke("remove_recent_workspace", { path })
      recentWorkspaces.value = recentWorkspaces.value.filter((w) => w.path !== path)
      if (current.value?.path === path) {
        current.value = null
      }
    } catch (e) {
      error.value = String(e)
    }
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
  }
})

import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { useWorkspaceStore } from "@/stores/workspace"
import type { WorkspaceInfo } from "@/shared/domain/workspace/workspaceTypes"

export function useWelcomeWorkspace() {
  const router = useRouter()
  const workspaceStore = useWorkspaceStore()
  const loading = ref(true)
  const recentWorkspaces = computed(() => workspaceStore.recentWorkspaces.slice(0, 6))

  async function initialize(): Promise<WorkspaceInfo | null> {
    await workspaceStore.fetchRecentWorkspaces()
    loading.value = false

    const isFirst = await workspaceStore.checkFirstLaunch()
    if (!isFirst || recentWorkspaces.value.length > 0) {
      return null
    }

    return openExampleWorkspace()
  }

  async function openExampleWorkspace(): Promise<WorkspaceInfo | null> {
    const workspace = await workspaceStore.openExampleWorkspace()
    if (!workspace) return null

    await router.push("/projects")
    return workspace
  }

  async function openWorkspace(path: string): Promise<WorkspaceInfo | null> {
    const workspace = await workspaceStore.openWorkspace(path)
    if (workspace) {
      await router.push("/projects")
    }
    return workspace
  }

  async function openRecentWorkspace(path: string): Promise<WorkspaceInfo | null> {
    return openWorkspace(path)
  }

  async function removeRecentWorkspace(path: string): Promise<void> {
    await workspaceStore.removeRecentWorkspace(path)
  }

  return {
    loading,
    recentWorkspaces,
    initialize,
    openExampleWorkspace,
    openWorkspace,
    openRecentWorkspace,
    removeRecentWorkspace,
  }
}

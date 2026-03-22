import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { useWorkspaceStore } from "@/stores/workspace"
import { filterProtocols } from "@/shared/domain/workspace/filterProtocols"
import type { ProtocolEntry, WorkspaceInfo } from "@/shared/domain/workspace/workspaceTypes"

export function useProjectList() {
  const router = useRouter()
  const workspaceStore = useWorkspaceStore()
  const searchQuery = ref("")

  const protocols = computed<ProtocolEntry[]>(() =>
    filterProtocols(workspaceStore.current?.protocols ?? [], searchQuery.value),
  )

  async function initialize(): Promise<void> {
    if (!workspaceStore.current) {
      await workspaceStore.fetchRecentWorkspaces()
    }
  }

  async function openWorkspace(path: string): Promise<WorkspaceInfo | null> {
    return workspaceStore.openWorkspace(path)
  }

  async function openProtocol(protocol: ProtocolEntry): Promise<void> {
    await workspaceStore.setLastOpenedProtocol(protocol.id)
    await router.push({
      path: "/protocol",
      query: { id: protocol.id },
    })
  }

  return {
    searchQuery,
    protocols,
    initialize,
    openWorkspace,
    openProtocol,
  }
}

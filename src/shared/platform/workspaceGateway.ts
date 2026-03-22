import { invoke } from "@tauri-apps/api/core"
import type { ProtocolEntry, RecentWorkspace, WorkspaceInfo } from "@/shared/domain/workspace/workspaceTypes"

export interface WorkspaceGateway {
  openWorkspace(path: string): Promise<WorkspaceInfo>
  scanWorkspace(path: string): Promise<ProtocolEntry[]>
  getRecentWorkspaces(): Promise<RecentWorkspace[]>
  setLastOpenedProtocol(workspacePath: string, protocolId: string): Promise<void>
  removeRecentWorkspace(path: string): Promise<void>
  checkFirstLaunch(): Promise<boolean>
  openExampleWorkspace(): Promise<WorkspaceInfo | null>
}

export const tauriWorkspaceGateway: WorkspaceGateway = {
  openWorkspace(path) {
    return invoke<WorkspaceInfo>("open_workspace", { path })
  },
  scanWorkspace(path) {
    return invoke<ProtocolEntry[]>("scan_workspace", { path })
  },
  getRecentWorkspaces() {
    return invoke<RecentWorkspace[]>("get_recent_workspaces")
  },
  setLastOpenedProtocol(workspacePath, protocolId) {
    return invoke("set_last_opened_protocol", {
      workspacePath,
      protocolId,
    })
  },
  removeRecentWorkspace(path) {
    return invoke("remove_recent_workspace", { path })
  },
  checkFirstLaunch() {
    return invoke<boolean>("check_first_launch")
  },
  openExampleWorkspace() {
    return invoke<WorkspaceInfo | null>("open_example_workspace")
  },
}

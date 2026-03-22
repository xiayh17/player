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

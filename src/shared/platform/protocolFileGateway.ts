import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { dirname } from "@tauri-apps/api/path"

interface TauriFileEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified_at: number
}

export interface ProtocolFileEntry {
  name: string
  path: string
  isDir: boolean
  size: number
  modifiedAt: number
}

export interface ProtocolFileGateway {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  listFiles(dir: string): Promise<ProtocolFileEntry[]>
  dirname(path: string): Promise<string>
  toAssetUrl(path: string): string
}

export const tauriProtocolFileGateway: ProtocolFileGateway = {
  readFile(path) {
    return invoke<string>("read_file", { path })
  },

  writeFile(path, content) {
    return invoke("write_file", { path, content })
  },

  async listFiles(dir) {
    const entries = await invoke<TauriFileEntry[]>("list_files", { dir })
    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDir: entry.is_dir,
      size: entry.size,
      modifiedAt: entry.modified_at,
    }))
  },

  dirname(path) {
    return dirname(path)
  },

  toAssetUrl(path) {
    return convertFileSrc(path)
  },
}

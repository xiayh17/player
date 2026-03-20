import { invoke } from "@tauri-apps/api/core"
import type { VarCardServiceStatus } from "@/features/var-cards/types"

export interface SshProfile {
  id: string
  host: string
  hostname: string
  port: number
  user: string | null
  identityFile: string | null
  source: "ssh_config"
}

export interface SshConnectionRequest {
  profileId?: string | null
  host?: string | null
  hostname?: string | null
  port?: number | null
  user?: string | null
  remotePath?: string | null
}

export interface SshConnectionResult {
  ok: boolean
  status: VarCardServiceStatus
  message: string
  checkedAt: string
  host: string
  port: number
  user: string | null
}

export async function listSshProfiles(): Promise<SshProfile[]> {
  return invoke<SshProfile[]>("list_ssh_profiles")
}

export async function testSshConnection(request: SshConnectionRequest): Promise<SshConnectionResult> {
  return invoke<SshConnectionResult>("test_ssh_connection", { request })
}

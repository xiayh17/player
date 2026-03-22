import {
  tauriVarCardServiceGateway,
  type SshConnectionRequest,
  type SshConnectionResult,
  type SshProfile,
} from "@/shared/platform/services"

export type { SshConnectionRequest, SshConnectionResult, SshProfile }

export async function listSshProfiles(): Promise<SshProfile[]> {
  return tauriVarCardServiceGateway.listSshProfiles()
}

export async function testSshConnection(request: SshConnectionRequest): Promise<SshConnectionResult> {
  return tauriVarCardServiceGateway.testSshConnection(request)
}

import type { CloneVarCardPayload, VarCardManifest } from "./types"
import { tauriVarCardGateway } from "@/shared/platform/var-cards"

export async function listUserVarCards(): Promise<VarCardManifest[]> {
  return tauriVarCardGateway.listUserVarCards()
}

export async function getUserVarCard(id: string): Promise<VarCardManifest> {
  return tauriVarCardGateway.getUserVarCard(id)
}

export async function cloneVarCard(payload: CloneVarCardPayload): Promise<VarCardManifest> {
  return tauriVarCardGateway.cloneVarCard(payload)
}

export async function saveUserVarCard(manifest: VarCardManifest): Promise<VarCardManifest> {
  return tauriVarCardGateway.saveUserVarCard(manifest)
}

export async function deleteUserVarCard(id: string): Promise<void> {
  return tauriVarCardGateway.deleteUserVarCard(id)
}

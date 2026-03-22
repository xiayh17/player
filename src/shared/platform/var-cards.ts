import { invoke } from "@tauri-apps/api/core"
import type { CloneVarCardPayload, VarCardManifest } from "@/features/var-cards/types"

export interface VarCardGateway {
  listUserVarCards(): Promise<VarCardManifest[]>
  getUserVarCard(id: string): Promise<VarCardManifest>
  cloneVarCard(payload: CloneVarCardPayload): Promise<VarCardManifest>
  saveUserVarCard(manifest: VarCardManifest): Promise<VarCardManifest>
  deleteUserVarCard(id: string): Promise<void>
}

export const tauriVarCardGateway: VarCardGateway = {
  listUserVarCards() {
    return invoke<VarCardManifest[]>("list_var_cards")
  },
  getUserVarCard(id: string) {
    return invoke<VarCardManifest>("get_var_card", { id })
  },
  cloneVarCard(payload: CloneVarCardPayload) {
    return invoke<VarCardManifest>("clone_var_card", {
      sourceManifest: payload.sourceManifest,
      newId: payload.newId,
    })
  },
  saveUserVarCard(manifest: VarCardManifest) {
    return invoke<VarCardManifest>("save_var_card", { manifest })
  },
  deleteUserVarCard(id: string) {
    return invoke("delete_var_card", { id })
  },
}

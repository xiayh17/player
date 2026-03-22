import { invoke } from "@tauri-apps/api/core"
import type { ProtocolStepLiveActivityPayload } from "@/shared/domain/protocol/liveActivity"

export interface LiveActivityGateway {
  syncProtocolStep(payload: ProtocolStepLiveActivityPayload): Promise<void>
  clearProtocolStep(): Promise<void>
}

export const tauriLiveActivityGateway: LiveActivityGateway = {
  syncProtocolStep(payload) {
    return invoke("sync_protocol_step_live_activity", { payload })
  },

  clearProtocolStep() {
    return invoke("clear_protocol_step_live_activity")
  },
}

import { computed, onBeforeUnmount, watch, type ComputedRef, type Ref } from "vue"
import type { AimdProtocolRecordData } from "@airalogy/aimd-recorder"
import type { ProtocolAnchor } from "./useProtocolNavigator"
import {
  buildProtocolStepLiveActivityPayload,
  type ProtocolStepLiveActivityPayload,
} from "@/shared/domain/protocol/liveActivity"
import {
  tauriLiveActivityGateway,
  type LiveActivityGateway,
} from "@/shared/platform/liveActivityGateway"

interface UseProtocolStepLiveActivityOptions {
  enabled: ComputedRef<boolean>
  protocolTitle: ComputedRef<string | undefined>
  anchors: Ref<ProtocolAnchor[]>
  activeAnchorId: Ref<string | null>
  record: Ref<AimdProtocolRecordData>
  locale: ComputedRef<string>
  gateway?: LiveActivityGateway
}

export function useProtocolStepLiveActivity(options: UseProtocolStepLiveActivityOptions) {
  const gateway = options.gateway ?? tauriLiveActivityGateway

  const payload = computed<ProtocolStepLiveActivityPayload | null>(() => {
    return buildProtocolStepLiveActivityPayload({
      enabled: options.enabled.value,
      protocolTitle: options.protocolTitle.value,
      anchors: options.anchors.value,
      activeAnchorId: options.activeAnchorId.value,
      record: options.record.value,
      locale: options.locale.value,
    })
  })

  watch(
    payload,
    async (nextPayload) => {
      try {
        if (!nextPayload) {
          await gateway.clearProtocolStep()
          return
        }

        await gateway.syncProtocolStep(nextPayload)
      } catch (error) {
        console.warn("Failed to sync protocol live activity", error)
      }
    },
    { immediate: true, deep: true },
  )

  onBeforeUnmount(() => {
    void gateway.clearProtocolStep().catch(() => {})
  })
}

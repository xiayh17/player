import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from "vue"
import type { AimdTypePlugin } from "@airalogy/aimd-recorder"
import type { VarCardManifest } from "../types"
import { createVarCardRuntime, type VarCardRuntime } from "./createVarCardRuntime"

export interface VarCardRecorderBinding {
  runtimes: ComputedRef<VarCardRuntime[]>
  typePlugins: ComputedRef<AimdTypePlugin[]>
}

export function createRecorderTypePlugins(
  manifests: MaybeRefOrGetter<VarCardManifest[]>,
): VarCardRecorderBinding {
  const runtimes = computed(() => toValue(manifests).map(createVarCardRuntime))
  const typePlugins = computed(() => runtimes.value.map(runtime => runtime.typePlugin))

  return {
    runtimes,
    typePlugins,
  }
}

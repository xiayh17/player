import { computed, type MaybeRefOrGetter, toValue } from "vue"
import { storeToRefs } from "pinia"
import { createRecorderTypePlugins } from "@/features/var-cards/runtime/createRecorderTypePlugins"
import { useVarCardStore } from "@/stores/varCards"
import type { VarCardManifest } from "@/features/var-cards/types"

export function useVarCardRecorder(manifests?: MaybeRefOrGetter<VarCardManifest[]>) {
  const varCardStore = useVarCardStore()
  const { cards } = storeToRefs(varCardStore)
  const resolvedManifests = computed(() => toValue(manifests) ?? cards.value)
  return createRecorderTypePlugins(resolvedManifests)
}

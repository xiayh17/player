<script lang="ts">
import { computed, defineComponent, ref, watch, type PropType } from "vue"
import type { AimdProtocolRecordData } from "@airalogy/aimd-recorder"
import { renderVarCardPreview } from "@/features/var-cards/runtime/renderVarCardPreview"
import { createVarCardRuntime, type VarCardRuntime } from "@/features/var-cards/runtime/createVarCardRuntime"
import type { VarCardManifest } from "@/features/var-cards/types"

export default defineComponent({
  name: "VarCardPreviewSurface",
  props: {
    runtime: {
      type: Object as PropType<VarCardRuntime | null>,
      default: null,
    },
    manifest: {
      type: Object as PropType<VarCardManifest | null>,
      default: null,
    },
    demoValue: {
      type: [String, Number, Boolean, Object, Array] as unknown as PropType<unknown>,
      default: undefined,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    locale: {
      type: String,
      default: "en-US",
    },
    currentUserName: {
      type: String,
      default: undefined,
    },
    now: {
      type: [Date, String, Number] as unknown as PropType<Date | string | number | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const resolvedRuntime = computed(() => {
      if (props.runtime) return props.runtime
      if (props.manifest) return createVarCardRuntime(props.manifest)
      return null
    })
    const resolvedDemoValue = computed(() => (
      typeof props.demoValue === "undefined" ? props.manifest?.demoValue : props.demoValue
    ))
    const previewRecord = ref<AimdProtocolRecordData>(
      resolvedRuntime.value?.createPreviewRecord(resolvedDemoValue.value)
      ?? { var: {}, step: {}, check: {}, quiz: {} },
    )

    watch([resolvedRuntime, resolvedDemoValue], ([nextRuntime, demoValue]) => {
      if (!nextRuntime) return
      previewRecord.value = nextRuntime.createPreviewRecord(demoValue)
    }, { immediate: false })

    return () => {
      if (!resolvedRuntime.value) {
        return null
      }

      return renderVarCardPreview({
        runtime: resolvedRuntime.value,
        modelValue: previewRecord.value,
        readonly: props.readonly,
        locale: props.locale,
        currentUserName: props.currentUserName,
        now: props.now,
        onUpdateModelValue: value => {
          previewRecord.value = value
        },
      })
    }
  },
})
</script>

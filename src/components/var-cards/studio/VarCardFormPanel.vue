<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NTag,
} from "naive-ui"
import { listSshProfiles, type SshProfile } from "@/features/services/api"

const props = defineProps<{
  draft: Record<string, any>
  readOnly: boolean
}>()

const emit = defineEmits<{
  (e: "update:draft", value: Record<string, any>): void
}>()

const layoutOptions = [
  { label: "Text", value: "text" },
  { label: "Textarea", value: "textarea" },
  { label: "Number", value: "number" },
  { label: "Boolean", value: "boolean" },
  { label: "Select", value: "select" },
  { label: "Markdown", value: "markdown" },
  { label: "Code", value: "code" },
  { label: "DNA", value: "dna" },
  { label: "Datetime", value: "datetime" },
  { label: "Asset", value: "asset" },
  { label: "Service", value: "service" },
]

const assetPreviewModeOptions = [
  { label: "Auto", value: "auto" },
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Document", value: "document" },
  { label: "Download", value: "download" },
  { label: "3D Model", value: "model3d" },
]

const serviceTypeOptions = [
  { label: "SSH", value: "ssh" },
]
const sshProfiles = ref<SshProfile[]>([])
const sshProfileOptions = ref<Array<{ label: string; value: string }>>([])
const loadingSshProfiles = ref(false)

const tagSummary = computed(() =>
  String(props.draft.tagsText || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean),
)

const demoValuePlaceholder = computed(() => {
  if (props.draft.layoutKind === "asset") {
    return '{"src":"https://example.com/sample.mov","name":"sample.mov","mimeType":"video/quicktime"}'
  }

  if (props.draft.layoutKind === "service") {
    return '{"status":"idle","message":"Ready to test"}'
  }

  return "Used by the live preview panel. JSON is supported."
})

function updateField(key: string, value: unknown) {
  emit("update:draft", {
    ...props.draft,
    [key]: value,
  })
}

async function loadSshProfiles() {
  loadingSshProfiles.value = true
  try {
    sshProfiles.value = await listSshProfiles()
    sshProfileOptions.value = sshProfiles.value.map((profile) => ({
      label: `${profile.id} (${profile.user || "user"}@${profile.hostname}:${profile.port})`,
      value: profile.id,
    }))
  } finally {
    loadingSshProfiles.value = false
  }
}

function handleServiceProfileChange(value: string | null) {
  const nextValue = value || ""
  const profile = sshProfiles.value.find((item) => item.id === nextValue)

  emit("update:draft", {
    ...props.draft,
    serviceProfileId: nextValue,
    serviceHost: profile?.hostname || profile?.host || props.draft.serviceHost,
    servicePort: profile ? String(profile.port) : props.draft.servicePort,
    serviceUsername: profile?.user || props.draft.serviceUsername,
  })
}

onMounted(async () => {
  await loadSshProfiles()
})
</script>

<template>
  <NCard :title="draft.readOnly ? 'Card Manifest (Read-only)' : 'Card Manifest'" size="large">
    <template #header-extra>
      <NTag :type="readOnly ? 'warning' : 'success'" size="small" round>
        {{ readOnly ? "Built-in" : "User" }}
      </NTag>
    </template>

    <NForm label-placement="top">
      <div class="form-grid">
        <NFormItem label="Title">
          <NInput
            :value="draft.title"
            :disabled="readOnly"
            placeholder="PCR Buffer Snapshot"
            @update:value="updateField('title', $event)"
          />
        </NFormItem>

        <NFormItem label="Record Type">
          <NInput
            :value="draft.recordType"
            :disabled="readOnly"
            placeholder="card:user/pcr-buffer-snapshot"
            @update:value="updateField('recordType', $event)"
          />
        </NFormItem>
      </div>

      <NFormItem label="Description">
        <NInput
          type="textarea"
          :value="draft.description"
          :disabled="readOnly"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="Short explanation shown in picker and market cards."
          @update:value="updateField('description', $event)"
        />
      </NFormItem>

      <div class="form-grid">
        <NFormItem label="Layout Kind">
          <NSelect
            :value="draft.layoutKind"
            :disabled="readOnly"
            :options="layoutOptions"
            @update:value="updateField('layoutKind', $event)"
          />
        </NFormItem>

        <NFormItem label="Tags">
          <NInput
            :value="draft.tagsText"
            :disabled="readOnly"
            placeholder="lab, timing, sample"
            @update:value="updateField('tagsText', $event)"
          />
        </NFormItem>
      </div>

      <div class="form-grid">
        <NFormItem label="Field Label">
          <NInput
            :value="draft.fieldLabel"
            :disabled="readOnly"
            placeholder="Buffer concentration"
            @update:value="updateField('fieldLabel', $event)"
          />
        </NFormItem>

        <NFormItem label="Placeholder">
          <NInput
            :value="draft.placeholder"
            :disabled="readOnly"
            placeholder="Enter a value"
            @update:value="updateField('placeholder', $event)"
          />
        </NFormItem>
      </div>

      <div v-if="draft.layoutKind === 'asset'" class="form-grid">
        <NFormItem label="Accepted Files">
          <NInput
            :value="draft.assetAccept"
            :disabled="readOnly"
            placeholder=".mov,.mp4,video/*"
            @update:value="updateField('assetAccept', $event)"
          />
        </NFormItem>

        <NFormItem label="Preview Mode">
          <NSelect
            :value="draft.assetPreviewMode"
            :disabled="readOnly"
            :options="assetPreviewModeOptions"
            @update:value="updateField('assetPreviewMode', $event)"
          />
        </NFormItem>
      </div>

      <template v-if="draft.layoutKind === 'service'">
        <div class="form-grid">
          <NFormItem label="Service Type">
            <NSelect
              :value="draft.serviceType"
              :disabled="readOnly"
              :options="serviceTypeOptions"
              @update:value="updateField('serviceType', $event)"
            />
          </NFormItem>

          <NFormItem label="SSH Profile">
            <NSelect
              :value="draft.serviceProfileId || null"
              :disabled="readOnly"
              :loading="loadingSshProfiles"
              :options="sshProfileOptions"
              clearable
              filterable
              placeholder="Host alias from ~/.ssh/config"
              @update:value="handleServiceProfileChange"
            />
          </NFormItem>
        </div>

        <div class="form-grid">
          <NFormItem label="Host">
            <NInput
              :value="draft.serviceHost"
              :disabled="readOnly"
              placeholder="compute-01.example.org"
              @update:value="updateField('serviceHost', $event)"
            />
          </NFormItem>

          <NFormItem label="Port">
            <NInput
              :value="draft.servicePort"
              :disabled="readOnly"
              placeholder="22"
              @update:value="updateField('servicePort', $event)"
            />
          </NFormItem>
        </div>

        <div class="form-grid">
          <NFormItem label="Username">
            <NInput
              :value="draft.serviceUsername"
              :disabled="readOnly"
              placeholder="ubuntu"
              @update:value="updateField('serviceUsername', $event)"
            />
          </NFormItem>

          <NFormItem label="Remote Path">
            <NInput
              :value="draft.serviceRemotePath"
              :disabled="readOnly"
              placeholder="/srv/data"
              @update:value="updateField('serviceRemotePath', $event)"
            />
          </NFormItem>
        </div>
      </template>

      <NFormItem label="Help Text">
        <NInput
          :value="draft.helpText"
          :disabled="readOnly"
          placeholder="Optional supporting hint below the field."
          @update:value="updateField('helpText', $event)"
        />
      </NFormItem>

      <NFormItem label="Enum Options">
        <NInput
          type="textarea"
          :value="draft.enumOptionsText"
          :disabled="readOnly || draft.layoutKind !== 'select'"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="low|Low&#10;medium|Medium&#10;high|High"
          @update:value="updateField('enumOptionsText', $event)"
        />
      </NFormItem>

      <NFormItem label="Demo Value">
        <NInput
          type="textarea"
          :value="draft.demoValueText"
          :disabled="readOnly"
          :autosize="{ minRows: 3, maxRows: 8 }"
          :placeholder="demoValuePlaceholder"
          @update:value="updateField('demoValueText', $event)"
        />
      </NFormItem>
    </NForm>

    <div v-if="tagSummary.length" class="tag-list">
      <NTag v-for="tag in tagSummary" :key="tag" size="small" round>{{ tag }}</NTag>
    </div>
  </NCard>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

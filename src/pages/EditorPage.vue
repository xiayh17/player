<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRouter, useRoute } from "vue-router"
import { useI18n } from "vue-i18n"
import { NButton, NSpace, NSelect, NEmpty, NSpin, NInput, NModal, useMessage } from "naive-ui"
import { AimdEditor, type AimdVarTypePresetOption } from "@airalogy/aimd-editor/vue"
import { useWorkspaceStore } from "@/stores/workspace"
import { useEditorStore } from "@/stores/editor"
import { createEditorVarTypePresets } from "@/features/var-cards/runtime/createEditorVarTypePresets"
import { useVarCardStore } from "@/stores/varCards"
import { useEditorSession } from "@/shared/features/editor/useEditorSession"
import { tauriProtocolFileGateway } from "@/shared/platform/protocolFileGateway"

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const message = useMessage()

const workspaceStore = useWorkspaceStore()
const editorStore = useEditorStore()
const varCardStore = useVarCardStore()
const { cards: varCards } = storeToRefs(varCardStore)

type Status = "loading" | "no-protocol" | "no-files" | "ready" | "error"

const showNewFileModal = ref(false)
const newFileName = ref("")

const protocolId = computed(() => route.query.id as string | undefined)

const protocol = computed(() =>
  workspaceStore.current?.protocols.find((p) => p.id === protocolId.value) ?? null
)

const varTypePresets = computed<AimdVarTypePresetOption[]>(() =>
  createEditorVarTypePresets(varCards.value),
)
const editorSession = useEditorSession({
  workspacePath: computed(() => workspaceStore.current?.path),
  protocol,
  editorStore,
  gateway: tauriProtocolFileGateway,
  onError: (value) => {
    message.error(value)
  },
})

const status = computed<Status>(() => editorSession.status.value)
const files = computed(() => editorSession.files.value)
const selectedFile = computed(() => editorSession.selectedFile.value)
const fileContent = computed(() => editorSession.fileContent.value)
const saving = computed(() => editorSession.saving.value)
const creatingFile = computed(() => editorSession.creatingFile.value)
const errorMessage = computed(() => editorSession.errorMessage.value)
const fileSelectOptions = computed(() => editorSession.fileSelectOptions.value)

async function handleFileSwitch(filename: string) {
  await editorSession.handleFileSwitch(filename)
}

async function save() {
  const saved = await editorSession.save()
  if (saved) {
    message.success(t("editor.saved"))
  } else if (!errorMessage.value) {
    message.error(t("editor.saveFailed"))
  }
}

async function createNewFile() {
  const created = await editorSession.createNewFile(newFileName.value)
  if (!created) return
  showNewFileModal.value = false
  newFileName.value = ""
}

function handleContentChange(val: string) {
  editorSession.handleContentChange(val)
}

function goBack() {
  if (protocolId.value) {
    router.push(`/protocol?id=${encodeURIComponent(protocolId.value)}`)
  } else {
    router.push("/projects")
  }
}

function openCardStudio() {
  router.push({
    path: "/var-cards",
    query: protocolId.value ? { from: "editor", protocolId: protocolId.value } : undefined,
  })
}

onMounted(async () => {
  await Promise.all([editorSession.load(), varCardStore.fetchCards()])
})
watch(protocolId, (newId, oldId) => {
  if (newId !== oldId) {
    void editorSession.load()
  }
})
</script>

<template>
  <div class="editor-page">
    <div v-if="status === 'loading'" class="center-state">
      <NSpin size="large" />
    </div>

    <div v-else-if="status === 'no-protocol'" class="center-state">
      <NEmpty :description="t('editor.noProject')">
        <template #extra>
          <NButton type="primary" @click="router.push('/projects')">
            {{ t("nav.projects") }}
          </NButton>
        </template>
      </NEmpty>
    </div>

    <div v-else-if="status === 'no-files'" class="center-state">
      <NEmpty :description="t('editor.noFiles')">
        <template #extra>
          <NButton type="primary" @click="showNewFileModal = true">
            {{ t("editor.newFile") }}
          </NButton>
        </template>
      </NEmpty>
    </div>

    <div v-else-if="status === 'error'" class="center-state">
      <NEmpty :description="errorMessage || t('editor.saveFailed')">
        <template #extra>
          <NSpace :size="8">
            <NButton @click="goBack">
              {{ t("nav.projects") }}
            </NButton>
            <NButton type="primary" @click="editorSession.load">
              Retry
            </NButton>
          </NSpace>
        </template>
      </NEmpty>
    </div>

    <template v-else>
      <header class="editor-header">
        <NSpace align="center" :size="8">
          <NButton quaternary circle @click="goBack">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </template>
          </NButton>
          <span class="project-name">{{ protocol?.name }}</span>
          <span class="sep">/</span>
          <NSelect
            v-if="files.length > 1"
            :value="selectedFile"
            :options="fileSelectOptions"
            size="small"
            style="width: 220px"
            @update:value="handleFileSwitch"
          />
          <span v-else class="file-name">{{ selectedFile }}</span>
        </NSpace>

        <NSpace :size="8">
          <span v-if="editorStore.isDirty" class="dirty-indicator">●</span>
          <NButton size="small" @click="openCardStudio">
            {{ t("editor.manageCards") }}
          </NButton>
          <NButton size="small" @click="showNewFileModal = true">
            {{ t("editor.newFile") }}
          </NButton>
          <NButton
            type="primary"
            size="small"
            :loading="saving"
            :disabled="!editorStore.isDirty"
            @click="save"
          >
            {{ t("editor.save") }}
          </NButton>
        </NSpace>
      </header>

      <main class="editor-content">
        <AimdEditor
          :key="editorStore.filePath ?? undefined"
          :model-value="fileContent"
          mode="source"
          :show-toolbar="true"
          :show-aimd-toolbar="true"
          :show-md-toolbar="true"
          :min-height="0"
          :var-type-plugins="varTypePresets"
          @update:model-value="handleContentChange"
        />
      </main>
    </template>

    <NModal
      v-model:show="showNewFileModal"
      preset="card"
      :title="t('editor.newFile')"
      style="width: 400px"
      :mask-closable="false"
    >
      <NInput
        v-model:value="newFileName"
        :placeholder="t('editor.fileNamePlaceholder')"
        autofocus
        @keyup.enter="createNewFile"
      />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showNewFileModal = false">{{ t("common.cancel") }}</NButton>
          <NButton type="primary" :loading="creatingFile" @click="createNewFile">
            {{ t("common.confirm") }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.editor-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.center-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--aimd-border-color);
  flex-shrink: 0;
  background: var(--aimd-bg-card);
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--aimd-text-primary);
}

.sep {
  color: var(--aimd-text-secondary);
}

.file-name {
  font-size: 14px;
  color: var(--aimd-text-secondary);
}

.dirty-indicator {
  color: var(--aimd-color-primary);
  font-size: 18px;
  line-height: 1;
}

.editor-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-content :deep(.aimd-editor) {
  height: 100%;
  border: none;
  border-radius: 0;
}

.editor-content :deep(.aimd-editor-panel) {
  flex: 1;
  min-height: 0;
}

.editor-content :deep(.aimd-editor-source-mode) {
  height: 100%;
}

.editor-content :deep(.aimd-editor-container) {
  height: 100%;
}
</style>

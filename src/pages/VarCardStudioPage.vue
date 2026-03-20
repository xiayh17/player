<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import {
  NAlert,
  NButton,
  NEmpty,
  NSpace,
  NSpin,
  useMessage,
} from "naive-ui"
import VarCardStudioLayout from "@/components/var-cards/studio/VarCardStudioLayout.vue"
import VarCardFormPanel from "@/components/var-cards/studio/VarCardFormPanel.vue"
import VarCardBehaviorPanel from "@/components/var-cards/studio/VarCardBehaviorPanel.vue"
import VarCardLivePreviewPanel from "@/components/var-cards/studio/VarCardLivePreviewPanel.vue"
import { useVarCardStore } from "@/stores/varCards"
import type { VarCardManifest } from "@/features/var-cards/types"

type StudioStatus = "loading" | "ready" | "missing-store" | "missing-card"

type VarCardRecord = VarCardManifest

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const message = useMessage()
const store = useVarCardStore()

const status = ref<StudioStatus>("loading")
const cards = ref<VarCardRecord[]>([])
const sourceManifest = ref<VarCardRecord | null>(null)
const draft = ref(createEmptyDraft())
const saving = ref(false)
const cloning = ref(false)

const currentCardId = computed(() => {
  const value = route.query.id
  return typeof value === "string" ? value : ""
})

const currentRecordType = computed(() => {
  const value = route.query.recordType
  return typeof value === "string" ? value : ""
})

const isReadOnly = computed(() =>
  Boolean(draft.value.readOnly || draft.value.namespace === "builtin"),
)

const pageTitle = computed(() =>
  draft.value.title || t("varCards.studio.title"),
)

const pageSubtitle = computed(() =>
  isReadOnly.value
    ? t("varCards.studio.readOnlyDescription")
    : t("varCards.studio.description"),
)

function createEmptyDraft() {
  return {
    id: "",
    namespace: "user",
    title: "",
    description: "",
    recordType: "",
    version: "1.0.0",
    tagsText: "",
    layoutKind: "text",
    fieldLabel: "",
    placeholder: "",
    assetAccept: "",
    assetPreviewMode: "auto",
    serviceType: "ssh",
    serviceProfileId: "",
    serviceHost: "",
    servicePort: "22",
    serviceUsername: "",
    serviceRemotePath: "",
    helpText: "",
    enumOptionsText: "",
    demoValueText: "",
    required: false,
    readonlyBehavior: false,
    validationHint: "",
    emptyState: "",
    readOnly: false,
  }
}

function parseDemoValueText(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return ""

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function optionsTextFromManifest(manifest: VarCardRecord): string {
  const options = manifest.schema?.options
  if (!Array.isArray(options)) return ""

  return options
    .map((option: any) => {
      if (typeof option === "string") return option
      const value = String(option?.value ?? option?.key ?? option?.label ?? "").trim()
      const label = String(option?.label ?? option?.text ?? value).trim()
      return value && label ? `${value}|${label}` : value || label
    })
    .filter(Boolean)
    .join("\n")
}

function draftFromManifest(manifest: VarCardRecord) {
  return {
    id: String(manifest.id || ""),
    namespace: String(manifest.namespace || "user"),
    title: String(manifest.title || ""),
    description: String(manifest.description || ""),
    recordType: String(manifest.recordType || ""),
    version: String(manifest.version || "1.0.0"),
    tagsText: Array.isArray(manifest.tags) ? manifest.tags.join(", ") : "",
    layoutKind: String(manifest.schema?.kind || "text"),
    fieldLabel: String(manifest.schema?.label || manifest.title || ""),
    placeholder: String(manifest.schema?.placeholder || ""),
    assetAccept: String(manifest.schema?.accept || ""),
    assetPreviewMode: String(manifest.schema?.previewMode || "auto"),
    serviceType: String(manifest.schema?.serviceType || "ssh"),
    serviceProfileId: String(manifest.schema?.serviceProfileId || ""),
    serviceHost: String(manifest.schema?.serviceHost || ""),
    servicePort: String(manifest.schema?.servicePort ?? 22),
    serviceUsername: String(manifest.schema?.serviceUsername || ""),
    serviceRemotePath: String(manifest.schema?.serviceRemotePath || ""),
    helpText: String(manifest.schema?.helperText || manifest.behavior?.helpText || ""),
    enumOptionsText: optionsTextFromManifest(manifest),
    demoValueText:
      typeof manifest.demoValue === "string"
        ? manifest.demoValue
        : JSON.stringify(manifest.demoValue ?? "", null, 2),
    required: Boolean(manifest.behavior?.required),
    readonlyBehavior: !Boolean(manifest.behavior?.allowManualInput),
    validationHint: String(manifest.behavior?.validationHint || ""),
    emptyState: String(manifest.behavior?.emptyState || ""),
    readOnly: Boolean(manifest.readonly || manifest.namespace === "builtin"),
  }
}

function parseOptions(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, label] = line.split("|").map((item) => item.trim())
      return {
        value: value || label,
        label: label || value,
      }
    })
}

function cloneManifest(manifest: VarCardRecord): VarCardRecord {
  return structuredClone(toRaw(manifest))
}

function buildManifestFromDraft(nextDraft: Record<string, any>, baseManifest: VarCardRecord | null) {
  const manifest: VarCardRecord = structuredClone(baseManifest ?? {
    id: "",
    namespace: "user",
    version: "1.0.0",
    title: "",
    description: "",
    icon: null,
    tags: [],
    readonly: false,
    baseCardId: null,
    recordType: "",
    demoValue: "",
    schema: {
      kind: "text",
      baseType: null,
      inputKind: null,
      label: null,
      placeholder: null,
      defaultValue: "",
      helperText: null,
      unit: null,
      format: null,
      rows: null,
      min: null,
      max: null,
      step: null,
      language: null,
      accept: null,
      previewMode: null,
      serviceType: null,
      serviceProfileId: null,
      serviceHost: null,
      servicePort: null,
      serviceUsername: null,
      serviceRemotePath: null,
      options: [],
    },
    layout: {
      variant: "inline",
      density: "comfortable",
      align: "stretch",
    },
    appearance: {
      accentColor: null,
      icon: null,
      badge: null,
    },
    behavior: {
      allowManualInput: true,
      allowCopy: true,
      liveValue: false,
    },
  })
  const namespace = String(nextDraft.namespace || baseManifest?.namespace || "user")
  const isBuiltIn = namespace === "builtin"

  manifest.id = nextDraft.id || baseManifest?.id || ""
  manifest.namespace = isBuiltIn ? "builtin" : "user"
  manifest.version = nextDraft.version || baseManifest?.version || "1.0.0"
  manifest.title = String(nextDraft.title || "").trim()
  manifest.description = String(nextDraft.description || "").trim()
  manifest.recordType = String(nextDraft.recordType || "").trim()
  manifest.readonly = isBuiltIn ? true : Boolean(nextDraft.readOnly)
  manifest.tags = String(nextDraft.tagsText || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
  manifest.demoValue = parseDemoValueText(String(nextDraft.demoValueText || ""))

  manifest.layout = {
    variant:
      nextDraft.layoutKind === "textarea"
      || nextDraft.layoutKind === "code"
      || nextDraft.layoutKind === "markdown"
      || nextDraft.layoutKind === "dna"
      || nextDraft.layoutKind === "asset"
      || nextDraft.layoutKind === "service"
        ? "panel"
        : "inline",
    density: manifest.layout?.density ?? "comfortable",
    align: manifest.layout?.align ?? "stretch",
  }

  manifest.schema = {
    ...(manifest.schema ?? {}),
    kind: nextDraft.layoutKind || "text",
    baseType: manifest.schema?.baseType ?? null,
    inputKind: manifest.schema?.inputKind ?? null,
    label: nextDraft.fieldLabel || manifest.title,
    placeholder: nextDraft.placeholder || "",
    defaultValue: manifest.schema?.defaultValue ?? "",
    helperText: nextDraft.helpText || "",
    unit: manifest.schema?.unit ?? null,
    format: manifest.schema?.format ?? null,
    rows: nextDraft.layoutKind === "textarea" || nextDraft.layoutKind === "code" ? 4 : null,
    min: manifest.schema?.min ?? null,
    max: manifest.schema?.max ?? null,
    step: manifest.schema?.step ?? null,
    language: nextDraft.layoutKind === "code" ? (manifest.schema?.language ?? "plaintext") : null,
    accept: nextDraft.layoutKind === "asset" ? String(nextDraft.assetAccept || "") : null,
    previewMode: nextDraft.layoutKind === "asset"
      ? (String(nextDraft.assetPreviewMode || "auto") as VarCardRecord["schema"]["previewMode"])
      : null,
    serviceType: nextDraft.layoutKind === "service"
      ? (String(nextDraft.serviceType || "ssh") as VarCardRecord["schema"]["serviceType"])
      : null,
    serviceProfileId: nextDraft.layoutKind === "service" ? String(nextDraft.serviceProfileId || "") : null,
    serviceHost: nextDraft.layoutKind === "service" ? String(nextDraft.serviceHost || "") : null,
    servicePort: nextDraft.layoutKind === "service"
      ? Number.isFinite(Number(nextDraft.servicePort)) ? Number(nextDraft.servicePort) : 22
      : null,
    serviceUsername: nextDraft.layoutKind === "service" ? String(nextDraft.serviceUsername || "") : null,
    serviceRemotePath: nextDraft.layoutKind === "service" ? String(nextDraft.serviceRemotePath || "") : null,
    options: parseOptions(String(nextDraft.enumOptionsText || "")),
  }

  manifest.behavior = {
    ...(manifest.behavior ?? {}),
    allowManualInput: !Boolean(nextDraft.readonlyBehavior),
    allowCopy: manifest.behavior?.allowCopy ?? true,
    liveValue: manifest.behavior?.liveValue ?? false,
    required: Boolean(nextDraft.required),
    validationHint: String(nextDraft.validationHint || ""),
    emptyState: String(nextDraft.emptyState || ""),
    helpText: String(nextDraft.helpText || ""),
  }

  return manifest
}

function updateDraft(value: Record<string, any>) {
  draft.value = {
    ...draft.value,
    ...value,
  }
}

function findCardInList(cardList: VarCardRecord[]) {
  if (currentCardId.value) {
    return cardList.find((card) => card.id === currentCardId.value) ?? null
  }

  if (currentRecordType.value) {
    return cardList.find((card) => card.recordType === currentRecordType.value) ?? null
  }

  return null
}

async function loadCardsFromStore() {
  await store.fetchCards()
  cards.value = store.cards
}

async function loadCurrentCard() {
  status.value = "loading"
  try {
    await loadCardsFromStore()

    if (!currentCardId.value && !currentRecordType.value) {
      sourceManifest.value = null
      draft.value = createEmptyDraft()
      status.value = "ready"
      return
    }

    const card = currentCardId.value
      ? await store.openCard(currentCardId.value)
      : findCardInList(cards.value)
    if (!card) {
      status.value = "missing-card"
      return
    }

    sourceManifest.value = cloneManifest(card)
    draft.value = draftFromManifest(card)
    status.value = "ready"
  } catch (error) {
    console.error("Failed to load var card studio state", error)
    status.value = "missing-card"
    message.error(String(error))
  }
}

async function saveCard() {
  saving.value = true
  try {
    const manifest = buildManifestFromDraft(draft.value, sourceManifest.value)
    const result = await store.saveCard(manifest)
    const savedCard = result && typeof result === "object" ? result : manifest

    sourceManifest.value = cloneManifest(savedCard)
    draft.value = draftFromManifest(savedCard)
    await loadCardsFromStore()

    if (savedCard.id) {
      await router.replace({
        path: "/var-cards/studio",
        query: { id: String(savedCard.id) },
      })
    }

    message.success(t("varCards.studio.saved"))
  } catch (error) {
    message.error(String(error))
  } finally {
    saving.value = false
  }
}

async function cloneCard() {
  const cardId = currentCardId.value || sourceManifest.value?.id
  if (!cardId) {
    message.error(t("varCards.studio.cloneUnavailable"))
    return
  }

  cloning.value = true
  try {
    const clonedCard = await store.cloneCard(cardId)
    await loadCardsFromStore()

    if (!clonedCard?.id) {
      throw new Error(t("varCards.studio.cloneUnavailable"))
    }

    message.success(t("varCards.studio.cloned"))
    await router.replace({
      path: "/var-cards/studio",
      query: { id: String(clonedCard.id) },
    })
  } catch (error) {
    message.error(String(error))
  } finally {
    cloning.value = false
  }
}

function goBack() {
  router.push("/var-cards")
}

watch(
  () => [route.query.id, route.query.recordType],
  async () => {
    await loadCurrentCard()
  },
)

onMounted(async () => {
  await loadCurrentCard()
})
</script>

<template>
  <div class="var-card-studio-page">
    <div v-if="status === 'loading'" class="center-state">
      <NSpin size="large" />
    </div>

    <NEmpty
      v-else-if="status === 'missing-store'"
      class="center-state"
      :description="t('varCards.studio.storeUnavailable')"
    />

    <NEmpty
      v-else-if="status === 'missing-card'"
      class="center-state"
      :description="t('varCards.studio.cardNotFound')"
    >
      <template #extra>
        <NButton @click="router.push('/var-cards')">{{ t("varCards.market.title") }}</NButton>
      </template>
    </NEmpty>

    <VarCardStudioLayout
      v-else
      :title="pageTitle"
      :subtitle="pageSubtitle"
    >
      <template #actions>
        <NSpace>
          <NButton @click="goBack">{{ t("common.close") }}</NButton>
          <NButton
            v-if="isReadOnly"
            type="primary"
            :loading="cloning"
            @click="cloneCard"
          >
            {{ t("common.clone") }}
          </NButton>
          <NButton
            v-else
            type="primary"
            :loading="saving"
            @click="saveCard"
          >
            {{ t("editor.save") }}
          </NButton>
        </NSpace>
      </template>

      <template #form>
        <NAlert v-if="isReadOnly" type="warning" :show-icon="false">
          {{ t("varCards.studio.readOnlyBanner") }}
        </NAlert>
        <VarCardFormPanel
          :draft="draft"
          :read-only="isReadOnly"
          @update:draft="updateDraft"
        />
      </template>

      <template #behavior>
        <VarCardBehaviorPanel
          :draft="draft"
          :read-only="isReadOnly"
          @update:draft="updateDraft"
        />
      </template>

      <template #preview>
        <VarCardLivePreviewPanel
          :draft="draft"
          :read-only="isReadOnly"
        />
      </template>
    </VarCardStudioLayout>
  </div>
</template>

<style scoped>
.var-card-studio-page {
  min-height: 100vh;
  padding: 24px;
}

.center-state {
  min-height: calc(100vh - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

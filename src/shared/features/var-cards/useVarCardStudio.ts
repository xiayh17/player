import { computed, onMounted, ref, toRaw, watch } from "vue"
import type { RouteLocationNormalizedLoaded, Router } from "vue-router"
import type { VarCardManifest } from "@/features/var-cards/types"

interface Translator {
  (key: string, params?: Record<string, unknown>): string
}

interface MessageLike {
  success(message: string): void
  error(message: string): void
}

interface VarCardStoreLike {
  cards: VarCardManifest[]
  fetchCards(): Promise<VarCardManifest[]>
  openCard(id: string): Promise<VarCardManifest | null>
  saveCard(manifest: VarCardManifest): Promise<VarCardManifest | null>
  cloneCard(id: string): Promise<VarCardManifest | null>
}

export type StudioStatus = "loading" | "ready" | "missing-card"

export interface VarCardStudioDraft {
  id: string
  namespace: string
  title: string
  description: string
  recordType: string
  version: string
  tagsText: string
  layoutKind: VarCardManifest["schema"]["kind"]
  fieldLabel: string
  placeholder: string
  assetAccept: string
  assetPreviewMode: NonNullable<VarCardManifest["schema"]["previewMode"]> | "auto"
  serviceType: NonNullable<VarCardManifest["schema"]["serviceType"]>
  serviceProfileId: string
  serviceHost: string
  servicePort: string
  serviceUsername: string
  serviceRemotePath: string
  helpText: string
  enumOptionsText: string
  demoValueText: string
  required: boolean
  readonlyBehavior: boolean
  validationHint: string
  emptyState: string
  readOnly: boolean
}

export function createEmptyVarCardStudioDraft(): VarCardStudioDraft {
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

function optionsTextFromManifest(manifest: VarCardManifest): string {
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

function draftFromManifest(manifest: VarCardManifest): VarCardStudioDraft {
  return {
    id: String(manifest.id || ""),
    namespace: String(manifest.namespace || "user"),
    title: String(manifest.title || ""),
    description: String(manifest.description || ""),
    recordType: String(manifest.recordType || ""),
    version: String(manifest.version || "1.0.0"),
    tagsText: Array.isArray(manifest.tags) ? manifest.tags.join(", ") : "",
    layoutKind: manifest.schema?.kind || "text",
    fieldLabel: String(manifest.schema?.label || manifest.title || ""),
    placeholder: String(manifest.schema?.placeholder || ""),
    assetAccept: String(manifest.schema?.accept || ""),
    assetPreviewMode: manifest.schema?.previewMode || "auto",
    serviceType: manifest.schema?.serviceType || "ssh",
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

function cloneManifest(manifest: VarCardManifest): VarCardManifest {
  return JSON.parse(JSON.stringify(toRaw(manifest)))
}

function buildManifestFromDraft(nextDraft: VarCardStudioDraft, baseManifest: VarCardManifest | null) {
  const manifest: VarCardManifest = JSON.parse(JSON.stringify(baseManifest ?? {
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
  }))

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
      ? (String(nextDraft.assetPreviewMode || "auto") as VarCardManifest["schema"]["previewMode"])
      : null,
    serviceType: nextDraft.layoutKind === "service"
      ? (String(nextDraft.serviceType || "ssh") as VarCardManifest["schema"]["serviceType"])
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

export function useVarCardStudio(options: {
  route: RouteLocationNormalizedLoaded
  router: Router
  store: VarCardStoreLike
  message: MessageLike
  t: Translator
}) {
  const status = ref<StudioStatus>("loading")
  const cards = ref<VarCardManifest[]>([])
  const sourceManifest = ref<VarCardManifest | null>(null)
  const draft = ref<VarCardStudioDraft>(createEmptyVarCardStudioDraft())
  const saving = ref(false)
  const cloning = ref(false)

  const currentCardId = computed(() => {
    const value = options.route.query.id
    return typeof value === "string" ? value : ""
  })

  const currentRecordType = computed(() => {
    const value = options.route.query.recordType
    return typeof value === "string" ? value : ""
  })

  const isReadOnly = computed(() =>
    Boolean(draft.value.readOnly || draft.value.namespace === "builtin"),
  )

  const pageTitle = computed(() =>
    draft.value.title || options.t("varCards.studio.title"),
  )

  const pageSubtitle = computed(() =>
    isReadOnly.value
      ? options.t("varCards.studio.readOnlyDescription")
      : options.t("varCards.studio.description"),
  )

  function updateDraft(value: Partial<VarCardStudioDraft>) {
    draft.value = {
      ...draft.value,
      ...value,
    }
  }

  function findCardInList(cardList: VarCardManifest[]) {
    if (currentCardId.value) {
      return cardList.find((card) => card.id === currentCardId.value) ?? null
    }

    if (currentRecordType.value) {
      return cardList.find((card) => card.recordType === currentRecordType.value) ?? null
    }

    return null
  }

  async function loadCardsFromStore() {
    await options.store.fetchCards()
    cards.value = options.store.cards
  }

  async function loadCurrentCard() {
    status.value = "loading"
    try {
      await loadCardsFromStore()

      if (!currentCardId.value && !currentRecordType.value) {
        sourceManifest.value = null
        draft.value = createEmptyVarCardStudioDraft()
        status.value = "ready"
        return
      }

      const card = currentCardId.value
        ? await options.store.openCard(currentCardId.value)
        : findCardInList(cards.value)

      if (!card) {
        status.value = "missing-card"
        return
      }

      sourceManifest.value = cloneManifest(card)
      draft.value = draftFromManifest(card)
      status.value = "ready"
    } catch (error) {
      status.value = "missing-card"
      options.message.error(String(error))
    }
  }

  async function saveCard() {
    saving.value = true
    try {
      const manifest = buildManifestFromDraft(draft.value, sourceManifest.value)
      const result = await options.store.saveCard(manifest)
      const savedCard = result && typeof result === "object" ? result : manifest

      sourceManifest.value = cloneManifest(savedCard)
      draft.value = draftFromManifest(savedCard)
      await loadCardsFromStore()

      if (savedCard.id) {
        await options.router.replace({
          path: "/var-cards/studio",
          query: { id: String(savedCard.id) },
        })
      }

      options.message.success(options.t("varCards.studio.saved"))
    } catch (error) {
      options.message.error(String(error))
    } finally {
      saving.value = false
    }
  }

  async function cloneCard() {
    const cardId = currentCardId.value || sourceManifest.value?.id
    if (!cardId) {
      options.message.error(options.t("varCards.studio.cloneUnavailable"))
      return
    }

    cloning.value = true
    try {
      const clonedCard = await options.store.cloneCard(cardId)
      await loadCardsFromStore()

      if (!clonedCard?.id) {
        throw new Error(options.t("varCards.studio.cloneUnavailable"))
      }

      options.message.success(options.t("varCards.studio.cloned"))
      await options.router.replace({
        path: "/var-cards/studio",
        query: { id: String(clonedCard.id) },
      })
    } catch (error) {
      options.message.error(String(error))
    } finally {
      cloning.value = false
    }
  }

  function goBack() {
    options.router.push("/var-cards")
  }

  watch(
    () => [options.route.query.id, options.route.query.recordType],
    async () => {
      await loadCurrentCard()
    },
  )

  onMounted(async () => {
    await loadCurrentCard()
  })

  return {
    status,
    cards,
    sourceManifest,
    draft,
    saving,
    cloning,
    currentCardId,
    currentRecordType,
    isReadOnly,
    pageTitle,
    pageSubtitle,
    updateDraft,
    loadCurrentCard,
    saveCard,
    cloneCard,
    goBack,
  }
}

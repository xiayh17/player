import { computed, onMounted, ref } from "vue"
import type { Router } from "vue-router"
import type { VarCardGalleryCard } from "@/components/var-cards/VarCardGalleryItem.vue"
import type { VarCardManifest } from "@/features/var-cards/types"

type NamespaceFilter = "all" | "builtin" | "user"

interface Translator {
  (key: string, params?: Record<string, unknown>): string
}

interface MessageLike {
  success(message: string): void
  error(message: string): void
  info(message: string): void
}

interface VarCardStoreLike {
  cards: VarCardManifest[]
  error: string | null
  fetchCards(): Promise<VarCardManifest[]>
  cloneCard(id: string): Promise<VarCardManifest | null>
}

export function useVarCardMarket(options: {
  store: VarCardStoreLike
  router: Router
  message: MessageLike
  t: Translator
}) {
  const loading = ref(true)
  const searchQuery = ref("")
  const namespaceFilter = ref<NamespaceFilter>("all")
  const selectedCard = ref<VarCardGalleryCard | null>(null)
  const previewOpen = ref(false)

  const filterOptions = computed<{ label: string; value: NamespaceFilter }[]>(() => [
    { label: options.t("varCards.filters.all"), value: "all" },
    { label: options.t("varCards.filters.builtin"), value: "builtin" },
    { label: options.t("varCards.filters.user"), value: "user" },
  ])

  const cards = computed<VarCardGalleryCard[]>(() => options.store.cards)
  const filteredCards = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return cards.value.filter((card) => {
      const matchesNamespace =
        namespaceFilter.value === "all" || card.namespace === namespaceFilter.value

      if (!matchesNamespace) return false
      if (!query) return true

      return [
        card.title,
        card.description,
        card.recordType,
        ...card.tags,
      ].some((value) => value.toLowerCase().includes(query))
    })
  })

  const builtInCount = computed(() => cards.value.filter((card) => card.namespace === "builtin").length)
  const userCount = computed(() => cards.value.filter((card) => card.namespace === "user").length)

  function setNamespaceFilter(value: NamespaceFilter) {
    namespaceFilter.value = value
  }

  async function loadCards() {
    loading.value = true
    try {
      await options.store.fetchCards()
    } finally {
      loading.value = false
    }
  }

  function openPreview(card: VarCardGalleryCard) {
    selectedCard.value = card
    previewOpen.value = true
  }

  async function cloneCard(card: VarCardGalleryCard) {
    try {
      const clonedCard = await options.store.cloneCard(card.id)
      await options.store.fetchCards()
      options.message.success(options.t("varCards.feedback.cloneSuccess", { title: card.title }))
      if (clonedCard?.id) {
        previewOpen.value = false
        await options.router.push({ path: "/var-cards/studio", query: { id: clonedCard.id } })
      }
    } catch {
      options.message.error(String(options.store.error ?? options.t("varCards.studio.cloneUnavailable")))
    }
  }

  function editCard(card: VarCardGalleryCard) {
    const resolved = options.router.resolve({ path: "/var-cards/studio", query: { id: card.id } })

    if (resolved.matched.length > 0) {
      options.router.push(resolved)
      return
    }

    options.message.info(options.t("varCards.feedback.studioUnavailable"))
  }

  onMounted(async () => {
    await loadCards()
  })

  return {
    loading,
    searchQuery,
    namespaceFilter,
    selectedCard,
    previewOpen,
    filterOptions,
    cards,
    filteredCards,
    builtInCount,
    userCount,
    setNamespaceFilter,
    loadCards,
    openPreview,
    cloneCard,
    editCard,
  }
}

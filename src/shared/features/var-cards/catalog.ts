import { computed, ref } from "vue"
import { getBuiltinVarCardManifests } from "@/features/var-cards/builtin"
import type { VarCardKey, VarCardManifest, VarCardNamespace } from "@/features/var-cards/types"
import { parseVarCardKey, toVarCardKey } from "@/features/var-cards/types"
import {
  buildCloneVarCardId,
  buildVarCardRecordTypeMap,
  getVarCardSelectionKey,
  matchesVarCard,
  normalizeUserVarCard,
} from "@/shared/domain/var-cards/catalog"
import { type VarCardGateway } from "@/shared/platform/var-cards"

export interface VarCardCatalogStateOptions {
  gateway: VarCardGateway
  builtinCards?: VarCardManifest[]
}

export function createVarCardCatalogState(options: VarCardCatalogStateOptions) {
  const { gateway } = options
  const builtinCards = ref<VarCardManifest[]>(options.builtinCards ?? getBuiltinVarCardManifests())
  const userCards = ref<VarCardManifest[]>([])
  const selectedCardId = ref<VarCardKey | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const cards = computed(() => [...builtinCards.value, ...userCards.value])
  const cardsByRecordType = computed(() => buildVarCardRecordTypeMap(cards.value))
  const selectedCard = computed(
    () => cards.value.find((card) => selectedCardId.value && matchesVarCard(card, selectedCardId.value)) ?? null,
  )

  async function fetchCards(): Promise<VarCardManifest[]> {
    loading.value = true
    error.value = null
    try {
      userCards.value = await gateway.listUserVarCards()
      initialized.value = true
      return cards.value
    } catch (err) {
      error.value = String(err)
      return cards.value
    } finally {
      loading.value = false
    }
  }

  async function openCard(id: string): Promise<VarCardManifest | null> {
    error.value = null

    const localMatch = cards.value.find((card) => matchesVarCard(card, id))
    if (localMatch) {
      selectedCardId.value = getVarCardSelectionKey(localMatch)
      return localMatch
    }

    const parsed = parseVarCardKey(id)
    if (parsed?.namespace === "user") {
      try {
        const manifest = await gateway.getUserVarCard(parsed.id)
        upsertUserCard(manifest)
        selectedCardId.value = getVarCardSelectionKey(manifest)
        return manifest
      } catch (err) {
        error.value = String(err)
      }
    }

    return null
  }

  async function cloneCard(id: string): Promise<VarCardManifest | null> {
    const sourceCard = cards.value.find((card) => matchesVarCard(card, id))
    if (!sourceCard) {
      error.value = `Var Card not found: ${id}`
      return null
    }

    loading.value = true
    error.value = null
    try {
      const newId = buildCloneVarCardId(sourceCard, cards.value)
      const clonedCard = await gateway.cloneVarCard({
        sourceManifest: sourceCard,
        newId,
      })
      upsertUserCard(clonedCard)
      selectedCardId.value = toVarCardKey("user", clonedCard.id)
      return clonedCard
    } catch (err) {
      error.value = String(err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveCard(manifest: VarCardManifest): Promise<VarCardManifest | null> {
    loading.value = true
    error.value = null
    try {
      const normalized = normalizeUserVarCard(manifest)
      const savedCard = await gateway.saveUserVarCard(normalized)
      upsertUserCard(savedCard)
      selectedCardId.value = toVarCardKey("user", savedCard.id)
      return savedCard
    } catch (err) {
      error.value = String(err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteCard(id: string): Promise<boolean> {
    const parsed = parseVarCardKey(id)
    const target = cards.value.find((card) => matchesVarCard(card, id))
    if (!target || (parsed?.namespace ?? target.namespace) !== "user") {
      error.value = `Only user Var Cards can be deleted: ${id}`
      return false
    }

    loading.value = true
    error.value = null
    try {
      await gateway.deleteUserVarCard(target.id)
      userCards.value = userCards.value.filter((card) => card.id !== target.id)
      if (selectedCardId.value === toVarCardKey("user", target.id)) {
        selectedCardId.value = null
      }
      return true
    } catch (err) {
      error.value = String(err)
      return false
    } finally {
      loading.value = false
    }
  }

  function upsertUserCard(manifest: VarCardManifest): void {
    const nextCards = userCards.value.filter((card) => card.id !== manifest.id)
    nextCards.push(normalizeUserVarCard(manifest))
    nextCards.sort((left, right) => left.title.localeCompare(right.title))
    userCards.value = nextCards
  }

  function setBuiltinCards(nextCards: VarCardManifest[]): void {
    builtinCards.value = nextCards.map((card) => ({ ...card }))
  }

  function getCardKey(namespace: VarCardNamespace, id: string): VarCardKey {
    return toVarCardKey(namespace, id)
  }

  return {
    cards,
    cardsByRecordType,
    selectedCard,
    selectedCardId,
    loading,
    error,
    initialized,
    fetchCards,
    openCard,
    cloneCard,
    saveCard,
    deleteCard,
    setBuiltinCards,
    getCardKey,
  }
}

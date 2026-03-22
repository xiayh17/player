import type { VarCardKey, VarCardManifest } from "@/features/var-cards/types"
import { parseVarCardKey, toVarCardKey, toVarCardRecordType } from "@/features/var-cards/types"

export function slugifyVarCardId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function buildCloneVarCardId(source: VarCardManifest, existingCards: VarCardManifest[]): string {
  const baseSlug = slugifyVarCardId(source.id) || "var-card"
  const existingIds = new Set(
    existingCards.filter((card) => card.namespace === "user").map((card) => card.id),
  )

  let nextId = `${baseSlug}-copy`
  let index = 2
  while (existingIds.has(nextId)) {
    nextId = `${baseSlug}-copy-${index}`
    index += 1
  }

  return nextId
}

export function matchesVarCard(card: VarCardManifest, id: string): boolean {
  const parsed = parseVarCardKey(id)
  if (parsed) {
    return parsed.namespace === card.namespace && parsed.id === card.id
  }

  return card.id === id
}

export function buildVarCardRecordTypeMap(cards: VarCardManifest[]): Record<string, VarCardManifest> {
  return cards.reduce<Record<string, VarCardManifest>>((acc, card) => {
    acc[card.recordType] = card
    return acc
  }, {})
}

export function normalizeUserVarCard(manifest: VarCardManifest): VarCardManifest {
  const id = slugifyVarCardId(manifest.id) || "var-card"

  return {
    ...manifest,
    id,
    namespace: "user",
    readonly: false,
    baseCardId:
      manifest.baseCardId ?? (manifest.namespace !== "user" ? toVarCardKey(manifest.namespace, manifest.id) : null),
    recordType: toVarCardRecordType("user", id),
  }
}

export function getVarCardSelectionKey(manifest: VarCardManifest): VarCardKey {
  return toVarCardKey(manifest.namespace, manifest.id)
}

import type { AimdVarTypePresetOption } from "@airalogy/aimd-editor"
import { storeToRefs } from "pinia"
import { useVarCardStore } from "@/stores/varCards"

export interface EditorVarCardPresetSource {
  id: string
  title: string
  description?: string | null
  namespace?: string | null
  readonly?: boolean
  recordType: string
}

function normalizeRecordType(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function toFriendlyDescription(card: EditorVarCardPresetSource): string {
  const segments: string[] = []

  if (card.namespace === "builtin") {
    segments.push("Built-in card")
  } else if (card.namespace === "user") {
    segments.push("Custom card")
  }

  if (card.description) {
    segments.push(card.description)
  }

  return segments.join(" · ")
}

export function createEditorVarTypePresets(
  cards: EditorVarCardPresetSource[],
): AimdVarTypePresetOption[] {
  const seen = new Set<string>()

  return [...cards]
    .filter((card) => normalizeRecordType(card.recordType))
    .sort((left, right) => {
      const leftRank = left.namespace === "builtin" ? 0 : 1
      const rightRank = right.namespace === "builtin" ? 0 : 1
      if (leftRank !== rightRank) return leftRank - rightRank
      return left.title.localeCompare(right.title)
    })
    .flatMap((card) => {
      const recordType = normalizeRecordType(card.recordType)
      const normalizedKey = recordType.toLowerCase()
      if (!recordType || seen.has(normalizedKey)) {
        return []
      }

      seen.add(normalizedKey)

      return [{
        key: `var-card:${card.id}`,
        value: recordType,
        label: card.title,
        desc: toFriendlyDescription(card),
      }]
    })
}

export async function loadEditorVarTypePresets(): Promise<AimdVarTypePresetOption[]> {
  try {
    const store = useVarCardStore()
    const { cards } = storeToRefs(store)
    await store.fetchCards()
    return createEditorVarTypePresets(cards.value as EditorVarCardPresetSource[])
  } catch {
    return []
  }
}

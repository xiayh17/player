import { defineStore } from "pinia"
import { createVarCardCatalogState } from "@/shared/features/var-cards/catalog"
import { tauriVarCardGateway } from "@/shared/platform/var-cards"

export const useVarCardStore = defineStore("varCards", () => {
  return createVarCardCatalogState({ gateway: tauriVarCardGateway })
})

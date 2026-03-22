import { defineStore } from "pinia"
import { createVarCardCatalogState } from "@/shared/features/var-cards/catalog"

export const useVarCardStore = defineStore("varCards", () => {
  return createVarCardCatalogState()
})

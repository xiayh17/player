<script setup lang="ts">
import { useVarCardStudio } from "@/shared/features/var-cards/useVarCardStudio"
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

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const message = useMessage()
const store = useVarCardStore()

const {
  status,
  draft,
  saving,
  cloning,
  isReadOnly,
  pageTitle,
  pageSubtitle,
  updateDraft,
  saveCard,
  cloneCard,
  goBack,
} = useVarCardStudio({
  route,
  router,
  store,
  message,
  t,
})
</script>

<template>
  <div class="var-card-studio-page">
    <div v-if="status === 'loading'" class="center-state">
      <NSpin size="large" />
    </div>

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
  min-height: 100%;
  padding: 24px;
}

.center-state {
  min-height: calc(100% - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

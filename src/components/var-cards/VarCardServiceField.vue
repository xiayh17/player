<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { listSshProfiles, testSshConnection, type SshProfile } from "@/features/services/api"
import type { VarCardServiceStatus, VarCardServiceType, VarCardServiceValue } from "@/features/var-cards/types"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  serviceType?: VarCardServiceType | null
  serviceProfileId?: string | null
  serviceHost?: string | null
  servicePort?: number | null
  serviceUsername?: string | null
  serviceRemotePath?: string | null
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: VarCardServiceValue): void
  (e: "blur"): void
}>()

const loadingProfiles = ref(false)
const testing = ref(false)
const profiles = ref<SshProfile[]>([])
const profileLoadError = ref<string | null>(null)

function normalizeServiceValue(value: unknown): VarCardServiceValue | null {
  if (!value || typeof value !== "object") return null

  const candidate = value as Record<string, unknown>
  if (candidate.serviceType !== "ssh") return null

  return {
    serviceType: "ssh",
    profileId: typeof candidate.profileId === "string" ? candidate.profileId : null,
    host: typeof candidate.host === "string" ? candidate.host : null,
    username: typeof candidate.username === "string" ? candidate.username : null,
    port: typeof candidate.port === "number" ? candidate.port : null,
    remotePath: typeof candidate.remotePath === "string" ? candidate.remotePath : null,
    status:
      candidate.status === "testing"
      || candidate.status === "connected"
      || candidate.status === "auth_failed"
      || candidate.status === "host_unreachable"
      || candidate.status === "unknown_host"
      || candidate.status === "config_error"
      || candidate.status === "error"
        ? candidate.status
        : "idle",
    checkedAt: typeof candidate.checkedAt === "string" ? candidate.checkedAt : null,
    message: typeof candidate.message === "string" ? candidate.message : null,
  }
}

const disabled = computed(() => Boolean(props.disabled))
const serviceType = computed<VarCardServiceType>(() => props.serviceType ?? "ssh")
const serviceValue = computed(() => normalizeServiceValue(props.modelValue))
const activeProfileId = computed(() => serviceValue.value?.profileId ?? props.serviceProfileId ?? null)
const selectedProfile = computed(() =>
  profiles.value.find((profile) => profile.id === activeProfileId.value) ?? null
)

const resolvedHost = computed(() =>
  serviceValue.value?.host
  || props.serviceHost
  || selectedProfile.value?.hostname
  || selectedProfile.value?.host
  || null
)
const resolvedPort = computed(() =>
  serviceValue.value?.port
  || props.servicePort
  || selectedProfile.value?.port
  || 22
)
const resolvedUsername = computed(() =>
  serviceValue.value?.username
  || props.serviceUsername
  || selectedProfile.value?.user
  || null
)
const resolvedRemotePath = computed(() =>
  serviceValue.value?.remotePath
  || props.serviceRemotePath
  || null
)
const profileOptions = computed(() => profiles.value.map((profile) => ({
  label: `${profile.id} (${profile.user || "user"}@${profile.hostname}:${profile.port})`,
  value: profile.id,
})))
const statusLabelMap: Record<VarCardServiceStatus, string> = {
  idle: "idle",
  testing: "testing",
  connected: "connected",
  auth_failed: "auth failed",
  host_unreachable: "host unreachable",
  unknown_host: "unknown host",
  config_error: "config error",
  error: "error",
}

function emitBlur() {
  emit("blur")
}

function emitServiceState(partial: Partial<VarCardServiceValue>) {
  emit("update:modelValue", {
    serviceType: "ssh",
    profileId: activeProfileId.value ?? selectedProfile.value?.id ?? null,
    host: resolvedHost.value,
    username: resolvedUsername.value,
    port: resolvedPort.value,
    remotePath: resolvedRemotePath.value,
    status: "idle",
    checkedAt: null,
    message: null,
    ...serviceValue.value,
    ...partial,
  })
}

async function loadProfiles() {
  if (serviceType.value !== "ssh") return

  loadingProfiles.value = true
  profileLoadError.value = null
  try {
    profiles.value = await listSshProfiles()
  } catch (error) {
    profileLoadError.value = String(error)
  } finally {
    loadingProfiles.value = false
  }
}

async function handleTestConnection() {
  if (disabled.value || serviceType.value !== "ssh") return

  testing.value = true
  emitServiceState({
    status: "testing",
    message: "Testing SSH connectivity...",
  })

  try {
    const result = await testSshConnection({
      profileId: activeProfileId.value ?? selectedProfile.value?.id ?? null,
      host: props.serviceHost ?? null,
      hostname: resolvedHost.value,
      port: resolvedPort.value,
      user: resolvedUsername.value,
      remotePath: props.serviceRemotePath ?? null,
    })

    emitServiceState({
      host: result.host,
      port: result.port,
      username: result.user,
      status: result.status,
      checkedAt: result.checkedAt,
      message: result.message,
    })
  } catch (error) {
    emitServiceState({
      status: "error",
      checkedAt: new Date().toISOString(),
      message: String(error),
    })
  } finally {
    testing.value = false
    emitBlur()
  }
}

function handleProfileChange(event: Event) {
  const nextProfileId = (event.target as HTMLSelectElement).value || null
  const profile = profiles.value.find((item) => item.id === nextProfileId) ?? null

  emitServiceState({
    profileId: nextProfileId,
    host: profile?.hostname ?? profile?.host ?? null,
    port: profile?.port ?? 22,
    username: profile?.user ?? null,
    status: "idle",
    checkedAt: null,
    message: profile ? `Loaded profile ${profile.id}` : "Using manual configuration",
  })
  emitBlur()
}

watch(
  () => [props.serviceProfileId, props.serviceHost, props.servicePort, props.serviceUsername, props.serviceRemotePath],
  () => {
    emitServiceState({})
  },
)

onMounted(async () => {
  await loadProfiles()
})
</script>

<template>
  <div class="service-field">
    <div class="service-field__header">
      <div class="service-field__identity">
        <strong>{{ selectedProfile?.id || serviceProfileId || resolvedHost || "Unconfigured service" }}</strong>
        <span>{{ resolvedUsername || "user" }}@{{ resolvedHost || "host" }}:{{ resolvedPort }}</span>
      </div>

      <button
        type="button"
        class="service-field__button"
        :disabled="disabled || testing || (!resolvedHost && !serviceProfileId)"
        @click="handleTestConnection"
      >
        {{ testing ? "Testing..." : "Test connection" }}
      </button>
    </div>

    <div class="service-field__body">
      <label v-if="profileOptions.length" class="service-field__picker">
        <span class="service-field__label">SSH Profile</span>
        <select
          class="service-field__select"
          :disabled="disabled"
          :value="activeProfileId || ''"
          @change="handleProfileChange"
          @blur="emitBlur"
        >
          <option value="">Manual configuration</option>
          <option v-for="option in profileOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <div class="service-field__meta">
        <span class="service-field__label">Service</span>
        <strong>SSH</strong>
      </div>
      <div class="service-field__meta">
        <span class="service-field__label">Profile</span>
        <strong>{{ selectedProfile?.id || activeProfileId || "Manual config" }}</strong>
      </div>
      <div class="service-field__meta">
        <span class="service-field__label">Remote Path</span>
        <strong>{{ resolvedRemotePath || "/" }}</strong>
      </div>
    </div>

    <div class="service-field__status" :data-status="serviceValue?.status || 'idle'">
      <strong>{{ statusLabelMap[serviceValue?.status || "idle"] }}</strong>
      <span>{{ serviceValue?.message || profileLoadError || (loadingProfiles ? "Loading SSH profiles..." : "Ready") }}</span>
      <time v-if="serviceValue?.checkedAt">{{ serviceValue.checkedAt }}</time>
    </div>
  </div>
</template>

<style scoped>
.service-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-field__header,
.service-field__body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}

.service-field__identity,
.service-field__meta,
.service-field__picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.service-field__identity strong,
.service-field__meta strong {
  color: var(--aimd-text-primary);
  font-size: 13px;
}

.service-field__identity span,
.service-field__meta span,
.service-field__status span,
.service-field__status time {
  color: var(--aimd-text-secondary);
  font-size: 12px;
  word-break: break-word;
}

.service-field__label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.service-field__button {
  min-height: 34px;
  border: 1px solid rgba(8, 145, 178, 0.24);
  border-radius: 999px;
  padding: 0 12px;
  background: rgba(8, 145, 178, 0.08);
  color: #0f766e;
  font: inherit;
  cursor: pointer;
}

.service-field__button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.service-field__select {
  min-height: 36px;
  min-width: min(100%, 320px);
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 10px;
  padding: 0 10px;
  background: white;
  color: var(--aimd-text-primary);
  font: inherit;
}

.service-field__body {
  padding: 14px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.service-field__status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.service-field__status[data-status="connected"] {
  background: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.18);
}

.service-field__status[data-status="auth_failed"] {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.22);
}

.service-field__status[data-status="error"] {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.18);
}

.service-field__status[data-status="host_unreachable"],
.service-field__status[data-status="unknown_host"] {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.2);
}

.service-field__status[data-status="config_error"] {
  background: rgba(71, 85, 105, 0.08);
  border-color: rgba(71, 85, 105, 0.2);
}

.service-field__status[data-status="testing"] {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.18);
}
</style>

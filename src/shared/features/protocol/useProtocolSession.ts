import { computed, ref, type ComputedRef, type Ref } from "vue"
import type { AimdProtocolRecordData } from "@airalogy/aimd-recorder"
import { createEmptyProtocolRecordData } from "@airalogy/aimd-recorder"
import { isAbsoluteFilesystemPath, resolveProtocolFilePath, resolveWorkspacePath } from "@/utils/workspacePaths"
import { type ProtocolFileEntry, type ProtocolFileGateway } from "@/shared/platform/protocolFileGateway"

export type ProtocolSessionStatus =
  | "loading"
  | "no-workspace"
  | "no-protocol"
  | "no-files"
  | "ready"
  | "error"

export interface ProtocolSessionProtocol {
  id: string
  name: string
  title?: string
  type: "file" | "folder"
  path: string
}

interface UseProtocolSessionOptions {
  workspacePath: ComputedRef<string | null | undefined>
  protocol: ComputedRef<ProtocolSessionProtocol | null | undefined>
  gateway: ProtocolFileGateway
  onLoadStart?: (protocolId: string | undefined) => void
  onReady?: (protocolId: string) => void
  onNoWorkspace?: () => void
  onNoProtocol?: (protocolId: string | undefined) => void
  onError?: (message: string) => void
}

function isExternalResource(path: string): boolean {
  if (isAbsoluteFilesystemPath(path)) {
    return false
  }

  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)
}

function toFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/")

  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`
  }

  if (normalized.startsWith("//")) {
    return `file:${encodeURI(normalized)}`
  }

  if (normalized.startsWith("/")) {
    return `file://${encodeURI(normalized)}`
  }

  return `file:///${encodeURI(normalized)}`
}

function resolveRelativeFilesystemPath(baseDir: string, relativePath: string): string {
  const preferBackslash = baseDir.includes("\\")
  const separator = preferBackslash ? "\\" : "/"
  const baseUrl = new URL(`${toFileUrl(baseDir).replace(/[\\/]+$/, "")}/`)
  const resolvedUrl = new URL(relativePath.replace(/\\/g, "/"), baseUrl)
  const decodedPath = decodeURIComponent(resolvedUrl.pathname)

  if (/^\/[A-Za-z]:\//.test(decodedPath)) {
    const windowsPath = decodedPath.slice(1)
    return preferBackslash ? windowsPath.replace(/\//g, "\\") : windowsPath
  }

  return preferBackslash ? decodedPath.replace(/\//g, separator) : decodedPath
}

export function useProtocolSession(options: UseProtocolSessionOptions) {
  const { gateway } = options

  const status = ref<ProtocolSessionStatus>("loading")
  const files = ref<string[]>([])
  const selectedFile = ref<string | null>(null)
  const content = ref("")
  const record = ref<AimdProtocolRecordData>(createEmptyProtocolRecordData())
  const currentFileDirectory = ref<string | null>(null)
  const errorMessage = ref("")

  const fileSelectOptions = computed(() =>
    files.value.map((file) => ({ label: file, value: file })),
  )

  async function openFile(filename: string) {
    const protocol = options.protocol.value
    if (!protocol) return

    const fullPath = resolveProtocolFilePath(options.workspacePath.value, protocol, filename)
    content.value = await gateway.readFile(fullPath)
    currentFileDirectory.value = await gateway.dirname(fullPath)
    selectedFile.value = filename
  }

  async function load() {
    const protocol = options.protocol.value
    const workspacePath = options.workspacePath.value
    const protocolId = protocol?.id

    options.onLoadStart?.(protocolId)

    if (!workspacePath) {
      status.value = "no-workspace"
      options.onNoWorkspace?.()
      return
    }

    if (!protocol) {
      status.value = "no-protocol"
      options.onNoProtocol?.(protocolId)
      return
    }

    status.value = "loading"
    errorMessage.value = ""

    try {
      if (protocol.type === "file") {
        files.value = [protocol.path.split(/[\\/]/).pop()!]
        await openFile(files.value[0])
        status.value = "ready"
        options.onReady?.(protocol.id)
        return
      }

      const entries = await gateway.listFiles(resolveWorkspacePath(workspacePath, protocol.path))
      files.value = entries.filter((entry: ProtocolFileEntry) => !entry.isDir && entry.name.endsWith(".aimd"))
        .map((entry) => entry.name)

      if (files.value.length === 0) {
        status.value = "no-files"
        return
      }

      await openFile(files.value[0])
      status.value = "ready"
      options.onReady?.(protocol.id)
    } catch (error) {
      errorMessage.value = String(error)
      status.value = "error"
      options.onError?.(errorMessage.value)
    }
  }

  async function handleFileSwitch(filename: string) {
    await openFile(filename)
  }

  function resolveWorkspaceAsset(src: string): string | null {
    const trimmed = src.trim()
    if (!trimmed) return null

    if (isExternalResource(trimmed)) {
      return trimmed
    }

    if (isAbsoluteFilesystemPath(trimmed)) {
      return gateway.toAssetUrl(trimmed)
    }

    if (!currentFileDirectory.value) {
      return trimmed
    }

    return gateway.toAssetUrl(resolveRelativeFilesystemPath(currentFileDirectory.value, trimmed))
  }

  function resetRecord() {
    record.value = createEmptyProtocolRecordData()
  }

  return {
    status,
    files,
    selectedFile,
    content,
    record,
    currentFileDirectory,
    errorMessage,
    fileSelectOptions,
    load,
    openFile,
    handleFileSwitch,
    resolveWorkspaceAsset,
    resetRecord,
  }
}

import { computed, ref, type ComputedRef } from "vue"
import { resolveProtocolFilePath, resolveWorkspacePath } from "@/utils/workspacePaths"
import { type ProtocolFileEntry, type ProtocolFileGateway } from "@/shared/platform/protocolFileGateway"

export type EditorSessionStatus = "loading" | "no-protocol" | "no-files" | "ready" | "error"

export interface EditorSessionProtocol {
  id: string
  name: string
  title?: string
  type: "file" | "folder"
  path: string
}

interface UseEditorSessionOptions {
  workspacePath: ComputedRef<string | null | undefined>
  protocol: ComputedRef<EditorSessionProtocol | null | undefined>
  editorStore: {
    filePath: string | null
    isDirty: boolean
    loadContent: (content: string, path: string) => void
    markClean: () => void
    setContent: (content: string) => void
  }
  gateway: ProtocolFileGateway
  onError?: (message: string) => void
}

export function useEditorSession(options: UseEditorSessionOptions) {
  const { gateway } = options

  const status = ref<EditorSessionStatus>("loading")
  const files = ref<string[]>([])
  const selectedFile = ref<string | null>(null)
  const fileContent = ref("")
  const saving = ref(false)
  const creatingFile = ref(false)
  const errorMessage = ref("")

  const fileSelectOptions = computed(() =>
    files.value.map((file) => ({ label: file, value: file })),
  )

  async function openFile(filename: string) {
    const protocol = options.protocol.value
    if (!protocol) return

    const path = resolveProtocolFilePath(options.workspacePath.value, protocol, filename)
    const content = await gateway.readFile(path)
    fileContent.value = content
    options.editorStore.loadContent(content, path)
    selectedFile.value = filename
  }

  async function load() {
    const protocol = options.protocol.value
    if (!protocol) {
      status.value = "no-protocol"
      return
    }

    status.value = "loading"
    errorMessage.value = ""

    try {
      if (protocol.type === "file") {
        const path = resolveProtocolFilePath(options.workspacePath.value, protocol)
        const content = await gateway.readFile(path)
        fileContent.value = content
        options.editorStore.loadContent(content, path)
        files.value = [protocol.path.split(/[\\/]/).pop()!]
        selectedFile.value = files.value[0]
        status.value = "ready"
        return
      }

      const entries = await gateway.listFiles(resolveWorkspacePath(options.workspacePath.value, protocol.path))
      files.value = entries
        .filter((entry: ProtocolFileEntry) => !entry.isDir && entry.name.endsWith(".aimd"))
        .map((entry) => entry.name)

      if (files.value.length === 0) {
        status.value = "no-files"
        return
      }

      await openFile(files.value[0])
      status.value = "ready"
    } catch (error) {
      errorMessage.value = String(error)
      status.value = "error"
      options.onError?.(errorMessage.value)
    }
  }

  async function save() {
    if (!options.editorStore.filePath) return false

    saving.value = true
    try {
      await gateway.writeFile(options.editorStore.filePath, fileContent.value)
      options.editorStore.markClean()
      return true
    } catch (error) {
      options.onError?.(String(error))
      return false
    } finally {
      saving.value = false
    }
  }

  async function createNewFile(rawName: string) {
    const protocol = options.protocol.value
    let name = rawName.trim()
    if (!name || !protocol || protocol.type === "file") return false
    if (!name.endsWith(".aimd")) name += ".aimd"

    creatingFile.value = true
    try {
      const path = resolveProtocolFilePath(options.workspacePath.value, protocol, name)
      await gateway.writeFile(path, `# ${name.replace(".aimd", "")}\n\n`)
      files.value.push(name)
      await openFile(name)
      status.value = "ready"
      return true
    } catch (error) {
      options.onError?.(String(error))
      return false
    } finally {
      creatingFile.value = false
    }
  }

  async function handleFileSwitch(filename: string) {
    if (filename === selectedFile.value) return
    if (options.editorStore.isDirty) {
      const saved = await save()
      if (!saved) return
    }
    await openFile(filename)
  }

  function handleContentChange(value: string) {
    fileContent.value = value
    options.editorStore.setContent(value)
  }

  return {
    status,
    files,
    selectedFile,
    fileContent,
    saving,
    creatingFile,
    errorMessage,
    fileSelectOptions,
    load,
    openFile,
    save,
    createNewFile,
    handleFileSwitch,
    handleContentChange,
  }
}

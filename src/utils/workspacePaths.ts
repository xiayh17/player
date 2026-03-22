import type { ProtocolEntry } from "@/shared/domain/workspace/workspaceTypes"

export function isAbsoluteFilesystemPath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("\\\\") || /^[A-Za-z]:[\\/]/.test(path)
}

export function joinFilesystemPath(basePath: string, relativePath: string): string {
  if (!basePath) return relativePath
  if (!relativePath) return basePath

  const separator = basePath.includes("\\") ? "\\" : "/"
  const normalizedBase = basePath.replace(/[\\/]+$/, "")
  const normalizedRelative = relativePath.replace(/^[\\/]+/, "").replace(/[\\/]+/g, separator)

  return `${normalizedBase}${separator}${normalizedRelative}`
}

export function resolveWorkspacePath(
  workspacePath: string | null | undefined,
  targetPath: string,
): string {
  if (!targetPath || isAbsoluteFilesystemPath(targetPath) || !workspacePath) {
    return targetPath
  }

  return joinFilesystemPath(workspacePath, targetPath)
}

export function resolveProtocolFilePath(
  workspacePath: string | null | undefined,
  protocol: ProtocolEntry,
  filename?: string,
): string {
  const protocolPath = resolveWorkspacePath(workspacePath, protocol.path)
  if (protocol.type === "file" || !filename) {
    return protocolPath
  }

  return joinFilesystemPath(protocolPath, filename)
}

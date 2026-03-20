import type { AimdVarInputKind } from "@airalogy/aimd-recorder"

export type VarCardNamespace = "builtin" | "user"

export type VarCardKey = `${VarCardNamespace}:${string}`

export interface VarCardOption {
  label: string
  value: unknown
}

export type VarCardAssetPreviewMode =
  | "auto"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "download"
  | "model3d"

export type VarCardServiceType = "ssh"
export type VarCardServiceStatus =
  | "idle"
  | "testing"
  | "connected"
  | "auth_failed"
  | "host_unreachable"
  | "unknown_host"
  | "config_error"
  | "error"

export interface VarCardAssetValue {
  src: string | null
  name: string | null
  mimeType: string | null
  size: number | null
  lastModified: number | null
}

export interface VarCardServiceValue {
  serviceType: VarCardServiceType
  profileId: string | null
  host: string | null
  username: string | null
  port: number | null
  remotePath: string | null
  status: VarCardServiceStatus
  checkedAt: string | null
  message: string | null
}

export interface VarCardSchema {
  kind:
    | "text"
    | "textarea"
    | "number"
    | "boolean"
    | "select"
    | "markdown"
    | "code"
    | "dna"
    | "datetime"
    | "asset"
    | "service"
  baseType: string | null
  inputKind: AimdVarInputKind | null
  label: string | null
  placeholder: string | null
  defaultValue: unknown
  helperText: string | null
  unit: string | null
  format: string | null
  rows: number | null
  min: number | null
  max: number | null
  step: number | null
  language: string | null
  accept: string | null
  previewMode: VarCardAssetPreviewMode | null
  serviceType: VarCardServiceType | null
  serviceProfileId: string | null
  serviceHost: string | null
  servicePort: number | null
  serviceUsername: string | null
  serviceRemotePath: string | null
  options: VarCardOption[]
}

export interface VarCardLayout {
  variant: "inline" | "stacked" | "panel"
  density: "compact" | "comfortable"
  align: "start" | "center" | "stretch"
}

export interface VarCardAppearance {
  accentColor: string | null
  icon: string | null
  badge: string | null
}

export interface VarCardBehavior {
  allowManualInput: boolean
  allowCopy: boolean
  liveValue: boolean
  required?: boolean
  validationHint?: string | null
  emptyState?: string | null
  helpText?: string | null
}

export interface VarCardManifest {
  id: string
  namespace: VarCardNamespace
  version: string
  title: string
  description: string
  icon: string | null
  tags: string[]
  readonly: boolean
  baseCardId: string | null
  recordType: string
  demoValue: unknown
  schema: VarCardSchema
  layout: VarCardLayout
  appearance: VarCardAppearance
  behavior: VarCardBehavior
}

export interface CloneVarCardPayload {
  sourceManifest: VarCardManifest
  newId: string
}

export function isVarCardType(type: string): boolean {
  return type.startsWith("card:")
}

export function toVarCardRecordType(namespace: VarCardNamespace, slug: string): string {
  return `card:${namespace}/${slug}`
}

export function toVarCardKey(namespace: VarCardNamespace, id: string): VarCardKey {
  return `${namespace}:${id}`
}

export function parseVarCardKey(key: string): { namespace: VarCardNamespace; id: string } | null {
  const [namespace, ...rest] = key.split(":")
  if ((namespace !== "builtin" && namespace !== "user") || rest.length === 0) {
    return null
  }

  return {
    namespace,
    id: rest.join(":"),
  }
}

export function cloneVarCardManifest(manifest: VarCardManifest, id: string): VarCardManifest {
  return {
    ...manifest,
    id,
    namespace: "user",
    readonly: false,
    baseCardId: toVarCardKey(manifest.namespace, manifest.id),
    recordType: toVarCardRecordType("user", id),
  }
}

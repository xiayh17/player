import type { AimdTypePlugin, AimdVarInputKind } from "@airalogy/aimd-recorder"
import {
  BUILT_IN_AIMD_TYPE_PLUGINS,
  getVarInputKind,
  normalizeVarTypeName,
  resolveAimdTypePlugin,
} from "@airalogy/aimd-recorder"
import type { VarCardManifest, VarCardOption } from "../types"

export interface CompiledVarCardManifest {
  manifest: VarCardManifest
  baseType: string
  normalizedBaseType: string
  inputKind: AimdVarInputKind
  placeholder?: string
  codeLanguage?: string | null
  enumOptions: VarCardOption[]
  accentColor?: string
  basePlugin?: AimdTypePlugin
}

function resolveBaseType(manifest: VarCardManifest): string {
  const explicit = manifest.schema.baseType?.trim()
  if (explicit) {
    return explicit
  }

  switch (manifest.schema.kind) {
    case "number":
      return "float"
    case "boolean":
      return "bool"
    case "asset":
    case "service":
      return "str"
    case "markdown":
      return "AiralogyMarkdown"
    case "code":
      return "CodeStr"
    case "dna":
      return "DNASequence"
    case "datetime":
      return manifest.behavior.liveValue ? "CurrentTime" : "datetime"
    case "select":
    case "text":
    case "textarea":
    default:
      return "str"
  }
}

function resolveInputKindOverride(manifest: VarCardManifest): AimdVarInputKind | undefined {
  if (manifest.schema.inputKind) {
    return manifest.schema.inputKind
  }

  switch (manifest.schema.kind) {
    case "textarea":
    case "markdown":
      return "textarea"
    case "number":
      return "number"
    case "boolean":
      return "checkbox"
    case "asset":
    case "service":
      return "text"
    case "code":
      return "code"
    case "dna":
      return "dna"
    case "datetime":
      return "datetime"
    case "select":
    case "text":
    default:
      return "text"
  }
}

export function compileCardManifest(manifest: VarCardManifest): CompiledVarCardManifest {
  const baseType = resolveBaseType(manifest)
  const basePlugin = resolveAimdTypePlugin(baseType, BUILT_IN_AIMD_TYPE_PLUGINS)
  const inputKindOverride = resolveInputKindOverride(manifest)
  const inputKind = getVarInputKind(baseType, {
    inputType: inputKindOverride,
    codeLanguage: manifest.schema.language ?? undefined,
    typePlugin: basePlugin,
  })

  return {
    manifest,
    baseType,
    normalizedBaseType: normalizeVarTypeName(baseType),
    inputKind,
    placeholder: manifest.schema.placeholder ?? undefined,
    codeLanguage: manifest.schema.language ?? undefined,
    enumOptions: manifest.schema.options ?? [],
    accentColor: manifest.appearance.accentColor ?? undefined,
    basePlugin,
  }
}

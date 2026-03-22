import type { AimdProtocolRecordData, AimdStepRecordItem } from "@airalogy/aimd-recorder"

export type TimerKind = "elapsed" | "countdown" | "overtime" | "static"

export interface LiveActivityTimerPayload {
  kind: TimerKind
  running: boolean
  displayText?: string
  startAtMs?: number
  endAtMs?: number
}

export interface ProtocolStepLiveActivityPayload {
  protocolTitle?: string
  stepId: string
  stepLabel?: string
  stepTitle: string
  stepSummary?: string
  timer?: LiveActivityTimerPayload
}

export interface ProtocolStepLiveActivityAnchor {
  id: string
  kind: string
  title: string
  summary?: string
  element: HTMLElement
}

export interface BuildProtocolStepLiveActivityPayloadOptions {
  enabled: boolean
  protocolTitle?: string
  anchors: ProtocolStepLiveActivityAnchor[]
  activeAnchorId: string | null
  record: AimdProtocolRecordData
  locale: string
  nowMs?: number
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function formatDuration(ms: number, locale: string): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const days = Math.floor(totalSeconds / (24 * 3600))
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const zh = locale.toLowerCase().startsWith("zh")

  const parts: string[] = []
  if (days > 0) parts.push(zh ? `${days}天` : `${days}d`)
  if (hours > 0) parts.push(zh ? `${hours}小时` : `${hours}h`)
  if (minutes > 0) parts.push(zh ? `${minutes}分` : `${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(zh ? `${seconds}秒` : `${seconds}s`)
  return zh ? parts.join("") : parts.join(" ")
}

function getStepElapsedMs(step: AimdStepRecordItem | undefined, nowMs: number): number {
  if (!step) return 0
  const stored = Number.isFinite(step.elapsed_ms) ? Math.max(0, step.elapsed_ms) : 0
  if (typeof step.timer_started_at_ms !== "number" || !Number.isFinite(step.timer_started_at_ms)) {
    return stored
  }
  return stored + Math.max(0, nowMs - step.timer_started_at_ms)
}

function resolveStepAnchor(
  anchors: ProtocolStepLiveActivityAnchor[],
  activeAnchorId: string | null,
): ProtocolStepLiveActivityAnchor | null {
  if (anchors.length === 0) return null

  const activeIndex = activeAnchorId
    ? anchors.findIndex((anchor) => anchor.id === activeAnchorId)
    : -1
  const fallbackIndex = activeIndex >= 0 ? activeIndex : 0

  if (anchors[fallbackIndex]?.kind === "step") {
    return anchors[fallbackIndex]
  }

  for (let i = fallbackIndex; i < anchors.length; i += 1) {
    if (anchors[i]?.kind === "step") return anchors[i]
  }

  for (let i = fallbackIndex - 1; i >= 0; i -= 1) {
    if (anchors[i]?.kind === "step") return anchors[i]
  }

  return anchors.find((anchor) => anchor.kind === "step") ?? null
}

function resolveStepId(anchor: ProtocolStepLiveActivityAnchor): string | null {
  const elementId = normalizeText(anchor.element.id)
  if (elementId.startsWith("step-")) {
    return elementId.slice(5)
  }

  const dataId = normalizeText(anchor.element.getAttribute("data-aimd-id"))
  return dataId || null
}

function resolveStepLabel(anchor: ProtocolStepLiveActivityAnchor): string | undefined {
  const sequence = normalizeText(
    anchor.element.querySelector<HTMLElement>(".aimd-rec-inline__step-num")?.textContent
      || anchor.element.querySelector<HTMLElement>(".research-step__sequence")?.textContent,
  )

  if (!sequence) return undefined
  return /^step\b/i.test(sequence) ? sequence : `Step ${sequence}`
}

function resolveTimerPayload(
  anchor: ProtocolStepLiveActivityAnchor,
  record: AimdProtocolRecordData,
  locale: string,
  nowMs: number,
): LiveActivityTimerPayload | undefined {
  const timerMode = normalizeText(anchor.element.getAttribute("data-aimd-timer-mode"))
  const estimatedDurationMs = Number.parseFloat(
    anchor.element.getAttribute("data-aimd-estimated-duration-ms") || "",
  )
  const stepId = resolveStepId(anchor)
  const stepState = stepId ? record.step[stepId] : undefined
  const actualElapsedMs = getStepElapsedMs(stepState, nowMs)
  const timerRunning = typeof stepState?.timer_started_at_ms === "number"

  const hasEstimate = Number.isFinite(estimatedDurationMs) && estimatedDurationMs > 0
  const countdownEnabled = timerMode === "countdown" || timerMode === "both"
  const remainingMs = hasEstimate ? estimatedDurationMs - actualElapsedMs : undefined

  if (timerRunning) {
    if (countdownEnabled && typeof remainingMs === "number") {
      if (remainingMs < 0) {
        return {
          kind: "overtime",
          running: true,
          displayText: formatDuration(Math.abs(remainingMs), locale),
          startAtMs: nowMs - Math.abs(remainingMs),
        }
      }

      return {
        kind: "countdown",
        running: true,
        displayText: formatDuration(remainingMs, locale),
        endAtMs: nowMs + remainingMs,
      }
    }

    return {
      kind: "elapsed",
      running: true,
      displayText: formatDuration(actualElapsedMs, locale),
      startAtMs: nowMs - actualElapsedMs,
    }
  }

  if (countdownEnabled && typeof remainingMs === "number" && actualElapsedMs > 0) {
    return {
      kind: "static",
      running: false,
      displayText: remainingMs < 0
        ? `${locale.toLowerCase().startsWith("zh") ? "超时" : "Over"} ${formatDuration(Math.abs(remainingMs), locale)}`
        : `${locale.toLowerCase().startsWith("zh") ? "剩余" : "Remain"} ${formatDuration(remainingMs, locale)}`,
    }
  }

  if (actualElapsedMs > 0) {
    return {
      kind: "static",
      running: false,
      displayText: formatDuration(actualElapsedMs, locale),
    }
  }

  if (hasEstimate) {
    return {
      kind: "static",
      running: false,
      displayText: `${locale.toLowerCase().startsWith("zh") ? "预计" : "Est"} ${formatDuration(estimatedDurationMs, locale)}`,
    }
  }

  return undefined
}

export function buildProtocolStepLiveActivityPayload(
  options: BuildProtocolStepLiveActivityPayloadOptions,
): ProtocolStepLiveActivityPayload | null {
  if (!options.enabled) return null

  const anchor = resolveStepAnchor(options.anchors, options.activeAnchorId)
  if (!anchor) return null

  const stepId = resolveStepId(anchor)
  if (!stepId) return null

  const nowMs = options.nowMs ?? Date.now()

  return {
    protocolTitle: options.protocolTitle,
    stepId,
    stepLabel: resolveStepLabel(anchor),
    stepTitle: anchor.title,
    stepSummary: anchor.summary,
    timer: resolveTimerPayload(anchor, options.record, options.locale, nowMs),
  }
}

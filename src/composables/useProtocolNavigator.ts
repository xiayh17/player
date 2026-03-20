import { nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue"

export type ProtocolAnchorKind = "section" | "step" | "check" | "table" | "quiz" | "callout"
export type ProtocolAnchorStatus = "default" | "completed" | "warning" | "error"

export interface ProtocolAnchor {
  id: string
  kind: ProtocolAnchorKind
  level: number
  title: string
  summary?: string
  status: ProtocolAnchorStatus
  element: HTMLElement
  topRatio: number
}

interface UseProtocolNavigatorOptions {
  scrollContainerRef: Ref<HTMLElement | null>
  contentRootRef: Ref<HTMLElement | null>
  content: Ref<string>
  enabled?: Ref<boolean>
}

const STEP_SELECTOR = `[data-aimd-type="step"], .aimd-rec-inline--step, .aimd-step-card-block`
const CHECK_SELECTOR = `[data-aimd-type="check"], .aimd-rec-inline--check, .aimd-check-pill`
const TABLE_SELECTOR = `[data-aimd-type="var_table"], .aimd-field--var-table`
const IMPORTANT_CALLOUT_SELECTOR = [
  ".aimd-callout.aimd-callout--important",
  ".aimd-callout.aimd-callout--warning",
  ".aimd-callout.aimd-callout--danger",
  ".aimd-callout.aimd-callout--caution",
  ".aimd-callout.aimd-callout--bug",
].join(", ")

const ANCHOR_SELECTOR = [
  "h2",
  "h3",
  STEP_SELECTOR,
  CHECK_SELECTOR,
  TABLE_SELECTOR,
  IMPORTANT_CALLOUT_SELECTOR,
].join(", ")

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function textFromSelector(element: HTMLElement, selector: string): string {
  const node = element.querySelector<HTMLElement>(selector)
  return normalizeText(node?.textContent)
}

function computeTopRatio(contentRoot: HTMLElement, element: HTMLElement): number {
  const total = Math.max(contentRoot.scrollHeight - 1, 1)
  const rootRect = contentRoot.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const top = Math.max(0, elementRect.top - rootRect.top)
  return clamp01(top / total)
}

function ensureAnchorId(element: HTMLElement, kind: ProtocolAnchorKind, index: number): string {
  const dataId = normalizeText(element.getAttribute("data-protocol-anchor-id"))
  if (dataId) return dataId

  const existingId = normalizeText(element.id)
  if (existingId) {
    element.setAttribute("data-protocol-anchor-id", existingId)
    return existingId
  }

  const base = normalizeText(element.getAttribute("data-aimd-id"))
    || normalizeText(element.getAttribute("data-aimd-step-card"))
    || normalizeText(element.getAttribute("data-aimd-title"))
    || normalizeText(element.textContent).toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const id = `${kind}-${base || index + 1}-${index + 1}`
  element.setAttribute("data-protocol-anchor-id", id)
  return id
}

function resolveCalloutStatus(element: HTMLElement): ProtocolAnchorStatus {
  if (element.classList.contains("aimd-callout--danger") || element.classList.contains("aimd-callout--bug")) {
    return "error"
  }
  return "warning"
}

function resolveStepTitle(element: HTMLElement): string {
  const title = normalizeText(element.getAttribute("data-aimd-title"))
    || textFromSelector(element, ".aimd-step-field__title")
    || textFromSelector(element, ".aimd-step-field__main-meta .aimd-field__name")
    || textFromSelector(element, ".aimd-rec-step-card__title")
    || textFromSelector(element, ".aimd-field__name")
    || textFromSelector(element, ".research-step__sequence")
  return title || "Step"
}

function resolveCheckTitle(element: HTMLElement): string {
  return textFromSelector(element, ".aimd-check-pill__label")
    || textFromSelector(element, ".aimd-field__label")
    || "Check"
}

function resolveTableTitle(element: HTMLElement): string {
  return textFromSelector(element, ".aimd-field__name") || "Table"
}

function resolveCalloutTitle(element: HTMLElement): string {
  return textFromSelector(element, ".aimd-callout__title-text")
    || textFromSelector(element, ".aimd-callout__badge-label")
    || "Callout"
}

function resolveCalloutSummary(element: HTMLElement): string | undefined {
  const summary = textFromSelector(element, ".aimd-callout__body")
  return summary ? summary.slice(0, 140) : undefined
}

function parseNumberAttribute(element: HTMLElement, attributeName: string): number | null {
  const raw = element.getAttribute(attributeName)
  if (!raw) return null
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDurationSummary(durationMs: number): string {
  if (durationMs >= 60 * 60 * 1000) {
    const hours = durationMs / (60 * 60 * 1000)
    return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`
  }
  if (durationMs >= 60 * 1000) {
    const minutes = durationMs / (60 * 1000)
    return `${minutes % 1 === 0 ? minutes.toFixed(0) : minutes.toFixed(1)}m`
  }
  if (durationMs >= 1000) {
    const seconds = durationMs / 1000
    return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
  }
  return `${Math.round(durationMs)}ms`
}

function resolveStepStatus(element: HTMLElement): ProtocolAnchorStatus {
  const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (checkbox?.checked) {
    return "completed"
  }

  if (
    element.querySelector(".aimd-step-timer__hero--overtime")
    || element.querySelector(".aimd-step-timer__pill--error")
    || element.querySelector(".aimd-rec-card__input--error")
  ) {
    return "error"
  }

  if (
    element.querySelector(".aimd-step-timer__hero--warning")
    || element.querySelector(".aimd-step-timer__hero--countdown")
    || element.querySelector(".aimd-step-timer__pill--running")
  ) {
    return "warning"
  }

  return "default"
}

function resolveStepSummary(element: HTMLElement): string | undefined {
  const summaryParts: string[] = []
  const estimatedDurationMs = parseNumberAttribute(element, "data-aimd-estimated-duration-ms")
  const timerMode = normalizeText(element.getAttribute("data-aimd-timer-mode"))

  if (estimatedDurationMs && estimatedDurationMs > 0) {
    summaryParts.push(`Estimate ${formatDurationSummary(estimatedDurationMs)}`)
  }

  if (timerMode) {
    summaryParts.push(`Timer ${timerMode}`)
  }

  const liveTimerLabel = normalizeText(
    textFromSelector(element, ".aimd-step-timer__hero")
    || textFromSelector(element, ".aimd-step-timer__pill--actual")
    || textFromSelector(element, ".aimd-step-timer__pill--estimate"),
  )
  if (liveTimerLabel) {
    summaryParts.push(liveTimerLabel)
  }

  if (summaryParts.length === 0) {
    const subtitle = normalizeText(element.getAttribute("data-aimd-subtitle"))
    return subtitle || undefined
  }

  return summaryParts.join(" • ")
}

function extractProtocolAnchors(contentRoot: HTMLElement): ProtocolAnchor[] {
  const candidates = Array.from(contentRoot.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR))
  const seen = new Set<HTMLElement>()
  const anchors: ProtocolAnchor[] = []

  candidates.forEach((element, index) => {
    if (seen.has(element)) return
    seen.add(element)

    let kind: ProtocolAnchorKind | null = null
    let level = 3
    let title = ""
    let summary: string | undefined
    let status: ProtocolAnchorStatus = "default"

    if (element.matches("h2, h3")) {
      kind = "section"
      level = element.tagName.toLowerCase() === "h2" ? 1 : 2
      title = normalizeText(element.textContent)
    } else if (element.matches(STEP_SELECTOR)) {
      kind = "step"
      level = 2
      title = resolveStepTitle(element)
      summary = resolveStepSummary(element)
      status = resolveStepStatus(element)
    } else if (element.matches(CHECK_SELECTOR)) {
      kind = "check"
      level = 3
      title = resolveCheckTitle(element)
      const checkedInput = element.querySelector<HTMLInputElement>('input[type="checkbox"]')
      status = checkedInput?.checked ? "completed" : "default"
    } else if (element.matches(TABLE_SELECTOR)) {
      kind = "table"
      level = 3
      title = resolveTableTitle(element)
      status = element.querySelector(".aimd-rec-card__input--error") ? "error" : "default"
    } else if (element.matches(IMPORTANT_CALLOUT_SELECTOR)) {
      kind = "callout"
      level = 3
      title = resolveCalloutTitle(element)
      summary = resolveCalloutSummary(element)
      status = resolveCalloutStatus(element)
    }

    if (!kind || !title) return

    anchors.push({
      id: ensureAnchorId(element, kind, index),
      kind,
      level,
      title,
      summary,
      status,
      element,
      topRatio: computeTopRatio(contentRoot, element),
    })
  })

  return anchors
}

function resolveActiveAnchorId(
  scrollContainer: HTMLElement,
  anchors: ProtocolAnchor[],
): string | null {
  if (anchors.length === 0) return null

  const containerRect = scrollContainer.getBoundingClientRect()
  const viewportTop = containerRect.top + 8
  const viewportBottom = containerRect.bottom - 8
  const targetY = containerRect.top + containerRect.height * 0.24

  let bestId: string | null = anchors[0].id
  let bestDistance = Number.POSITIVE_INFINITY

  for (const anchor of anchors) {
    const rect = anchor.element.getBoundingClientRect()
    if (rect.height === 0) continue
    if (rect.bottom < viewportTop || rect.top > viewportBottom) continue

    const distance = Math.abs(rect.top - targetY)
    if (distance < bestDistance) {
      bestDistance = distance
      bestId = anchor.id
    }
  }

  if (bestId) return bestId

  const fallbackTop = scrollContainer.getBoundingClientRect().top + scrollContainer.clientHeight * 0.24
  for (const anchor of anchors) {
    if (anchor.element.getBoundingClientRect().top >= fallbackTop) {
      return anchor.id
    }
  }

  return anchors[anchors.length - 1]?.id ?? null
}

export function useProtocolNavigator(options: UseProtocolNavigatorOptions) {
  const anchors = ref<ProtocolAnchor[]>([])
  const activeAnchorId = ref<string | null>(null)
  const hoveredAnchorId = ref<string | null>(null)

  let intersectionObserver: IntersectionObserver | null = null
  let refreshFrame: number | null = null

  function disconnectIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect()
      intersectionObserver = null
    }
  }

  function updateActiveAnchorFromViewport() {
    const scrollContainer = options.scrollContainerRef.value
    if (!scrollContainer || anchors.value.length === 0) {
      activeAnchorId.value = null
      return
    }
    activeAnchorId.value = resolveActiveAnchorId(scrollContainer, anchors.value)
  }

  function connectIntersectionObserver() {
    disconnectIntersectionObserver()

    const scrollContainer = options.scrollContainerRef.value
    if (!scrollContainer || anchors.value.length === 0) return

    intersectionObserver = new IntersectionObserver(
      () => {
        updateActiveAnchorFromViewport()
      },
      {
        root: scrollContainer,
        rootMargin: "-20% 0px -68% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    )

    anchors.value.forEach((anchor) => {
      intersectionObserver?.observe(anchor.element)
    })

    updateActiveAnchorFromViewport()
  }

  function refreshAnchors() {
    const contentRoot = options.contentRootRef.value
    if (!contentRoot) {
      anchors.value = []
      activeAnchorId.value = null
      disconnectIntersectionObserver()
      return
    }

    anchors.value = extractProtocolAnchors(contentRoot)
    connectIntersectionObserver()
  }

  function scheduleRefresh() {
    if (refreshFrame !== null) return
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = null
      refreshAnchors()
    })
  }

  function scrollToAnchor(anchorId: string) {
    const target = anchors.value.find((anchor) => anchor.id === anchorId)
    if (!target) return
    target.element.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })
    activeAnchorId.value = target.id
  }

  function setHoveredAnchor(anchorId: string) {
    hoveredAnchorId.value = anchorId
  }

  function clearHoveredAnchor() {
    hoveredAnchorId.value = null
  }

  watch(
    [() => options.enabled?.value ?? true, options.content],
    ([enabled]) => {
      if (!enabled) {
        anchors.value = []
        activeAnchorId.value = null
        disconnectIntersectionObserver()
        return
      }
      void nextTick(() => {
        scheduleRefresh()
      })
    },
    { immediate: true },
  )

  watch(
    [options.scrollContainerRef, options.contentRootRef],
    ([scrollContainer, contentRoot], _prev, onCleanup) => {
      if (!scrollContainer || !contentRoot) return

      const resizeObserver = new ResizeObserver(() => {
        scheduleRefresh()
      })
      resizeObserver.observe(scrollContainer)
      resizeObserver.observe(contentRoot)

      const mutationObserver = new MutationObserver(() => {
        scheduleRefresh()
      })
      mutationObserver.observe(contentRoot, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      })

      onCleanup(() => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()
      })

      void nextTick(() => {
        scheduleRefresh()
      })
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    disconnectIntersectionObserver()
    if (refreshFrame !== null) {
      cancelAnimationFrame(refreshFrame)
      refreshFrame = null
    }
  })

  return {
    anchors,
    activeAnchorId,
    hoveredAnchorId,
    refreshAnchors,
    scrollToAnchor,
    setHoveredAnchor,
    clearHoveredAnchor,
  }
}

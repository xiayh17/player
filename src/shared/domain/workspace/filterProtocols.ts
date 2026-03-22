import type { ProtocolEntry } from "./workspaceTypes"

export function filterProtocols(protocols: ProtocolEntry[], query: string): ProtocolEntry[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return protocols

  return protocols.filter((protocol) =>
    protocol.name.toLowerCase().includes(normalizedQuery)
    || (protocol.title ?? "").toLowerCase().includes(normalizedQuery)
    || protocol.path.toLowerCase().includes(normalizedQuery),
  )
}

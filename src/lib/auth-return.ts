export function getAuthReturnPath(state: unknown) {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/"
  }

  const from = state.from

  if (typeof from === "string" && from.startsWith("/")) {
    return from
  }

  if (from && typeof from === "object" && "pathname" in from) {
    const pathname = typeof from.pathname === "string" ? from.pathname : "/"
    const search = "search" in from && typeof from.search === "string" ? from.search : ""
    const hash = "hash" in from && typeof from.hash === "string" ? from.hash : ""
    return `${pathname}${search}${hash}`
  }

  return "/"
}

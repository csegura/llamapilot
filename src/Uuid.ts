let poorManUuid = 0

export function nextId() {
  return `${poorManUuid++}`
}

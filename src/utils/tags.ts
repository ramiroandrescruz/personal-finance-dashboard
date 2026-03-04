const splitByComma = (value: string): string[] => value.split(',').map((item) => item.trim()).filter(Boolean)

export const normalizeTags = (tags: string[]): string[] => {
  const seen = new Set<string>()
  const normalized: string[] = []

  tags.forEach((tag) => {
    const trimmed = tag.trim()

    if (!trimmed) {
      return
    }

    const key = trimmed.toLowerCase()

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    normalized.push(trimmed)
  })

  return normalized
}

export const parseTagsInput = (value: string): string[] => {
  return normalizeTags(splitByComma(value))
}

export const formatTags = (tags: string[]): string => {
  return normalizeTags(tags).join(', ')
}

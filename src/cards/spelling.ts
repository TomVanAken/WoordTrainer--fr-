/** A run of characters; `diff` marks the characters that differ from the other text. */
export type Seg = { text: string; diff: boolean }

const fold = (c: string) => c.toLowerCase()

/** Damerau-Levenshtein (optimal string alignment) distance, case-insensitive: an adjacent swap is 1 edit. */
export function editDistance(a: string, b: string): number {
  const x = [...a].map(fold)
  const y = [...b].map(fold)
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)])
  for (let j = 1; j <= y.length; j++) d[0][j] = j
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[x.length][y.length]
}

function toSegs(chars: string[], flags: boolean[]): Seg[] {
  const segs: Seg[] = []
  chars.forEach((c, i) => {
    const last = segs[segs.length - 1]
    if (last && last.diff === flags[i]) last.text += c
    else segs.push({ text: c, diff: flags[i] })
  })
  return segs
}

/**
 * Aligns two texts (case-insensitively) and marks the characters that differ on each side.
 * An extra letter in `a` is marked in `a`; a letter missing from `a` is marked in `b`;
 * a wrong letter is marked on both sides. Each side's segments join back to its input.
 */
export function diffMark(a: string, b: string): { a: Seg[]; b: Seg[] } {
  const x = [...a]
  const y = [...b]
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)])
  for (let j = 1; j <= y.length; j++) d[0][j] = j
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = fold(x[i - 1]) === fold(y[j - 1]) ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }
  const fa = x.map(() => false)
  const fb = y.map(() => false)
  let i = x.length
  let j = y.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = fold(x[i - 1]) === fold(y[j - 1])
      if (d[i][j] === d[i - 1][j - 1] + (same ? 0 : 1)) {
        if (!same) fa[i - 1] = fb[j - 1] = true
        i--
        j--
        continue
      }
    }
    if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      fa[i - 1] = true
      i--
    } else {
      fb[j - 1] = true
      j--
    }
  }
  return { a: toSegs(x, fa), b: toSegs(y, fb) }
}

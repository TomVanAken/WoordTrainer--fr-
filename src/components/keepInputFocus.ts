import type { MouseEvent, PointerEvent } from 'react'

/**
 * Spread on buttons shown next to the answer input: tapping them must not move the focus away
 * from the input, or a phone closes its keyboard (and iOS won't reopen it programmatically).
 */
export const keepInputFocus = {
  onMouseDown: (e: MouseEvent) => e.preventDefault(),
  onPointerDown: (e: PointerEvent) => e.preventDefault(),
}

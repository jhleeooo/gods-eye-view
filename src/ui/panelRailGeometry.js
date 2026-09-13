/**
 * Resolve a vertically centered panel slot inside a HUD rail while respecting
 * live rectangles that intersect that rail above or below the viewport center.
 */
export function resolveHudRailLayout({
  viewportHeight,
  panelHeight,
  laneLeft,
  laneRight,
  obstacles = [],
  baseTop,
  baseBottom,
  gap = 12,
  align = 'center',
}) {
  if (
    ![
      viewportHeight,
      panelHeight,
      laneLeft,
      laneRight,
      baseTop,
      baseBottom,
    ].every(Number.isFinite) ||
    viewportHeight <= 0 ||
    laneRight <= laneLeft
  )
    return null;
  const midpoint = viewportHeight * 0.5;
  let safeTop = Math.max(0, baseTop);
  let safeBottom = Math.min(viewportHeight, baseBottom);

  for (const rect of obstacles) {
    if (
      ![rect?.left, rect?.right, rect?.top, rect?.bottom].every(Number.isFinite)
    )
      continue;
    if (
      rect.right <= laneLeft ||
      rect.left >= laneRight ||
      rect.bottom <= rect.top
    )
      continue;
    if (rect.bottom <= midpoint) safeTop = Math.max(safeTop, rect.bottom + gap);
    else if (rect.top >= midpoint)
      safeBottom = Math.min(safeBottom, rect.top - gap);
  }

  safeBottom = Math.max(safeTop, safeBottom);
  const availableHeight = Math.max(0, safeBottom - safeTop);
  const renderedHeight = Math.min(Math.max(0, panelHeight), availableHeight);
  return {
    top:
      align === 'start'
        ? safeTop
        : safeTop + Math.max(0, (availableHeight - renderedHeight) * 0.5),
    maxHeight: availableHeight,
    safeTop,
    safeBottom,
    constrained: panelHeight > availableHeight,
  };
}

/**
 * Yield each obstacle rect that can actually occlude the rail: elements
 * inside the rail itself are excluded, as are elements hidden via an
 * ancestor's `display`/`visibility`/`opacity` or that currently render at
 * zero size.
 * @param {Iterable<HTMLElement>} obstacles Candidate obstacle nodes.
 * @param {HTMLElement} stack Rail element obstacles must fall outside of.
 * @param {Function} getComputedStyle DOM style reader.
 * @returns {Generator<{element: HTMLElement, rect: DOMRect}>}
 */
export function* iterateVisibleObstacles(obstacles, stack, getComputedStyle) {
  for (const element of obstacles) {
    if (stack.contains(element)) continue;
    let hiddenByAncestor = false;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0
      ) {
        hiddenByAncestor = true;
        break;
      }
    }
    if (hiddenByAncestor) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    yield { element, rect };
  }
}

/**
 * Tactical HUD gives an expanded right-rail panel the whole control lane.
 * Other HUD layouts keep collapsed launchers visible for quick switching.
 *
 * @param {object} input Current rail state.
 * @param {string} input.hudVariant Active HUD layout variant.
 * @param {boolean} input.hasExpandedPanel Whether any rail panel is expanded.
 * @returns {boolean} Whether collapsed sibling launchers should be hidden.
 */
export function shouldHideCollapsedRightPanels({
  hudVariant,
  hasExpandedPanel,
}) {
  return hudVariant === 'tactical' && Boolean(hasExpandedPanel);
}

/** Keep dashboard cards legible as iPad windows are resized. */
export function getDashboardColumns(
  windowWidth: number,
  fontScale: number,
  horizontalPadding: number,
  cardGap: number,
): number {
  const preferredColumns = fontScale >= 1.6 ? 1 : windowWidth >= 1180 ? 4 : windowWidth >= 768 ? 3 : 2;
  const availableWidth = Math.max(0, windowWidth - horizontalPadding * 2);
  const minCardWidth = 160;
  const fittingColumns = Math.max(1, Math.floor((availableWidth + cardGap) / (minCardWidth + cardGap)));
  return Math.min(preferredColumns, fittingColumns);
}

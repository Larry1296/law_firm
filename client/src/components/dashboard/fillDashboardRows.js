// Cells each tile size covers in the 4-column xl dashboard grid.
const XL_CELLS = {
  small: 1,
  medium: 2,
  tall: 4,
  wide: 2,
  large: 4,
  full: 4,
};

const XL_COLUMNS = 4;

// Widen the wide tile left before a gap (the end of the grid, or a
// full-width tile) to full width, so no dashboard row is left half empty.
export default function fillDashboardRows(tiles) {
  const result = tiles.map((tile) => ({ ...tile }));
  let filled = 0;

  const closeRow = (index) => {
    const previous = result[index - 1];
    if (filled % XL_COLUMNS === XL_COLUMNS / 2 && previous?.size === 'wide') {
      previous.size = 'full';
    }
    filled = 0;
  };

  result.forEach((tile, index) => {
    if (tile.size === 'full') closeRow(index);
    filled += XL_CELLS[tile.size] ?? 1;
  });
  closeRow(result.length);

  return result;
}

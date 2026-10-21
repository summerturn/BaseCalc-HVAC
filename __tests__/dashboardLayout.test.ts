import { getDashboardColumns } from '../src/lib/dashboardLayout';

describe('dashboard card columns', () => {
  const columnsFor = (width: number, fontScale = 1) =>
    getDashboardColumns(width, fontScale, 20, width < 500 ? 12 : 14);

  it('keeps cards usable in a narrow resized iPad window', () => {
    expect(columnsFor(320)).toBe(1);
    expect(columnsFor(360)).toBe(1);
    expect(columnsFor(375)).toBe(2);
  });

  it('restores tablet columns as the same window widens', () => {
    expect(columnsFor(768)).toBe(3);
    expect(columnsFor(1180)).toBe(4);
  });

  it('uses one column for large text or a temporarily zero-width window', () => {
    expect(columnsFor(1180, 1.6)).toBe(1);
    expect(columnsFor(0)).toBe(1);
  });
});

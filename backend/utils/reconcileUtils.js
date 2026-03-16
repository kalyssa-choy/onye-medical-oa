export const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const RELIABILITY_ORDER = { low: 0, medium: 1, high: 2 };

export const selectBestSource = (sources) => {
  const sortedSources = [...sources].sort((a, b) => {
    const relA = RELIABILITY_ORDER[a.source_reliability] ?? 0;
    const relB = RELIABILITY_ORDER[b.source_reliability] ?? 0;

    if (relA !== relB) return relB - relA;

    const dateA = new Date(a.last_updated).getTime();
    const dateB = new Date(b.last_updated).getTime();
    return dateB - dateA;
  });

  return sortedSources[0];
};

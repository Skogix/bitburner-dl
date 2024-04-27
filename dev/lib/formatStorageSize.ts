const formatStorageSize = (size: number): string => {
  const units = ['MB', 'GB', 'TB', 'PB'];
  let unitIndex = 0;
  while (size >= 1000) {
    size /= 1000;
    unitIndex++;
  }
  return `${Math.round(size * 100) / 100} ${units[Math.min(unitIndex, units.length - 1)]}`;
};

export default formatStorageSize;

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatTimeAgo(timestamp: number): string {
  const elapsed = Math.floor((Date.now() - timestamp) / 1000);
  if (elapsed < 3) return 'Just now';
  if (elapsed < 60) return `${elapsed}s ago`;
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

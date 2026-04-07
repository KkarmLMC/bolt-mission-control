import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status">
      You're offline. Changes will sync when you reconnect.
    </div>
  );
}

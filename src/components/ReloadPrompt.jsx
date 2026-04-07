import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Poll for updates every hour (catches updates for long-lived tabs)
      if (registration) {
        setInterval(async () => {
          if (registration.installing || !navigator.onLine) return;
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          });
          if (resp.status === 200) await registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration failed:', error);
    },
  });

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="reload-prompt">
      <p className="reload-prompt__text">
        {offlineReady
          ? 'App ready for offline use.'
          : 'A new version is available.'}
      </p>
      <div className="reload-prompt__actions">
        {needRefresh && (
          <button
            className="reload-prompt__btn reload-prompt__btn--primary"
            onClick={() => updateServiceWorker(true)}
          >
            Update now
          </button>
        )}
        <button
          className="reload-prompt__btn"
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

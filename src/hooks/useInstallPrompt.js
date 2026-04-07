import { useState, useEffect } from 'react';

// ─── Android / Chrome install prompt ──────────────────────────
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    if (isInstalled) return;
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const installed = () => { setIsInstalled(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, [isInstalled]);

  const promptInstall = async () => {
    if (!deferredPrompt) return null;
    const result = await deferredPrompt.prompt();
    setDeferredPrompt(null);
    return result.outcome;
  };

  return { isInstallable: !!deferredPrompt, isInstalled, promptInstall };
}

// ─── iOS install detection ────────────────────────────────────
export function useIOSInstallPrompt() {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches);

  return { showInstallBanner: isIOS && !isStandalone };
}

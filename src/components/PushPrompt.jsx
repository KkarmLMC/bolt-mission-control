import { useState, useEffect } from 'react';
import { subscribeToPush, getPushPermissionState } from '../lib/push';

export function PushPrompt({ message, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const permission = getPushPermissionState();
    // Only show if permission hasn't been decided yet
    if (permission === 'default') {
      // Check if user dismissed recently (localStorage throttle)
      const lastDismissed = localStorage.getItem('push_prompt_dismissed');
      if (lastDismissed) {
        const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return; // Don't ask again for 7 days
      }
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    // iOS requires this to be inside a click handler (user gesture)
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPush();
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', Date.now().toString());
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className="push-prompt">
      <p className="push-prompt__message">{message}</p>
      <div className="push-prompt__actions">
        <button className="push-prompt__btn push-prompt__btn--primary" onClick={handleEnable}>
          Enable notifications
        </button>
        <button className="push-prompt__btn" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}

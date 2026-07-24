'use client';

import { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX, FiSend } from 'react-icons/fi';
import { VAPID_PUBLIC_KEY } from '@/lib/vapidKeys';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('Service Worker registration failed:', err);
    });

    if (Notification.permission === 'default') {
      setShowBanner(true);
    } else if (Notification.permission === 'granted') {
      setSubscribed(true);
    }

    const interval = setInterval(() => {
      fetch('/api/push/check-reminders').catch(() => {});
    }, 60000);

    fetch('/api/push/check-reminders').catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            userAgent: navigator.userAgent
          })
        });

        setSubscribed(true);
        setShowBanner(false);
      } else {
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!showBanner || subscribed) return null;

  return (
    <div style={{
      backgroundColor: 'var(--primary-bg)',
      border: '1px solid var(--primary)',
      borderRadius: 'var(--radius)',
      padding: '12px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
        <FiBell style={{ fontSize: '20px', color: 'var(--primary-light)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.4' }}>
          Ative as <strong>Notificações Push</strong> para receber lembretes de tarefas e reuniões no Windows e Celular.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn-primary"
          style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
        >
          <FiCheck /> {loading ? 'Ativando...' : 'Ativar Notificações'}
        </button>
        <button
          onClick={() => setShowBanner(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}

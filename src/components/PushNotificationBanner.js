'use client';

import { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa1F3A_vFf1K-tF5iP117j8x8m90iZ-qKj-65Z1';

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

    // Registrar Service Worker
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('Service Worker registration failed:', err);
    });

    // Checar permissão atual
    if (Notification.permission === 'default') {
      setShowBanner(true);
    } else if (Notification.permission === 'granted') {
      setSubscribed(true);
    }

    // Timer silencioso de verificação de lembretes a cada 60s
    const interval = setInterval(() => {
      fetch('/api/push/check-reminders').catch(() => {});
    }, 60000);

    // Executar 1x na inicialização
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
      borderBottom: '1px solid var(--primary)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 99
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FiBell style={{ fontSize: '20px', color: 'var(--primary-light)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>
          Ative as <strong>Notificações Push</strong> para receber lembretes de tarefas e reuniões diretamente no Windows e Celular.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FiCheck /> {loading ? 'Ativando...' : 'Ativar Notificações'}
        </button>
        <button
          onClick={() => setShowBanner(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}

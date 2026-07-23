import { db } from '../db/lifeDB';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

/**
 * Check current Notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Request permission for Web and Mobile PWA Push Notifications
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    alert('Tu navegador o dispositivo no soporta notificaciones Web/PWA.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendNotification({
        title: '🔔 ¡Notificaciones Activadas!',
        body: 'LifeOS Pro por Vexora Labs te notificará sobre vencimientos de documentos, seguros y garantías.',
        tag: 'welcome-notification'
      });
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Send native notification via ServiceWorker (for Mobile PWA / Android Chrome) or Fallback Notification API
 */
export const sendNotification = async (payload: NotificationPayload): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notifications permission not granted.');
    return false;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || 'lifeos-alert',
    data: payload.data || {},
  };

  try {
    let sent = false;

    // 1. Check ServiceWorker Registration with timeout to prevent hanging if SW is not ready
    if ('serviceWorker' in navigator) {
      try {
        const registration = await Promise.race([
          navigator.serviceWorker.getRegistration(),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 600))
        ]);

        if (registration && registration.active && 'showNotification' in registration) {
          await registration.showNotification(payload.title, options);
          sent = true;
        }
      } catch (swErr) {
        console.warn('ServiceWorker showNotification failed, using fallback:', swErr);
      }
    }

    // 2. Desktop & Standard Web Notification API Fallback
    if (!sent) {
      new Notification(payload.title, options);
    }
    return true;
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
};

/**
 * Send test notification for mobile verification
 */
export const sendTestNotification = async (): Promise<boolean> => {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    const res = await requestNotificationPermission();
    if (res !== 'granted') return false;
  }

  return sendNotification({
    title: '🚀 Notificación de Prueba Exitosa',
    body: 'Las notificaciones de LifeOS Pro (Vexora Labs) funcionan correctamente en tu dispositivo.',
    tag: 'test-notification'
  });
};

/**
 * Scans database and triggers notifications for upcoming expirations (documents, vehicle insurance, warranties)
 */
export const checkAndTriggerExpirations = async (userId: string) => {
  if (getNotificationPermission() !== 'granted') return;

  try {
    const now = new Date();
    const cleanUserId = userId ? userId.trim().toLowerCase() : 'local_user';

    const parseExpiryDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
      }
      return new Date(dateStr);
    };

    const isMatchUser = (recordUserId?: string) => {
      if (!recordUserId) return true;
      const recId = recordUserId.trim().toLowerCase();
      return recId === cleanUserId || recId === 'local_user' || cleanUserId === 'local_user';
    };

    // 1. Documents
    const allDocs = await db.documents.toArray();
    const userDocs = allDocs.filter(d => isMatchUser(d.userId) && d.expiryDate && !d.archived && !d.deleted);

    for (const doc of userDocs) {
      const exp = parseExpiryDate(doc.expiryDate!);
      const diffMs = exp.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0 && daysLeft <= 7) {
        sendNotification({
          title: `⚠️ Vencimiento Próximo: ${doc.name}`,
          body: daysLeft === 0 ? `Tu documento vence HOY (${doc.expiryDate}).` : `Tu documento vence en ${daysLeft} día(s) (${doc.expiryDate}).`,
          tag: `doc-exp-${doc.id}`
        });
      }
    }

    // 2. Vehicle Insurance
    const allVehicles = await db.vehicles.toArray();
    const userVehicles = allVehicles.filter(v => isMatchUser(v.userId) && v.insuranceExpiry);

    for (const v of userVehicles) {
      const exp = parseExpiryDate(v.insuranceExpiry!);
      const diffMs = exp.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0 && daysLeft <= 7) {
        sendNotification({
          title: `🚗 Seguro de Vehículo por Vencer`,
          body: `El seguro de ${v.brand} ${v.model} (${v.plates}) vence en ${daysLeft} día(s).`,
          tag: `veh-ins-${v.id}`
        });
      }
    }

    // 3. Warranties
    const allWarranties = await db.warranties.toArray();
    const userWarranties = allWarranties.filter(w => isMatchUser(w.userId) && w.expiryDate && w.status === 'active');

    for (const w of userWarranties) {
      const exp = parseExpiryDate(w.expiryDate!);
      const diffMs = exp.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0 && daysLeft <= 7) {
        sendNotification({
          title: `🛡️ Garantía por Vencer`,
          body: `La garantía de ${w.productName} vence en ${daysLeft} día(s).`,
          tag: `war-exp-${w.id}`
        });
      }
    }
  } catch (err) {
    console.error('Error running expiration check:', err);
  }
};


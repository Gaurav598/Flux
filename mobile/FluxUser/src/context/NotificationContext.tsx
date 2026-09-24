import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import {NotificationDeduper} from '../utils/notificationDeduper';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  onPress?: () => void;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Notification | Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const deduper = useRef(new NotificationDeduper()).current;

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (notification: Notification | Omit<Notification, 'id'>) => {
      const id =
        'id' in notification && notification.id
          ? String(notification.id)
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (!deduper.accept(id)) {
        return;
      }

      setNotifications(prev => {
        const newNotification = {...notification, id};
        return [...prev.slice(-2), newNotification];
      });
    },
    [deduper],
  );

  return (
    <NotificationContext.Provider
      value={{notifications, showNotification, hideNotification}}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

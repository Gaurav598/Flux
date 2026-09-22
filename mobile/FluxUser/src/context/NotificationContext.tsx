import React, {createContext, useContext, useState, useCallback} from 'react';

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

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (notification: Notification | Omit<Notification, 'id'>) => {
      const id = 'id' in notification && notification.id ? notification.id : Math.random().toString(36).substring(7);
      
      setNotifications(prev => {
        // Deduplicate: if a notification with this ID already exists, don't add it again
        if (prev.some(n => n.id === id)) {
          return prev;
        }
        
        // Auto hide after 5 seconds for new notifications
        setTimeout(() => {
          hideNotification(id);
        }, 5000);
        
        const newNotification = {...notification, id};
        return [...prev, newNotification];
      });
    },
    [hideNotification],
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

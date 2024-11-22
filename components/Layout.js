// components/Layout.js
import { useEffect, useState } from 'react';
import { getUserNotifications, markNotificationAsRead } from '../utils/firebase/firebaseNotifications';
import Navbar from './Navbar';
import styles from '../styles/Layout.module.css';

export default function Layout({ children, user }) {
  const [topNotification, setTopNotification] = useState(null);

  useEffect(() => {
    // Buscar notificações do tipo "top" para o usuário atual assim que o user estiver disponível
    if (user?.id) {
      const fetchTopNotification = async () => {
        try {
          const notifications = await getUserNotifications(user.id);
          const topNotification = notifications.find(
            (notification) => notification.notificationType === 'top' && !notification.read
          );
          if (topNotification) {
            setTopNotification(topNotification);
          }
        } catch (error) {
          console.error('Erro ao buscar notificações do usuário:', error);
        }
      };

      fetchTopNotification();
    }
  }, [user]);

  const handleCloseBanner = async () => {
    if (topNotification) {
      try {
        await markNotificationAsRead(topNotification.id);
        setTopNotification(null);
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }
  };

  return (
    <div className={styles.layout}>
      {topNotification && (
        <div className={styles.notificationBanner}>
          <p>{topNotification.message}</p>
          <button className={styles.closeButton} onClick={handleCloseBanner} aria-label="Fechar banner de notificação">X</button>
        </div>
      )}
      <Navbar user={user} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

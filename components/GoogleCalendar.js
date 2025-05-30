import styles from '../styles/Remote.module.css';

export default function GoogleCalendar() {
    return (
        <div className={`${styles.calendarContainer} ${styles.cardContainer}`}>
          <iframe
            src="https://calendar.google.com/calendar/embed?height=600&wkst=2&ctz=America%2FSao_Paulo&showPrint=0&mode=WEEK&showTz=0&showTitle=0&title=Acesso%20Remoto&src=Y18yM2NhM2VkZDUzMjdjZDc2MTE4MDJiNzc1MTk4OTQ0YjkxZjkxM2UyNTE0ZGRhN2UyZTBhMjk1MDllMmFkNDM0QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&color=%23D81B60"
            style={{ border: 'solid 1px #777' }}
            width="800"
            height="600"
            title="Google Calendar"
          ></iframe>
        </div>
      );      
}

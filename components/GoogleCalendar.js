import styles from '../styles/Remote.module.css';

export default function GoogleCalendar() {
  return (
    <div className={styles.calendarContainer}>
      <iframe
        src="https://calendar.google.com/calendar/embed?src=c_23ca3edd5327cd7611802b775198944b91f913e2514dda7e2e0a29509e2ad434%40group.calendar.google.com&ctz=America%2FSao_Paulo"
        style={{ border: 0 }}
        width="800"
        height="600"
        title="Google Calendar"
      ></iframe>
    </div>
  );
}

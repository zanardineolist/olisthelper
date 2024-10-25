// components/Footer.js
import styles from '../styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.logoContainer}>
        <img src="/images/logos/OpenAI_logo.png" alt="OpenAI Logo" className={styles.logo} />
      </div>
      <p>© Desenvolvido por Rafael Zanardine e Lucas Wenglarek</p>
    </footer>
  );
}

// components/Footer.js
import styles from '../styles/Footer.module.css';
import openAILogo from '../../public/images/logos/OpenAI_logo.png';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.logoContainer}>
        <img src={openAILogo} alt="OpenAI Logo" className={styles.logo} />
      </div>
      <p>© Desenvolvido por Rafael Zanardine e Lucas Wenglarek</p>
    </footer>
  );
}

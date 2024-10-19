import { useState } from 'react';
import styles from './Login.module.css';
import axios from 'axios';
import { signIn } from 'next-auth/react';

export default function Login({ onRegister, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });
      if (response.status === 200) {
        console.log('Login successful', response.data);
        // Aqui você pode redirecionar o usuário ou salvar o token
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to log in. Please check your credentials.');
    }
  };  

  const handleGoogleLogin = () => {
    signIn('google');
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleLogin}>
        <img src="/logo.png" alt="Bootstrap Brain" />
        <div>
          <label className={styles.label}>Email *</label>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={styles.label}>Password *</label>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.button}>Log In</button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <button onClick={handleGoogleLogin} className={styles.button}>Log in with Google</button>
      <button onClick={onRegister} className={styles.button}>Create new account</button>
      <button onClick={onForgotPassword} className={styles.button}>Forgot password</button>
    </div>
  );
}

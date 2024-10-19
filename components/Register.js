import { useState } from 'react';
import styles from './Register.module.css';
import axios from 'axios';
import { signIn } from 'next-auth/react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('[Login Component] - Attempting login with:', email, password);
      const response = await axios.post('/api/login', {
        email,
        password,
      });
      if (response.status === 200) {
        console.log('[Login Component] - Login successful', response.data);
        // Aqui você pode redirecionar o usuário ou salvar o token
      }
    } catch (err) {
      console.error('[Login Component] - Login error:', err);
      setError(err.response?.data?.error || 'Failed to log in. Please check your credentials.');
    }
  };  

  const handleGoogleRegister = () => {
    signIn('google');
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleRegister}>
        <div>
          <label className={styles.label}>Name *</label>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
        <button type="submit" className={styles.button}>Register</button>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
      </form>
      <button onClick={handleGoogleRegister} className={styles.button}>Register with Google</button>
    </div>
  );
}

import { useState } from 'react';
import Login from '../components/Login';
import Register from '../components/Register';

export default function Home() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div>
      {!showRegister ? (
        <Login onRegister={() => setShowRegister(true)} onForgotPassword={() => {}} />
      ) : (
        <Register />
      )}
    </div>
  );
}

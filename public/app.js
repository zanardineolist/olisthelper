// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  
  // Google login button
  const googleLoginButton = document.getElementById('googleLoginButton');
  googleLoginButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        if (user && (user.email.endsWith('@tiny.com.br') || user.email.endsWith('@olist.com'))) {
          // Generate random ID for the user
          const userId = Math.floor(1000 + Math.random() * 9000);
  
          // Register user data to backend
          const userData = {
            id: userId,
            name: user.displayName,
            email: user.email,
            permission: 'user'
          };
          axios.post('/api/register', userData)
            .then(() => {
              alert('Usuário registrado com sucesso!');
            })
            .catch((error) => {
              console.error('Erro ao registrar usuário:', error);
            });
        } else {
          alert('Somente e-mails @tiny.com.br ou @olist.com são permitidos.');
          auth.signOut();
        }
      })
      .catch((error) => {
        console.error('Erro durante o login:', error);
      });
  });
  
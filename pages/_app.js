// pages/_app.js
import '../styles/globals.css';
import '../styles/shared-messages/variables.css';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;

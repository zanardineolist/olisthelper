import dynamic from 'next/dynamic';

const RegistrarPage = dynamic(() => import('../components/RegistrarForm'), {
  ssr: false,
});

export default RegistrarPage;
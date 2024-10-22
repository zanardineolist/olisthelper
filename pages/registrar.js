import dynamic from 'next/dynamic';

const RegistrarFormPage = dynamic(() => import('../components/RegistrarFormPage'), {
  ssr: false,
});

export default function RegistrarPage() {
  return <RegistrarFormPage />;
}

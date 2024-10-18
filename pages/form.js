import { useSession } from 'next-auth/react';
import { useState } from 'react';
import FormComponent from '../components/FormComponent';

export default function Form() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({ analista: '', categoria: '', descricao: '' });

  if (!session) {
    return <p>Você precisa estar logado para acessar o formulário.</p>;
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/appendSheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [formData.analista, formData.categoria, formData.descricao] }),
      });

      if (response.ok) {
        alert('Solicitação enviada com sucesso!');
        setFormData({ analista: '', categoria: '', descricao: '' });
      } else {
        throw new Error('Erro ao enviar solicitação');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar solicitação.');
    }
  };

  return (
    <FormComponent
      formData={formData}
      setFormData={setFormData}
      handleSubmit={handleSubmit}
    />
  );
}

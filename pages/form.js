import { useSession } from 'next-auth/react';
import { useState } from 'react';
import FormComponent from '../components/FormComponent';
import { appendToSheet } from '../utils/googleSheets';

export default function Form() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({ analista: '', categoria: '', descricao: '' });

  if (!session) {
    return <p>Você precisa estar logado para acessar o formulário.</p>;
  }

  const handleSubmit = async () => {
    try {
      await appendToSheet([formData.analista, formData.categoria, formData.descricao]);
      alert('Solicitação enviada com sucesso!');
      setFormData({ analista: '', categoria: '', descricao: '' });
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar solicitação.');
    }
  };

  return (
    <FormComponent formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} />
  );
}

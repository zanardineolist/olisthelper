import { useEffect, useState } from 'react';
import { getSession, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function RegistrarForm() {
  const sessionData = useSession();
  const router = useRouter();
  const [analysts, setAnalysts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    analyst: '',
    category: '',
    description: '',
  });

  // Verificações de status da sessão
  const { data: session, status } = sessionData;

  useEffect(() => {
    if (status === 'loading') return; // Não faça nada enquanto a sessão estiver carregando

    if (!session) {
      router.push('/'); // Redirecionar para a página inicial se não houver sessão
    } else if (session && session.user.profile !== 'analyst') {
      // Se o perfil do usuário não for 'analyst', redirecionar para a página principal
      router.push('/my');
    } else {
      // Carregar a lista de analistas e categorias da planilha
      fetch('/api/get-analysts-categories')
        .then((res) => res.json())
        .then((data) => {
          setAnalysts(data.analysts);
          setCategories(data.categories);
        })
        .catch((err) => console.error('Erro ao carregar analistas e categorias:', err));
    }
  }, [session, status, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
      alert('Você precisa estar autenticado para enviar o formulário.');
      return;
    }

    try {
      const response = await fetch('/api/register-doubt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userName: session.user.name,
          userEmail: session.user.email,
        }),
      });

      if (response.ok) {
        alert('Dúvida registrada com sucesso!');
        setFormData({ analyst: '', category: '', description: '' }); // Limpar o formulário após o envio
      } else {
        alert('Erro ao registrar a dúvida, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      alert('Erro ao registrar a dúvida, tente novamente.');
    }
  };

  // Mostrar carregamento enquanto a sessão estiver sendo carregada
  if (status === 'loading') {
    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
        Carregando...
      </div>
    );
  }

  // Renderizar o formulário apenas se a sessão estiver disponível
  if (!session) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
        Redirecionando...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212',
        padding: '20px',
        margin: '0',
      }}
    >
      <div
        style={{
          backgroundColor: '#1E1E1E',
          padding: '30px',
          borderRadius: '10px',
          maxWidth: '500px',
          width: '100%',
          color: '#fff',
        }}
      >
        <h2 style={{ color: '#F0A028' }}>Registrar Dúvida</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="analyst" style={{ display: 'block', marginBottom: '5px' }}>
              Selecione o analista
            </label>
            <select
              id="analyst"
              name="analyst"
              value={formData.analyst}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px' }}
            >
              <option value="">Selecione um analista</option>
              {analysts.map((analyst) => (
                <option key={analyst.id} value={analyst.id}>
                  {analyst.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="category" style={{ display: 'block', marginBottom: '5px' }}>
              Categoria da dúvida
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px' }}
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>
              Descrição da dúvida
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '5px' }}
            />
          </div>
          <button
            type="submit"
            style={{
              backgroundColor: '#E64E36',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%',
              transition: 'background-color 0.3s ease',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#F0A028')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#E64E36')}
          >
            Enviar Dúvida
          </button>
        </form>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function RegistrarForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analysts, setAnalysts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    analyst: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated' || !session) {
      router.push('/');
      return;
    }

    const loadAnalystsAndCategories = async () => {
      try {
        const res = await fetch('/api/get-analysts-categories');
        const data = await res.json();
        setAnalysts(data.analysts);
        setCategories(data.categories);
      } catch (err) {
        console.error('Erro ao carregar analistas e categorias:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalystsAndCategories();
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

    setSubmitting(true);

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
        setFormData({ analyst: '', category: '', description: '' }); // Limpa o formulário
      } else {
        alert('Erro ao registrar a dúvida, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      alert('Erro ao registrar a dúvida, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigation = (path) => {
    router.push(path);
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
        Carregando analistas e categorias...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
        Redirecionando...
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#121212',
        minHeight: '100vh',
        color: '#fff',
      }}
    >
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1E1E1E',
          padding: '10px 20px',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F0A028' }}>
          Olist Helper
        </div>
        <div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              backgroundColor: 'transparent',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
            }}
          >
            ☰
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#1E1E1E',
            padding: '10px 0',
          }}
        >
          <button
            onClick={() => handleNavigation('/my')}
            style={menuButtonStyle}
          >
            Página Inicial
          </button>
          <button
            onClick={() => handleNavigation('/registrar')}
            style={menuButtonStyle}
          >
            Registrar Dúvida
          </button>
          <button
            onClick={() => signOut()}
            style={menuButtonStyle}
          >
            Logout
          </button>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 60px)',
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
                backgroundColor: submitting ? '#F0A028' : '#E64E36',
                color: '#fff',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.3s ease',
              }}
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Enviar Dúvida'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const menuButtonStyle = {
  backgroundColor: '#E64E36',
  color: '#fff',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  marginBottom: '10px',
  transition: 'background-color 0.3s ease',
  width: '80%',
  textAlign: 'center',
};
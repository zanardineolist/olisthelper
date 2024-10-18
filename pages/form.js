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
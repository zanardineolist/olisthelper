import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../styles/ManageCategories.module.css';
import generalStyles from '../styles/Manager.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import stringSimilarity from 'string-similarity';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/manage-category');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao carregar categorias');
      }
      const data = await res.json();

      // Ordenar as categorias de A-Z
      const sortedCategories = data.categories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCategories);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao carregar categorias. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor ao carregar categorias. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Tentar novamente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setNewCategory(category.name);
    setCurrentCategory(category);
    setIsEditing(true);
    setModalIsOpen(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    const isConfirmed = await Swal.fire({
      title: 'Confirmar exclusão',
      text: 'Deseja realmente excluir esta categoria? Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: true,
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/manage-category?index=${categoryId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao deletar categoria');
      }

      const result = await res.json();

      await loadCategories(); // Recarrega a lista completa após deletar

      Swal.fire({
        icon: 'success',
        title: 'Categoria excluída!',
        text: result.message || 'A categoria foi excluída com sucesso.',
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao excluir categoria. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('já está inativa')) {
          errorMessage = err.message;
        } else if (err.message.includes('Categoria não encontrada')) {
          errorMessage = err.message;
        } else if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Entendi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      setLoading(true);

      // Validações do frontend
      if (!newCategory || !newCategory.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'Nome da categoria é obrigatório. Por favor, preencha o campo "Nome da Categoria".',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (newCategory.trim().length < 2) {
        Swal.fire({
          icon: 'error',
          title: 'Nome muito curto',
          text: 'Nome da categoria deve ter pelo menos 2 caracteres.',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (newCategory.trim().length > 100) {
        Swal.fire({
          icon: 'error',
          title: 'Nome muito longo',
          text: 'Nome da categoria deve ter no máximo 100 caracteres.',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      // Validação para garantir que a categoria não exista (somente ao adicionar)
      if (!isEditing) {
        const lowerCaseNewCategory = newCategory.trim().toLowerCase();
        const existingCategory = categories.find(
          (cat) => cat.name.toLowerCase() === lowerCaseNewCategory
        );
      
        if (existingCategory) {
          Swal.fire({
            icon: 'error',
            title: 'Categoria já existe',
            html: `A categoria <strong>"${existingCategory.name}"</strong> já está cadastrada.<br><br>Por favor, utilize um nome diferente.`,
            confirmButtonText: 'Entendi'
          });
          return;
        }

        // Validação de similaridade (somente ao adicionar)
        const categoryNames = categories.map((cat) => cat.name.toLowerCase());
        const similarityThreshold = 0.7;
        const similarCategory = stringSimilarity.findBestMatch(lowerCaseNewCategory, categoryNames);

        if (similarCategory.bestMatch.rating >= similarityThreshold) {
          const similarCategoryName = categories.find(
            (cat) => cat.name.toLowerCase() === similarCategory.bestMatch.target
          ).name;

          const result = await Swal.fire({
            icon: 'warning',
            title: 'Categoria similar encontrada',
            html: `Existe uma categoria similar já cadastrada: <strong>${similarCategoryName}</strong>.<br><br>Deseja realmente prosseguir com o cadastro desta nova categoria?`,
            showCancelButton: true,
            confirmButtonText: 'Sim, adicionar',
            cancelButtonText: 'Cancelar',
            allowOutsideClick: true,
          });

          if (!result.isConfirmed) {
            return;
          }
        }
      }

      // Adicionar ou Editar a Categoria
      const method = isEditing ? 'PUT' : 'POST';
      const body = { 
        name: newCategory.trim(),
        ...(isEditing && { uuid: currentCategory.uuid })
      };

      const res = await fetch('/api/manage-category', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar categoria');
      }

      const result = await res.json();

      await loadCategories(); // Recarrega a lista para ter os IDs corretos

      setNewCategory('');
      setIsEditing(false);
      setModalIsOpen(false);

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Categoria atualizada!' : 'Categoria adicionada!',
        text: result.message || (isEditing ? 'Categoria atualizada com sucesso.' : 'Categoria adicionada com sucesso.'),
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao salvar categoria. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('já existe')) {
          errorMessage = err.message;
        } else if (err.message.includes('obrigatório')) {
          errorMessage = err.message;
        } else if (err.message.includes('caracteres')) {
          errorMessage = err.message;
        } else if (err.message.includes('Categoria não encontrada')) {
          errorMessage = err.message;
        } else if (err.message.includes('já está inativa')) {
          errorMessage = err.message;
        } else if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Entendi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setNewCategory('');
    setCurrentCategory(null);
    setIsEditing(false);
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
  };

  return (
    <div className={`${generalStyles.main}`}>
      {/* Modal para adicionar/editar categoria */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Adicionar/Editar Categoria"
        className={generalStyles.modal}
        overlayClassName={generalStyles.overlay}
        ariaHideApp={false}
      >
        <h2 className={generalStyles.modalTitle}>{isEditing ? 'Editar Categoria' : 'Adicionar Categoria'}</h2>
        <div className={generalStyles.formContainer}>
          <input
            type="text"
            value={newCategory}
            placeholder="Nome da Categoria"
            className={generalStyles.inputField}
            onChange={(e) => setNewCategory(e.target.value)}
            required
            autoComplete="off"
          />
          <button onClick={handleSaveCategory} disabled={loading} className={generalStyles.saveButton}>
            {isEditing ? 'Atualizar Categoria' : 'Adicionar Categoria'}
          </button>
          <button onClick={handleCloseModal} className={generalStyles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Tabela de categorias */}
      <div className={`${generalStyles.cardContainer} ${styles.cardContainer}`}>
        <div className={generalStyles.cardHeader}>
          <h2 className={generalStyles.cardTitle}>Lista de Categorias</h2>
          <button onClick={handleOpenModal} className={generalStyles.addButton}>
            <FontAwesomeIcon icon={faPlus} /> Add Categoria
          </button>
        </div>
        <div className={styles.itemsTable}>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td className={generalStyles.actionButtons}>
                    <button onClick={() => handleEditCategory(category)} className={generalStyles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button onClick={() => handleDeleteCategory(category.id)} className={generalStyles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
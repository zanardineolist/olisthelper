import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../../styles/ManageCategories.module.css';
import generalStyles from '../../styles/Manager.module.css';
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
      if (!res.ok) throw new Error('Erro ao carregar categorias');
      const data = await res.json();

      // Ordenar as categorias de A-Z
      const sortedCategories = data.categories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCategories);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar categorias.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
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
      title: 'Tem certeza?',
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
      if (!res.ok) throw new Error('Erro ao deletar categoria');

      await loadCategories(); // Recarrega a lista completa após deletar

      Swal.fire({
        icon: 'success',
        title: 'Excluído!',
        text: 'A categoria foi excluída com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao deletar categoria.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      setLoading(true);

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
            html: `A categoria <strong>"${existingCategory.name}"</strong> já está cadastrada. Por favor, utilize esta categoria.`,
            showConfirmButton: true,
            allowOutsideClick: true,
          });
          setLoading(false);
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
            html: `Existe uma categoria similar já cadastrada: <strong>${similarCategoryName}</strong>. Deseja realmente prosseguir com o cadastro desta nova categoria?`,
            showCancelButton: true,
            confirmButtonText: 'Sim, adicionar',
            cancelButtonText: 'Cancelar',
            allowOutsideClick: true,
          });

          if (!result.isConfirmed) {
            setLoading(false);
            return;
          }
        }
      }

      // Adicionar ou Editar a Categoria
      const method = isEditing ? 'PUT' : 'POST';
      const body = { 
        name: newCategory,
        ...(isEditing && { uuid: currentCategory.uuid }) // Inclui o UUID apenas na edição
      };

      const res = await fetch('/api/manage-category', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Erro ao salvar categoria');

      await loadCategories(); // Recarrega a lista para ter os IDs corretos

      setNewCategory('');
      setIsEditing(false);
      setModalIsOpen(false);

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: isEditing ? 'Categoria atualizada com sucesso.' : 'Categoria adicionada com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao salvar categoria.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
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
    setNewCategory('');
    setIsEditing(false);
    setCurrentCategory(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newCategory.trim()) {
      handleSaveCategory();
    }
  };

  return (
    <div className={generalStyles.managerContainer}>
      <div className={generalStyles.managerHeader}>
        <h2 className={generalStyles.managerTitle}>Gerenciar Categorias</h2>
        <button 
          className={generalStyles.addButton} 
          onClick={handleOpenModal}
        >
          <FontAwesomeIcon icon={faPlus} /> Nova Categoria
        </button>
      </div>

      <div className={generalStyles.managerContent}>
        {loading ? (
          <div className="standardBoxLoader"></div>
        ) : (
          <div className={styles.categoriesList}>
            {categories.length === 0 ? (
              <p className={styles.noCategoriesMessage}>Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map((category) => (
                <div key={category.uuid} className={styles.categoryItem}>
                  <span className={styles.categoryName}>{category.name}</span>
                  <div className={styles.categoryActions}>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className={styles.editButton}
                      title="Editar categoria"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.uuid)}
                      className={styles.deleteButton}
                      title="Deletar categoria"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <div className={styles.modalContent}>
          <h3 className={styles.modalTitle}>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <form onSubmit={handleSubmit} className={styles.categoryForm}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nome da categoria"
              className={styles.categoryInput}
              required
              autoFocus
            />
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={handleCloseModal}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className={styles.saveButton}
                disabled={loading || !newCategory.trim()}
              >
                {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
} 
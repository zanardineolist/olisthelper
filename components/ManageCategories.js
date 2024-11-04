import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../styles/ManageCategories.module.css';
import generalStyles from '../styles/Manager.module.css'; // Importação do estilo geral
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import stringSimilarity from 'string-similarity'; // Importar a biblioteca de similaridade

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
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
      setCategories(data.categories);
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
    setCurrentCategoryId(category.id);
    setIsEditing(true);
    setModalIsOpen(true);
  };

  const handleDeleteCategory = async (categoryIndex) => {
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
      const res = await fetch(`/api/manage-category?index=${categoryIndex}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar categoria');

      await loadCategories();

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

      // Validação: verificar se a categoria já existe ou se é semelhante, ignorando a caixa alta/baixa
      const lowerCaseNewCategory = newCategory.trim().toLowerCase();
      const existingCategory = categories.find(
        (cat) => cat.name.toLowerCase() === lowerCaseNewCategory
      );

      if (existingCategory) {
        Swal.fire({
          icon: 'error',
          title: 'Categoria já existe',
          text: `A categoria "${existingCategory.name}" já está cadastrada. Por favor, utilize esta categoria.`,
          showConfirmButton: true,
          allowOutsideClick: true,
        });
        setLoading(false);
        return;
      }

      // Validação: verificar similaridade com outras categorias usando string-similarity
      const categoryNames = categories.map((cat) => cat.name.toLowerCase());
      const similarityThreshold = 0.7; // Definir um limite de similaridade (de 0 a 1)
      const similarCategory = stringSimilarity.findBestMatch(lowerCaseNewCategory, categoryNames);

      if (similarCategory.bestMatch.rating >= similarityThreshold) {
        const similarCategoryName = categories.find(
          (cat) => cat.name.toLowerCase() === similarCategory.bestMatch.target
        ).name;

        Swal.fire({
          icon: 'warning',
          title: 'Categoria similar encontrada',
          text: `Existe uma categoria similar já cadastrada: "${similarCategoryName}". Por favor, verifique antes de adicionar.`,
          showConfirmButton: true,
          allowOutsideClick: true,
        });
        setLoading(false);
        return;
      }

      // Caso não exista, prosseguir com o salvamento
      const method = isEditing ? 'PUT' : 'POST';
      const body = { name: newCategory };
      if (isEditing) {
        body.index = currentCategoryId;
      }

      const res = await fetch('/api/manage-category', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Erro ao salvar categoria');

      await loadCategories();

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

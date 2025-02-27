import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from '../../styles/Pagination.module.css';

const Pagination = ({ currentPage, totalPages, onChangePage }) => {
  // Se apenas uma página, não mostrar paginação
  if (totalPages <= 1) return null;

  // Criar array de páginas para exibir
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Se o total de páginas for menor ou igual ao máximo, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Sempre mostrar a primeira página
      pageNumbers.push(1);
      
      // Calcular páginas intermediárias
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Ajustar se necessário
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Sempre mostrar a última página
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  return (
    <nav className={styles.pagination} aria-label="Navegação de página">
      <button 
        onClick={() => onChangePage(currentPage - 1)}
        disabled={currentPage === 1}
        className={styles.pageButton}
        aria-label="Página anterior"
      >
        <FaChevronLeft />
      </button>
      
      <div className={styles.pageNumbers}>
        {getPageNumbers().map((page, index) => 
          page === '...' ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
          ) : (
            <button
              key={`page-${page}`}
              onClick={() => onChangePage(page)}
              className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
              aria-label={`Página ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>
      
      <button 
        onClick={() => onChangePage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={styles.pageButton}
        aria-label="Próxima página"
      >
        <FaChevronRight />
      </button>
    </nav>
  );
};

export default Pagination;
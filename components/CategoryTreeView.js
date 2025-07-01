import { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen } from 'react-icons/fa';
import styles from '../styles/ValidadorML.module.css';

// Utilitário para buscar categorias do ML
async function fetchCategory(id) {
  const res = await fetch(`/api/mercadolivre/tree?id=${id}`);
  if (!res.ok) throw new Error('Erro ao buscar categoria');
  return res.json();
}

async function fetchRootCategories() {
  const res = await fetch('/api/mercadolivre/tree');
  if (!res.ok) throw new Error('Erro ao buscar categorias raiz');
  return res.json();
}

function CategoryNode({ node, expanded, onToggle, onSelect, selectedId, children }) {
  return (
    <div className={styles.treeNode}>
      <div className={styles.treeNodeRow + (selectedId === node.id ? ' ' + styles.treeNodeSelected : '')}>
        {node.children_categories && node.children_categories.length > 0 ? (
          <button className={styles.treeToggleBtn} onClick={() => onToggle(node.id)}>
            {expanded ? <FaChevronDown /> : <FaChevronRight />}
          </button>
        ) : (
          <span className={styles.treeToggleBtn} style={{ opacity: 0.3 }}><FaChevronRight /></span>
        )}
        <button className={styles.treeNodeLabel} onClick={() => onSelect(node)}>
          {expanded ? <FaFolderOpen /> : <FaFolder />} {node.name}
        </button>
      </div>
      {expanded && children}
    </div>
  );
}

export default function CategoryTreeView({ rootCategoryId, onSelect, selectedId }) {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [childrenMap, setChildrenMap] = useState({});

  // Carrega categorias raiz ou a partir de rootCategoryId
  useEffect(() => {
    setLoading(true);
    setError('');
    if (rootCategoryId) {
      fetchCategory(rootCategoryId)
        .then(cat => setTree([cat]))
        .catch(() => setError('Erro ao carregar categoria'))
        .finally(() => setLoading(false));
    } else {
      fetchRootCategories()
        .then(setTree)
        .catch(() => setError('Erro ao carregar categorias'))
        .finally(() => setLoading(false));
    }
  }, [rootCategoryId]);

  // Carrega subcategorias sob demanda
  const handleToggle = async (id) => {
    setExpanded(exp => ({ ...exp, [id]: !exp[id] }));
    if (!childrenMap[id]) {
      const cat = await fetchCategory(id);
      setChildrenMap(map => ({ ...map, [id]: cat.children_categories || [] }));
    }
  };

  // Renderização recursiva
  const renderTree = (nodes) => (
    <div className={styles.treeList}>
      {nodes.map(node => (
        <CategoryNode
          key={node.id}
          node={node}
          expanded={!!expanded[node.id]}
          onToggle={handleToggle}
          onSelect={onSelect}
          selectedId={selectedId}
        >
          {expanded[node.id] && childrenMap[node.id] && childrenMap[node.id].length > 0 && (
            <div>
              {childrenMap[node.id].map(child => (
                <CategoryTreeView
                  key={child.id}
                  rootCategoryId={child.id}
                  onSelect={onSelect}
                  selectedId={selectedId}
                />
              ))}
            </div>
          )}
        </CategoryNode>
      ))}
    </div>
  );

  if (loading) return <div className={styles.treeLoading}>Carregando categorias...</div>;
  if (error) return <div className={styles.treeError}>{error}</div>;
  if (!tree.length) return <div className={styles.treeEmpty}>Nenhuma categoria encontrada.</div>;

  return renderTree(tree);
} 
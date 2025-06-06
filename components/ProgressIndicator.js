import styles from '../styles/ProgressIndicator.module.css';

const ProgressIndicator = ({ current, target, label, type = 'chamados' }) => {
  if (!target || target === 0) return null;

  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  
  // Determinar status baseado na porcentagem
  let status = 'poor';
  if (percentage >= 100) status = 'excellent';
  else if (percentage >= 50) status = 'good';

  // Ícones por tipo
  const getIcon = () => {
    switch (type) {
      case 'chamados': return 'fa-headset';
      case 'chat': return 'fa-comments';
      default: return 'fa-chart-line';
    }
  };

  return (
    <div className={`${styles.progressContainer} ${styles[status]}`}>
      <div className={styles.progressHeader}>
        <div className={styles.progressTitleSection}>
          <div className={styles.progressIcon}>
            <i className={`fa-solid ${getIcon()}`}></i>
          </div>
          <div className={styles.progressTitle}>
            <h3>{label}</h3>
            <p className={styles.progressSubtitle}>Meta Mensal de {type}</p>
          </div>
        </div>
        <div className={styles.progressStats}>
          <div className={styles.progressStat}>
            <span className={styles.progressValue}>{current.toLocaleString('pt-BR')}</span>
            <span className={styles.progressLabel}>Atual</span>
          </div>
          <div className={styles.progressSeparator}>/</div>
          <div className={styles.progressStat}>
            <span className={styles.progressValue}>{target.toLocaleString('pt-BR')}</span>
            <span className={styles.progressLabel}>Meta</span>
          </div>
        </div>
      </div>

      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarBackground}>
          <div 
            className={`${styles.progressBarFill} ${styles[status]}`}
            style={{ width: `${percentage}%` }}
          >
            <div className={styles.progressBarGlow}></div>
          </div>
        </div>
        <div className={styles.progressPercentage}>
          <span className={`${styles.percentageValue} ${styles[status]}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className={styles.progressFooter}>
        <div className={styles.progressStatus}>
          <div className={`${styles.statusIndicator} ${styles[status]}`}>
            <i className={`fa-solid ${
              status === 'excellent' ? 'fa-circle-check' :
              status === 'good' ? 'fa-circle-minus' :
              'fa-circle-xmark'
            }`}></i>
            <span>
              {status === 'excellent' ? 'Meta Atingida!' :
               status === 'good' ? 'Em Progresso' :
               'Atenção Necessária'}
            </span>
          </div>
        </div>
        
        {remaining > 0 && (
          <div className={styles.progressRemaining}>
            <span>Faltam <strong>{remaining.toLocaleString('pt-BR')}</strong> para a meta</span>
          </div>
        )}
        
        {percentage >= 100 && (
          <div className={styles.progressExcess}>
            <span>Meta superada em <strong>{(current - target).toLocaleString('pt-BR')}</strong>!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator; 
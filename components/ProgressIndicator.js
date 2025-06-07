import styles from '../styles/ProgressIndicator.module.css';

const ProgressIndicator = ({ current, target, label, type = 'chamados' }) => {
  if (!target || target === 0) return null;

  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  
  // Determinar status baseado na porcentagem - mais tolerante
  let status = 'neutral';
  if (percentage >= 100) status = 'excellent';
  else if (percentage >= 75) status = 'good';
  else if (percentage >= 50) status = 'warning';
  else status = 'info';

  // Ícones e textos amigáveis por tipo
  const getTypeInfo = () => {
    switch (type) {
      case 'chamados': 
        return { 
          icon: 'fa-headset',
          title: 'Meta de Chamados - Mês',
          subtitle: 'Chamados respondidos e atuados',
          unit: 'chamados'
        };
      case 'chat': 
        return { 
          icon: 'fa-comments',
          title: 'Meta de Conversas - Mês',
          subtitle: 'Conversas atendidas e finalizadas',
          unit: 'conversas'
        };
      default: 
        return { 
          icon: 'fa-chart-line',
          title: 'Meta Mensal',
          subtitle: 'Progresso do período atual',
          unit: 'itens'
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div className={`${styles.progressContainer} ${styles[status]}`}>
      {/* Header mais amigável */}
      <div className={styles.progressHeader}>
        <div className={styles.titleSection}>
          <div className={styles.iconContainer}>
            <i className={`fa-solid ${typeInfo.icon}`}></i>
          </div>
          <div className={styles.titleInfo}>
            <h3 className={styles.title}>{typeInfo.title}</h3>
            <p className={styles.subtitle}>{typeInfo.subtitle}</p>
          </div>
        </div>
        
        {/* Progresso visual mais clean */}
        <div className={styles.progressDisplay}>
          <div className={styles.numberDisplay}>
            <span className={styles.currentValue}>{current.toLocaleString('pt-BR')}</span>
            <span className={styles.targetValue}>de {target.toLocaleString('pt-BR')}</span>
          </div>
          <div className={styles.percentageDisplay}>
            <span className={`${styles.percentage} ${styles[status]}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Barra de progresso mais sutil */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarTrack}>
          <div 
            className={`${styles.progressBarFill} ${styles[status]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Footer com mensagem motivacional */}
      <div className={styles.progressFooter}>
        <div className={styles.statusMessage}>
          {percentage >= 100 ? (
            <div className={styles.messageSuccess}>
              <i className="fa-solid fa-party-horn"></i>
              <span>Parabéns! Meta superada!</span>
            </div>
          ) : percentage >= 75 ? (
            <div className={styles.messageGood}>
              <i className="fa-solid fa-thumbs-up"></i>
              <span>Ótimo progresso! Continue assim!</span>
            </div>
          ) : percentage >= 50 ? (
            <div className={styles.messageWarning}>
              <i className="fa-solid fa-rocket"></i>
              <span>Você está no caminho certo!</span>
            </div>
          ) : (
            <div className={styles.messageInfo}>
              <i className="fa-solid fa-target"></i>
              <span>Vamos juntos alcançar a meta!</span>
            </div>
          )}
        </div>
        
        {remaining > 0 && (
          <div className={styles.remainingInfo}>
            <span className={styles.remainingText}>
              Restam <strong>{remaining.toLocaleString('pt-BR')}</strong> {typeInfo.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator; 
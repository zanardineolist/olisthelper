import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import styles from '../styles/ProgressBar.module.css';

const ProgressBar = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const [previousCount, setPreviousCount] = useState(count);
  const minTarget = 25;
  const maxTarget = 30;

  useEffect(() => {
    // Atualizar progresso quando a contagem mudar
    const percentage = (count / maxTarget) * 100;
    setProgress(Math.min(percentage, 100));

    // Verificar se atingiu a meta agora
    if (count >= maxTarget && previousCount < maxTarget) {
      celebrateSuccess();
    }
    setPreviousCount(count);
  }, [count]);

  const getProgressColor = () => {
    if (count >= maxTarget) return '#4CAF50'; // Verde
    if (count >= minTarget) return '#FFA726'; // Laranja
    if (count >= minTarget * 0.7) return '#42A5F5'; // Azul
    return '#EF5350'; // Vermelho
  };

  const celebrateSuccess = () => {
    // Confetti no centro da tela
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Confetti dos cantos
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });

    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  };

  return (
    <div className={styles.progressWrapper}>
      <div className={styles.progressContainer}>
        <div
          className={styles.progressFill}
          style={{
            width: `${progress}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>
      
      <div className={styles.markerContainer}>
        <div className={styles.marker + ' ' + styles.minMarker}>
          <span className={styles.markerLabel + ' ' + styles.minLabel}>
            Min {minTarget}
          </span>
        </div>
        <div className={styles.marker + ' ' + styles.maxMarker}>
          <span className={styles.markerLabel + ' ' + styles.maxLabel}>
            Meta {maxTarget}
          </span>
        </div>
      </div>
  
      <div className={styles.message}>
        {count >= maxTarget ? (
          <div className={styles.messageSuccess}>
            🎉 Parabéns! Você bateu os 30 hoje!!! 🎉
          </div>
        ) : count >= minTarget ? (
          <div className={styles.messageWarning}>
            Ótimo! Você chegou nos 25 chamados. Continue assim!
          </div>
        ) : (
          <div className={styles.messageInfo}>
            Faltam {minTarget - count} chamados para atingir os 25.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
import React, { useEffect, useState } from 'react';
import styles from '../styles/ProgressBar.module.css';
import confetti from 'canvas-confetti';

const ProgressBar = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const [previousCount, setPreviousCount] = useState(count);
  const [scale, setScale] = useState(1);
  const minTarget = 25;
  const maxTarget = 30;

  useEffect(() => {
    // Calcular o progresso baseado na contagem atual
    let newProgress;
    let newScale = 1;

    if (count <= maxTarget) {
      newProgress = (count / maxTarget) * 100;
    } else {
      // Quando ultrapassar a meta, ajustar a escala e o progresso
      newScale = maxTarget / count;
      newProgress = 100; // Manter a barra cheia
    }

    setProgress(newProgress);
    setScale(newScale);

    // Verificar se acabou de atingir ou ultrapassar a meta
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
          className={styles.progressBar}
          style={{
            transform: count > maxTarget ? `scaleX(${scale})` : 'none'
          }}
        >
          <div
            className={`${styles.progressFill} ${count > maxTarget ? styles.boostEffect : ''}`}
            style={{
              width: `${progress}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>

        <div className={styles.markersContainer}>
          <div className={`${styles.marker} ${styles.minMarker}`}>
            <span className={`${styles.markerLabel} ${styles.minLabel}`}>
              Min {minTarget}
            </span>
          </div>
          <div className={`${styles.marker} ${styles.maxMarker}`}>
            <span className={`${styles.markerLabel} ${styles.maxLabel}`}>
              Meta {maxTarget}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.message}>
        {count >= maxTarget ? (
          <div className={styles.messageSuccess}>
            🎉 Parabéns! {count > maxTarget ? `Você superou a meta! (${count}/${maxTarget})` : 'Você bateu a meta!'} 🎉
          </div>
        ) : count >= minTarget ? (
          <div className={styles.messageWarning}>
            Ótimo! Você chegou nos {minTarget} chamados. Continue assim!
          </div>
        ) : (
          <div className={styles.messageInfo}>
            Faltam {minTarget - count} chamados para atingir os {minTarget}.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
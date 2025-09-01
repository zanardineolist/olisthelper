import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/ProgressBar.module.css';

const ProgressBarLogger = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const [previousCount, setPreviousCount] = useState(count);
  const [boostLevel, setBoostLevel] = useState(0);
  const minTarget = 18; // Meta mínima
  const maxTarget = 24; // Meta ideal

  useEffect(() => {
    // Calcular progresso base e boost
    let baseProgress = (count / maxTarget) * 100;
    if (count > maxTarget) {
      const extraCount = count - maxTarget;
      const boostLevelCalc = Math.floor(extraCount / 5) + 1; // A cada 5 chamados extras, sobe um nível
      setBoostLevel(boostLevelCalc);
      baseProgress = 100; // Manter a barra cheia
    } else {
      setBoostLevel(0);
    }
    setProgress(Math.min(baseProgress, 100));

    if (count >= maxTarget && previousCount < maxTarget) {
      celebrateSuccess();
    }
    setPreviousCount(count);
  }, [count]);

  const getProgressColor = () => {
    if (count > maxTarget) return '#8BC34A'; // Verde mais brilhante para boost
    if (count >= maxTarget) return '#4CAF50'; // Verde - Meta atingida
    if (count >= minTarget) return '#FFA726'; // Laranja - Acima do mínimo
    if (count >= minTarget * 0.7) return '#42A5F5'; // Azul - Progredindo
    return '#EF5350'; // Vermelho - Baixo
  };

  const celebrateSuccess = () => {
    const duration = 15000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const progressVariants = {
    initial: { width: 0, scale: 0.95 },
    animate: { 
      width: `${progress}%`,
      scale: count > maxTarget ? [1, 0.98, 1] : 1,
      transition: { 
        width: { type: "spring", stiffness: 50, damping: 15 },
        scale: count > maxTarget ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : { duration: 0.3 }
      }
    }
  };

  const messageVariants = {
    initial: { 
      opacity: 0,
      y: 20,
      scale: 0.9
    },
    animate: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      scale: 0.9,
      transition: {
        duration: 0.2
      }
    }
  };

  const boostCounterVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  const getBoostEmoji = (level) => {
    const emojis = ['🔥', '⚡', '💫', '✨', '💥'];
    return emojis[Math.min(level - 1, emojis.length - 1)];
  };

  const getProgressMessage = () => {
    if (count > maxTarget) {
      return `🎉 Superou a meta! +${count - maxTarget} chamados`;
    }
    if (count >= maxTarget) {
      return '🎯 Meta de 24 chamados atingida!';
    }
    if (count >= minTarget) {
      return `✅ Acima do mínimo! Faltam ${maxTarget - count} para a meta`;
    }
    if (count >= minTarget * 0.7) {
      return `📈 Progredindo bem! Faltam ${maxTarget - count} chamados`;
    }
    if (count > 0) {
      return `🚀 Continue assim! Faltam ${maxTarget - count} chamados`;
    }
    return '💪 Comece seu dia registrando chamados!';
  };

  return (
    <motion.div 
      className={styles.progressWrapper}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.progressContainer}>
        {count > maxTarget && (
          <motion.div 
            className={styles.boostCounter}
            variants={boostCounterVariants}
            initial="initial"
            animate="animate"
          >
            <span className={styles.boostLevel}>
              {getBoostEmoji(boostLevel)} Nível {boostLevel}
            </span>
            <span className={styles.boostCount}>
              +{count - maxTarget} chamados
            </span>
          </motion.div>
        )}

        <div className={styles.progressBar}>
          <motion.div
            className={`${styles.progressFill} ${count > maxTarget ? styles.boostEffect : ''}`}
            variants={progressVariants}
            initial="initial"
            animate="animate"
            style={{ backgroundColor: getProgressColor() }}
          >
            {count > maxTarget && (
              <motion.div 
                className={styles.boostParticles}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </motion.div>
        </div>
        
        {count <= maxTarget && (
          <div className={styles.markersContainer}>
            <div className={`${styles.marker} ${styles.minMarker}`}>
              <div className={styles.markerLine} />
              <div className={`${styles.markerLabel} ${styles.minLabel}`}>
                Min 18
              </div>
            </div>

            <div className={`${styles.marker} ${styles.maxMarker}`}>
              <div className={styles.markerLine} />
              <div className={`${styles.markerLabel} ${styles.maxLabel}`}>
                Meta 24
              </div>
            </div>
          </div>
        )}

        {count >= 0 && (
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${count}-${count >= maxTarget ? 'completed' : 'progress'}`}
              className={`${styles.progressMessage} ${
                count >= maxTarget ? styles.completed : 
                count >= minTarget ? styles.good : 
                count >= minTarget * 0.7 ? styles.average : 
                styles.low
              }`}
              variants={messageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {count > maxTarget ? (
                <div className={styles.messageSuccess}>
                  <span className={styles.messageIcon}>🎉</span>
                  {getProgressMessage()}
                </div>
              ) : count >= maxTarget ? (
                <div className={styles.messageSuccess}>
                  <span className={styles.messageIcon}>🎯</span>
                  {getProgressMessage()}
                </div>
              ) : count >= minTarget ? (
                <div className={styles.messageWarning}>
                  <span className={styles.messageIcon}>✅</span>
                  {getProgressMessage()}
                </div>
              ) : (
                <div className={styles.messageInfo}>
                  <span className={styles.messageIcon}>💪</span>
                  {getProgressMessage()}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}


      </div>
    </motion.div>
  );
};

export default ProgressBarLogger;
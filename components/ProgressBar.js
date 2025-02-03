import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/ProgressBar.module.css';

const ProgressBar = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const [previousCount, setPreviousCount] = useState(count);
  const minTarget = 25;
  const maxTarget = 30;

  useEffect(() => {
    const percentage = (count / maxTarget) * 100;
    setProgress(Math.min(percentage, 100));

    if (count >= maxTarget && previousCount < maxTarget) {
      celebrateSuccess();
    }
    setPreviousCount(count);
  }, [count]);

  const getProgressColor = () => {
    if (count >= maxTarget) return '#4CAF50';
    if (count >= minTarget) return '#FFA726';
    if (count >= minTarget * 0.7) return '#42A5F5';
    return '#EF5350';
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
      scale: 1,
      transition: { 
        width: { type: "spring", stiffness: 50, damping: 15 },
        scale: { duration: 0.3 }
      }
    }
  };

  const messageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 }
    }
  };

  const markerVariants = {
    initial: { scale: 0 },
    animate: { 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: 0.2
      }
    }
  };

  return (
    <motion.div 
      className={styles.progressWrapper}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <motion.div
            className={`${styles.progressFill} ${count >= maxTarget ? styles.boostEffect : ''}`}
            variants={progressVariants}
            initial="initial"
            animate="animate"
            style={{ backgroundColor: getProgressColor() }}
          />
        </div>
        
        <div className={styles.markersContainer}>
          <motion.div 
            className={`${styles.marker} ${styles.minMarker}`}
            variants={markerVariants}
            initial="initial"
            animate="animate"
          >
            <span className={`${styles.markerLabel} ${styles.minLabel}`}>
              Min {minTarget}
            </span>
          </motion.div>
          <motion.div 
            className={`${styles.marker} ${styles.maxMarker}`}
            variants={markerVariants}
            initial="initial"
            animate="animate"
          >
            <span className={`${styles.markerLabel} ${styles.maxLabel}`}>
              Meta {maxTarget}
            </span>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={count >= maxTarget ? 'max' : count >= minTarget ? 'min' : 'progress'}
            className={styles.message}
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
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
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ProgressBar;
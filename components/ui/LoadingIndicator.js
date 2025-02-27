import React from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/SharedMessages.module.css';

const LoadingIndicator = () => {
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const dotVariants = {
    initial: { 
      scale: 0
    },
    animate: {
      scale: [0, 1, 0],
      transition: {
        repeat: Infinity,
        repeatType: "loop",
        duration: 1,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className={styles.loadingContainer} 
      aria-live="polite" 
      aria-busy="true"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className={styles.spinner}>
        <motion.div className={styles.bounce1} variants={dotVariants} />
        <motion.div className={styles.bounce2} variants={dotVariants} />
        <motion.div className={styles.bounce3} variants={dotVariants} />
      </div>
      <span className={styles.srOnly}>Carregando...</span>
    </motion.div>
  );
};

export default LoadingIndicator;
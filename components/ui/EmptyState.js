import React from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/SharedMessages.module.css';

const EmptyState = ({ icon, message }) => {
  return (
    <motion.div 
      className={styles.emptyState} 
      role="status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
    >
      <motion.div
        className={styles.emptyIconContainer}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ 
          delay: 0.2,
          type: "spring", 
          stiffness: 200, 
          damping: 20 
        }}
      >
        {icon}
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
};

export default EmptyState;
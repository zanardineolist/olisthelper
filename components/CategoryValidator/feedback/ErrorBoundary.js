// components/CategoryValidator/feedback/ErrorBoundary.js
import React from 'react';
import { Alert, Button } from '@mui/material';
import styles from '../styles.module.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CategoryValidator error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={this.handleRetry}>
              Tentar Novamente
            </Button>
          }
          className={styles.errorBoundary}
        >
          Ocorreu um erro ao carregar o validador de categorias
        </Alert>
      );
    }

    return this.props.children;
  }
}
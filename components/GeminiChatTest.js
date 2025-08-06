import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Chip, Alert } from '@mui/material';

const GeminiChatTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const results = {};

      // Teste simples (sem autenticação)
      try {
        const simpleResponse = await fetch('/api/gemini-chat-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: 'Teste' }),
        });
        const simpleData = await simpleResponse.json();
        results.simple = {
          status: simpleResponse.status,
          success: simpleResponse.ok,
          data: simpleData
        };
      } catch (error) {
        results.simple = { 
          status: 'error',
          success: false,
          error: error.message 
        };
      }

      // Teste de autenticação
      try {
        const authResponse = await fetch('/api/gemini-chat-auth-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true }),
        });
        const authData = await authResponse.json();
        results.auth = {
          status: authResponse.status,
          success: authResponse.ok,
          data: authData
        };
      } catch (error) {
        results.auth = { 
          status: 'error',
          success: false,
          error: error.message 
        };
      }
      
      // Teste da API completa
      try {
        const response = await fetch('/api/gemini-chat-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true }),
        });
        const data = await response.json();
        results.api = {
          status: response.status,
          success: response.ok,
          data: data
        };
      } catch (error) {
        results.api = { 
          status: 'error',
          success: false,
          error: error.message 
        };
      }

      // Teste da API fix
      try {
        const fixResponse = await fetch('/api/gemini-chat-fix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: 'Teste',
            topics: [],
            period: 'teste',
            startDate: '01/01/2024',
            endDate: '31/01/2024',
            chatHistory: []
          }),
        });
        const fixData = await fixResponse.json();
        results.fix = {
          status: fixResponse.status,
          success: fixResponse.ok,
          data: fixData
        };
      } catch (error) {
        results.fix = { 
          status: 'error',
          success: false,
          error: error.message 
        };
      }

      // Teste da API separate (API key separada)
      try {
        const separateResponse = await fetch('/api/gemini-chat-separate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: 'Teste',
            topics: [],
            period: 'teste',
            startDate: '01/01/2024',
            endDate: '31/01/2024',
            chatHistory: []
          }),
        });
        const separateData = await separateResponse.json();
        results.separate = {
          status: separateResponse.status,
          success: separateResponse.ok,
          data: separateData
        };
      } catch (error) {
        results.separate = { 
          status: 'error',
          success: false,
          error: error.message 
        };
      }

      // Teste da API OAuth (credenciais separadas)
      try {
        const oauthResponse = await fetch('/api/gemini-chat-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: 'Teste',
            topics: [],
            period: 'teste',
            startDate: '01/01/2024',
            endDate: '31/01/2024',
            chatHistory: []
          }),
        });
        const oauthData = await oauthResponse.json();
        results.oauth = {
          status: oauthResponse.status,
          success: oauthResponse.ok,
          data: oauthData
        };
      } catch (error) {
        results.oauth = { 
          status: 'error',
          success: false,
          error: error.message 
        };
      }

      setTestResult(results);
    } catch (error) {
      setTestResult({ 
        error: 'Erro geral no teste',
        message: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (success) => {
    return success ? 'success' : 'error';
  };

  const getStatusText = (success) => {
    return success ? 'Sucesso' : 'Erro';
  };

  return (
    <Paper sx={{ 
      p: 2, 
      m: 2,
      backgroundColor: 'var(--box-color)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px'
    }}>
      <Typography 
        variant="h6" 
        sx={{ 
          color: 'var(--title-color)',
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <i className="fa-solid fa-vial" style={{ color: 'var(--color-primary)' }}></i>
        Teste da API Gemini Chat
      </Typography>
      
      <Button 
        onClick={handleTest} 
        disabled={loading}
        variant="contained"
        startIcon={<i className="fa-solid fa-play"></i>}
        sx={{ 
          mb: 2,
          backgroundColor: 'var(--color-primary)',
          '&:hover': {
            backgroundColor: 'var(--color-primary-hover)'
          }
        }}
      >
        {loading ? 'Testando...' : 'Testar API'}
      </Button>
      
      {testResult && (
        <Box sx={{ mt: 2 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'var(--title-color)',
              mb: 2,
              fontWeight: 600
            }}
          >
            Resultados dos Testes:
          </Typography>
          
          {Object.entries(testResult).map(([testName, result]) => (
            <Box key={testName} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'var(--text-color)',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}
                >
                  {testName.replace(/([A-Z])/g, ' $1').trim()}:
                </Typography>
                <Chip
                  label={getStatusText(result.success)}
                  color={getStatusColor(result.success)}
                  size="small"
                  sx={{ fontSize: '0.7rem' }}
                />
                {result.status && (
                  <Chip
                    label={`Status: ${result.status}`}
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Box>
              
              {result.success ? (
                <Alert 
                  severity="success" 
                  sx={{ 
                    fontSize: '0.8rem',
                    '& .MuiAlert-message': {
                      color: 'var(--text-color)'
                    }
                  }}
                >
                  {result.data?.message || 'Teste executado com sucesso'}
                </Alert>
              ) : (
                <Alert 
                  severity="error" 
                  sx={{ 
                    fontSize: '0.8rem',
                    '& .MuiAlert-message': {
                      color: 'var(--text-color)'
                    }
                  }}
                >
                  {result.data?.message || result.error || 'Erro desconhecido'}
                </Alert>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default GeminiChatTest; 
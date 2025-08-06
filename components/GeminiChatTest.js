import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';

const GeminiChatTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      // Teste de autenticação primeiro
      const authResponse = await fetch('/api/gemini-chat-auth-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });

      const authData = await authResponse.json();
      
      // Teste da API completa
      const response = await fetch('/api/gemini-chat-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });

      const data = await response.json();
      setTestResult({
        auth: authData,
        api: data
      });
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Typography variant="h6">Teste da API Gemini Chat</Typography>
      <Button 
        onClick={handleTest} 
        disabled={loading}
        variant="contained"
        sx={{ mt: 2 }}
      >
        {loading ? 'Testando...' : 'Testar API'}
      </Button>
      
      {testResult && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Resultado:</strong> {JSON.stringify(testResult, null, 2)}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default GeminiChatTest; 
import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';

const GeminiChatTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
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
        results.simple = simpleData;
      } catch (error) {
        results.simple = { error: error.message };
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
        results.auth = authData;
      } catch (error) {
        results.auth = { error: error.message };
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
        results.api = data;
      } catch (error) {
        results.api = { error: error.message };
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
        results.fix = fixData;
      } catch (error) {
        results.fix = { error: error.message };
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
        results.separate = separateData;
      } catch (error) {
        results.separate = { error: error.message };
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
        results.oauth = oauthData;
      } catch (error) {
        results.oauth = { error: error.message };
      }

      setTestResult(results);
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
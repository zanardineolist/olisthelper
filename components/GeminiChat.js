import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  IconButton, 
  Typography, 
  Avatar,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const GeminiChat = ({ topics, period, startDate, endDate, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mensagem de boas-vindas inicial
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o assistente de análise de dados do dashboard de qualidade. 

Estou aqui para ajudar você a analisar os dados dos temas de dúvidas do período ${period} (${startDate} a ${endDate}).

Você pode me perguntar sobre:
• Padrões nos dados
• Temas críticos que precisam de atenção
• Sugestões de melhorias na documentação
• Recomendações de treinamentos
• Análise de tendências
• Priorização de ações

Como posso ajudar você hoje?`,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  }, [period, startDate, endDate]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Log para debug
      console.log('Chat - Enviando dados:', {
        message: inputMessage,
        topicsCount: topics?.length,
        period,
        startDate,
        endDate,
        chatHistoryCount: messages.length
      });

      const response = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          topics,
          period,
          startDate,
          endDate,
          chatHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      const data = await response.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro no chat:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: '800px',
          height: '80vh',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--box-color)',
          color: 'var(--text-color)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: 40,
                height: 40
              }}
            >
              <i className="fa-solid fa-robot" style={{ fontSize: '1.2rem' }}></i>
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Assistente IA Gemini
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Análise de dados - {period} ({startDate} a {endDate})
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <i className="fa-solid fa-times"></i>
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  {message.role === 'assistant' && (
                    <Avatar
                      sx={{
                        backgroundColor: 'var(--color-primary)',
                        width: 32,
                        height: 32,
                        fontSize: '0.8rem'
                      }}
                    >
                      <i className="fa-solid fa-robot"></i>
                    </Avatar>
                  )}
                  
                  <Box
                    sx={{
                      maxWidth: '70%',
                      backgroundColor: message.role === 'user' 
                        ? 'var(--color-primary)' 
                        : message.isError 
                          ? 'var(--color-accent1)' 
                          : 'var(--box-color2)',
                      color: message.role === 'user' ? 'white' : 'var(--text-color)',
                      borderRadius: '12px',
                      p: 2,
                      position: 'relative'
                    }}
                  >
                    <Typography
                      component="div"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        fontSize: '0.9rem'
                      }}
                    >
                      {message.content}
                    </Typography>
                    
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        bottom: -20,
                        right: message.role === 'user' ? 0 : 'auto',
                        left: message.role === 'user' ? 'auto' : 0,
                        opacity: 0.6,
                        fontSize: '0.7rem'
                      }}
                    >
                      {formatTimestamp(message.timestamp)}
                    </Typography>
                  </Box>

                  {message.role === 'user' && (
                    <Avatar
                      sx={{
                        backgroundColor: 'var(--color-accent3)',
                        width: 32,
                        height: 32,
                        fontSize: '0.8rem'
                      }}
                    >
                      <i className="fa-solid fa-user"></i>
                    </Avatar>
                  )}
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'flex-start'
              }}
            >
              <Avatar
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  width: 32,
                  height: 32,
                  fontSize: '0.8rem'
                }}
              >
                <i className="fa-solid fa-robot"></i>
              </Avatar>
              <Box
                sx={{
                  backgroundColor: 'var(--box-color2)',
                  borderRadius: '12px',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <CircularProgress size={16} sx={{ color: 'var(--color-primary)' }} />
                <Typography variant="body2" sx={{ color: 'var(--text-color2)' }}>
                  Digitando...
                </Typography>
              </Box>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--box-color)'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={4}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--modals-inputs)',
                  color: 'var(--text-color)',
                  borderRadius: '12px'
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--color-border)'
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-color)'
                }
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              sx={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--color-primary-hover)'
                },
                '&.Mui-disabled': {
                  backgroundColor: 'var(--text-color2)',
                  color: 'var(--text-color)'
                }
              }}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </IconButton>
          </Box>
          
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Analisar padrões"
              size="small"
              onClick={() => setInputMessage('Quais padrões você identifica nos dados?')}
              sx={{
                backgroundColor: 'var(--color-accent3)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--color-accent3-hover)'
                }
              }}
            />
            <Chip
              label="Temas críticos"
              size="small"
              onClick={() => setInputMessage('Quais temas precisam de atenção imediata?')}
              sx={{
                backgroundColor: 'var(--color-accent1)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--color-accent1-hover)'
                }
              }}
            />
            <Chip
              label="Sugestões"
              size="small"
              onClick={() => setInputMessage('Que melhorias você sugere?')}
              sx={{
                backgroundColor: 'var(--color-accent2)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--color-accent2-hover)'
                }
              }}
            />
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default GeminiChat; 
// pages/manage-users.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => {
    // Carregar usuários ao carregar a página
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/get-users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleOpenDialog = (user) => {
    setEditingUser(user);
    reset(user ? {
      name: user.name,
      email: user.email,
      profile: user.role,
      squad: user.squad,
      chamado: user.chamado,
      telefone: user.telefone,
      chat: user.chat
    } : {});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
    setOpenDialog(false);
  };

  const onSubmit = async (data) => {
    try {
      if (editingUser) {
        // Editar usuário existente
        await axios.put(`/api/update-user?id=${editingUser.id}`, data);
      } else {
        // Adicionar novo usuário
        await axios.post('/api/add-user', data);
      }
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleDeleteUser = async (id) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      try {
        await axios.delete(`/api/delete-user?id=${id}`);
        fetchUsers();
      } catch (error) {
        console.error('Erro ao remover usuário:', error);
      }
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Gerenciamento de Usuários
      </Typography>
      <Button variant="contained" color="primary" onClick={() => handleOpenDialog(null)}>
        Adicionar Novo Usuário
      </Button>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell>Squad</TableCell>
              <TableCell>Chamado</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Chat</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.squad}</TableCell>
                <TableCell><Checkbox checked={user.chamado} disabled /></TableCell>
                <TableCell><Checkbox checked={user.telefone} disabled /></TableCell>
                <TableCell><Checkbox checked={user.chat} disabled /></TableCell>
                <TableCell>
                  <Button color="primary" onClick={() => handleOpenDialog(user)}>Editar</Button>
                  <Button color="secondary" onClick={() => handleDeleteUser(user.id)}>Remover</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box mb={2}>
              <Controller
                name="name"
                control={control}
                defaultValue=""
                rules={{ required: 'Nome é obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} label="Nome" fullWidth margin="dense" />
                )}
              />
            </Box>
            <Box mb={2}>
              <Controller
                name="email"
                control={control}
                defaultValue=""
                rules={{ required: 'Email é obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} label="Email" type="email" fullWidth margin="dense" />
                )}
              />
            </Box>
            <Box mb={2}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Perfil</InputLabel>
                <Controller
                  name="profile"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Select {...field} label="Perfil">
                      <MenuItem value="support">Suporte</MenuItem>
                      <MenuItem value="analyst">Analista</MenuItem>
                      <MenuItem value="super">Supervisor</MenuItem>
                      <MenuItem value="tax">Fiscal</MenuItem>
                      <MenuItem value="other">Outro</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Box>
            <Box mb={2}>
              <Controller
                name="squad"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField {...field} label="Squad" fullWidth margin="dense" />
                )}
              />
            </Box>
            <Box mb={2}>
              <Controller
                name="chamado"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <FormControl>
                    <InputLabel>Chamado</InputLabel>
                    <Checkbox {...field} checked={field.value} />
                  </FormControl>
                )}
              />
            </Box>
            <Box mb={2}>
              <Controller
                name="telefone"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <FormControl>
                    <InputLabel>Telefone</InputLabel>
                    <Checkbox {...field} checked={field.value} />
                  </FormControl>
                )}
              />
            </Box>
            <Box mb={2}>
              <Controller
                name="chat"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <FormControl>
                    <InputLabel>Chat</InputLabel>
                    <Checkbox {...field} checked={field.value} />
                  </FormControl>
                )}
              />
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

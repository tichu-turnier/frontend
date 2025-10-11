import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function CreateTournament() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxTeams, setMaxTeams] = useState(16)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, session } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:54321/functions/v1/create-tournament', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          max_teams: maxTeams,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tournament')
      }

      navigate(`/admin/tournament/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }

    setLoading(false)
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Create Tournament
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, width: '100%', minHeight: '100vh' }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Tournament
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Tournament Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Maximum Teams"
              type="number"
              value={maxTeams}
              onChange={(e) => setMaxTeams(parseInt(e.target.value))}
              margin="normal"
              inputProps={{ min: 4, max: 32 }}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </>
  )
}
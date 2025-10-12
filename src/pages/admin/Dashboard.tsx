import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Chip,
  Box,
  AppBar,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { Add as AddIcon, Logout as LogoutIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Tournament } from '../../lib/types'

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        teams(id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tournaments:', error)
    } else {
      setTournaments(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'setup': return 'default'
      case 'active': return 'primary'
      case 'completed': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Tournament Manager
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, width: '100%', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Tournaments
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/create')}
          >
            Create Tournament
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Round</TableCell>
                <TableCell>Teams</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tournaments.map((tournament) => {
                const isOwner = tournament.created_by === user?.id
                return (
                  <TableRow key={tournament.id} sx={{ opacity: isOwner ? 1 : 0.75 }}>
                    <TableCell>{tournament.name}</TableCell>
                    <TableCell>{tournament.description}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color={isOwner ? 'inherit' : 'text.secondary'}>
                        {isOwner ? 'You' : `${tournament.created_by?.slice(0, 8)}...`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={tournament.status} 
                        color={getStatusColor(tournament.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{tournament.current_round}</TableCell>
                    <TableCell>{tournament.teams?.length || 0}/{tournament.max_teams}</TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/admin/tournament/${tournament.id}`)}
                        disabled={!isOwner}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {tournaments.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No tournaments yet
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin/create')}
              sx={{ mt: 2 }}
            >
              Create Your First Tournament
            </Button>
          </Box>
        )}
      </Box>
    </>
  )
}
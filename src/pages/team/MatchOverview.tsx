import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material'
import { Logout as LogoutIcon, Add as AddIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-toastify'

export default function MatchOverview() {
  const [match, setMatch] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [teamAuth, setTeamAuth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const auth = localStorage.getItem('teamAuth')
    if (!auth) {
      navigate('/team/login')
      return
    }
    
    const parsedAuth = JSON.parse(auth)
    setTeamAuth(parsedAuth)
    fetchCurrentMatch(parsedAuth.teamId)
  }, [navigate])

  const fetchCurrentMatch = async (teamId: string) => {
    const { data: matchData, error } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(id, team_name, player1:player1_id(name), player2:player2_id(name)),
        team2:team2_id(id, team_name, player1:player1_id(name), player2:player2_id(name)),
        games(*)
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      toast.error('No active match found')
      navigate('/team/login')
      return
    }

    setMatch(matchData)
    setGames(matchData.games || [])
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('teamAuth')
    navigate('/team/login')
  }

  const handleConfirmMatch = async () => {
    if (!match || !teamAuth) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
          'team-token': teamAuth.accessToken,
        },
        body: JSON.stringify({
          match_id: match.id
        }),
      })

      if (response.ok) {
        toast.success('Match confirmed!')
        fetchCurrentMatch(teamAuth.teamId)
      } else {
        const errorData = await response.json()
        toast.error(`Failed to confirm: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      toast.error(`Confirm failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Confirm exception:', err)
    }
  }

  const handleRetractConfirmation = async () => {
    if (!match || !teamAuth) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
          'team-token': teamAuth.accessToken,
        },
        body: JSON.stringify({
          match_id: match.id,
          unconfirm: true
        }),
      })

      if (response.ok) {
        toast.success('Confirmation retracted')
        fetchCurrentMatch(teamAuth.teamId)
      } else {
        const errorData = await response.json()
        toast.error(`Failed to retract: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      toast.error(`Retract failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Retract exception:', err)
    }
  }

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  if (!match) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">No active match found</Typography>
        <Button onClick={() => navigate('/team/login')}>Back to Login</Button>
      </Box>
    )
  }

  const isTeam1 = match.team1.id === teamAuth.teamId
  const ownTeam = isTeam1 ? match.team1 : match.team2
  const opponentTeam = isTeam1 ? match.team2 : match.team1
  const ownConfirmed = isTeam1 ? match.team1_confirmed : match.team2_confirmed
  const opponentConfirmed = isTeam1 ? match.team2_confirmed : match.team1_confirmed
  const maxGames = 4
  const canAddGame = games.length < maxGames
  const canConfirm = games.length === maxGames && !ownConfirmed

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {ownTeam.team_name} - Table {match.table_number}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Match Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Match Overview
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {match.team1.team_name}
                </Typography>
                <Typography variant="body2">
                  {match.team1.player1?.name} & {match.team1.player2?.name}
                </Typography>
                {match.team1_confirmed && <Chip label="Confirmed" color="success" size="small" />}
              </Box>
              <Typography variant="h6">vs</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {match.team2.team_name}
                </Typography>
                <Typography variant="body2">
                  {match.team2.player1?.name} & {match.team2.player2?.name}
                </Typography>
                {match.team2_confirmed && <Chip label="Confirmed" color="success" size="small" />}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Games played: {games.length} / {maxGames}
            </Typography>
          </CardContent>
        </Card>

        {/* Games Summary */}
        {games.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Game Results
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Game</TableCell>
                      <TableCell align="right">{match.team1.team_name}</TableCell>
                      <TableCell align="right">{match.team2.team_name}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {games.map((game, index) => (
                      <TableRow key={game.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell align="right">{game.team1_total_score}</TableCell>
                        <TableCell align="right">{game.team2_total_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {canAddGame && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/team/game')}
            >
              Add Game Result
            </Button>
          )}
          
          {canConfirm && (
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirmMatch}
            >
              Confirm Match
            </Button>
          )}
          
          {ownConfirmed && (
            <Button
              variant="outlined"
              onClick={handleRetractConfirmation}
            >
              Retract Confirmation
            </Button>
          )}
        </Box>

        {games.length === maxGames && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {ownConfirmed && opponentConfirmed 
                ? 'Both teams confirmed. Waiting for next round...'
                : ownConfirmed 
                ? 'Waiting for opponent confirmation...'
                : 'Please confirm the match results'}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}
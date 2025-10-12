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
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Logout as LogoutIcon, Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-toastify'

export default function MatchOverview() {
  const [match, setMatch] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [teamAuth, setTeamAuth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewGame, setViewGame] = useState<any>(null)
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
        team1:team1_id(id, team_name, player1:player1_id(id, name), player2:player2_id(id, name)),
        team2:team2_id(id, team_name, player1:player1_id(id, name), player2:player2_id(id, name)),
        games(*, game_participants(*))
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

  // Create player ID to name mapping
  const playerNames: Record<string, string> = {
    [match.team1.player1?.id]: match.team1.player1?.name || 'Player 1',
    [match.team1.player2?.id]: match.team1.player2?.name || 'Player 2',
    [match.team2.player1?.id]: match.team2.player1?.name || 'Player 3',
    [match.team2.player2?.id]: match.team2.player2?.name || 'Player 4'
  }
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
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {games.map((game, index) => {
                      const canEdit = !match.team1_confirmed && !match.team2_confirmed
                      return (
                        <TableRow key={game.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell align="right">{game.team1_total_score}</TableCell>
                          <TableCell align="right">{game.team2_total_score}</TableCell>
                          <TableCell align="center">
                            <Button size="small" onClick={() => setViewGame(game)} startIcon={<ViewIcon />}/>
                            {canEdit && (
                              <Button 
                                size="small" 
                                onClick={() => navigate(`/team/game?edit=${game.id}`)}
                                startIcon={<EditIcon />}
                                sx={{ ml: 1 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
        
        {/* Game View Dialog */}
        <Dialog open={!!viewGame} onClose={() => setViewGame(null)} maxWidth="md" fullWidth>
          <DialogTitle>Game {games.findIndex(g => g.id === viewGame?.id) + 1} Details</DialogTitle>
          <DialogContent>
            {viewGame && (
              <Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell>Tichu Call</TableCell>
                      <TableCell>Bombs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewGame.game_participants?.sort((a: any, b: any) => {
                      if (a.team !== b.team) return a.team - b.team
                      return (playerNames[a.player_id] || '').localeCompare(playerNames[b.player_id] || '')
                    }).map((participant: any) => (
                        <TableRow key={participant.player_id}>
                          <TableCell>{playerNames[participant.player_id] || `Team ${participant.team} Player`}</TableCell>
                          <TableCell>{participant.position || 'Double Win'}</TableCell>
                          <TableCell>
                            {participant.grand_tichu_call ? 'Grand Tichu' : participant.tichu_call ? 'Small Tichu' : 'None'}
                            {(participant.tichu_call || participant.grand_tichu_call) && 
                             ` (${participant.tichu_success ? 'Success' : 'Failed'})`}
                          </TableCell>
                          <TableCell>{'💣'.repeat(participant.bomb_count || 0) || 'None'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Scores:</Typography>
                  <Typography>Base Score: {match.team1.team_name} {viewGame.team1_score} - {viewGame.team2_score} {match.team2.team_name}</Typography>
                  <Typography>Total Score: {match.team1.team_name} {viewGame.team1_total_score} - {viewGame.team2_total_score} {match.team2.team_name}</Typography>
                  {(viewGame.team1_double_win || viewGame.team2_double_win) && (
                    <Typography color="primary">Double Win: {viewGame.team1_double_win ? match.team1.team_name : match.team2.team_name}</Typography>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewGame(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  )
}
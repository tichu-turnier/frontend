import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { toast } from 'react-toastify'
import { 
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  SkipNext as SkipNextIcon,
} from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Tournament, Team, TournamentMatch } from '../../lib/types'

export default function TournamentManagement() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [player1Name, setPlayer1Name] = useState('')
  const [player2Name, setPlayer2Name] = useState('')
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showTeamCodes, setShowTeamCodes] = useState(false)
  const { user, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || !id) return
    fetchTournamentData()
  }, [user, id])

  const fetchTournamentData = async () => {
    if (!id) return

    // Fetch tournament
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select(`
        *,
        player1:player1_id(name),
        player2:player2_id(name)
      `)
      .eq('tournament_id', id)
      .order('total_points', { ascending: false })

    // Fetch current round matches
    const { data: matchesData } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(team_name),
        team2:team2_id(team_name)
      `)
      .eq('tournament_id', id)

    setTournament(tournamentData)
    setTeams(teamsData || [])
    setMatches(matchesData || [])
    setLoading(false)
  }

  const startTournament = async () => {
    if (!user || !id) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-tournament`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tournament_id: id }),
      })

      if (response.ok) {
        fetchTournamentData()
      }
    } catch (error) {
      console.error('Error starting tournament:', error)
    }
  }

  const startNextRound = async () => {
    if (!user || !id) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-next-round`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tournament_id: id }),
      })

      if (response.ok) {
        fetchTournamentData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to start next round')
      }
    } catch (error) {
      console.error('Error starting next round:', error)
      toast.error('Error starting next round')
    }
  }

  const finishTournament = async () => {
    if (!user || !id) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finish-tournament`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tournament_id: id }),
      })

      if (response.ok) {
        setShowFinishConfirm(false)
        fetchTournamentData()
      }
    } catch (error) {
      console.error('Error finishing tournament:', error)
    }
  }

  const reopenTournament = async () => {
    if (!user || !id) return

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', id)

      if (!error) {
        fetchTournamentData()
        toast.success('Tournament reopened successfully')
      } else {
        toast.error('Failed to reopen tournament')
      }
    } catch (error) {
      console.error('Error reopening tournament:', error)
      toast.error('Error reopening tournament')
    }
  }

  const addTeam = async () => {
    if (!session || !id) return

    try {
      // Get or create player1
      let { data: player1 } = await supabase
        .from('players')
        .select('*')
        .eq('name', player1Name)
        .single()

      if (!player1) {
        const { data: newPlayer1 } = await supabase
          .from('players')
          .insert({ name: player1Name })
          .select()
          .single()
        player1 = newPlayer1
      }

      // Get or create player2
      let { data: player2 } = await supabase
        .from('players')
        .select('*')
        .eq('name', player2Name)
        .single()

      if (!player2) {
        const { data: newPlayer2 } = await supabase
          .from('players')
          .insert({ name: player2Name })
          .select()
          .single()
        player2 = newPlayer2
      }

      if (player1 && player2) {
        // Create team
        await supabase
          .from('teams')
          .insert({
            tournament_id: id,
            team_name: teamName,
            player1_id: player1.id,
            player2_id: player2.id
          })

        setShowAddTeam(false)
        setTeamName('')
        setPlayer1Name('')
        setPlayer2Name('')
        fetchTournamentData()
      }
    } catch (error) {
      console.error('Error adding team:', error)
    }
  }

  if (loading || !tournament) {
    return <Typography>Loading...</Typography>
  }

  const currentRoundMatches = matches.filter(m => 
    tournament.current_round > 0 && m.created_at
  )

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
            {tournament.name}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', p: 3, gap: 3, width: '100%', minHeight: '100vh' }}>
        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          {/* Tournament Controls */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tournament Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip 
                  label={tournament.status} 
                  color={tournament.status === 'active' ? 'primary' : tournament.status === 'completed' ? 'success' : 'default'}
                />
                <Typography variant="body2">
                  Round: {tournament.current_round} | Teams: {teams.length} / {tournament.max_teams}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {tournament.status === 'setup' && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setShowAddTeam(true)}
                    >
                      Add Team
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={startTournament}
                      disabled={teams.length < 4}
                    >
                      Start Tournament
                    </Button>
                  </>
                )}
                
                {tournament.status === 'active' && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setShowTeamCodes(true)}
                    >
                      Show Team Codes
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SkipNextIcon />}
                      onClick={startNextRound}
                    >
                      Start Next Round
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<StopIcon />}
                      onClick={() => setShowFinishConfirm(true)}
                    >
                      Finish Tournament
                    </Button>
                  </>
                )}
                
                {tournament.status === 'completed' && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setShowTeamCodes(true)}
                    >
                      Show Team Codes
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={reopenTournament}
                    >
                      Reopen Tournament
                    </Button>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Setup Phase: Team Overview */}
          {tournament.status === 'setup' && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Teams & Access Codes
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Share these access codes with the teams so they can enter their scores.
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Team Name</TableCell>
                        <TableCell>Player 1</TableCell>
                        <TableCell>Player 2</TableCell>
                        <TableCell>Access Code</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {team.team_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{team.player1?.name}</TableCell>
                          <TableCell>{team.player2?.name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={team.access_token} 
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {teams.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No teams added yet. Click "Add Team" to get started.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Round Matches */}
          {currentRoundMatches.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Round {tournament.current_round} Matches
                </Typography>
                <TableContainer>
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>Table</TableCell>
                        <TableCell>Team 1</TableCell>
                        <TableCell>Team 2</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentRoundMatches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell>{match.table_number}</TableCell>
                          <TableCell>{match.team1?.team_name}</TableCell>
                          <TableCell>{match.team2?.team_name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={match.status} 
                              color={match.status === 'completed' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Team Rankings - Right Sidebar (only during active tournament) */}
        {tournament.status !== 'setup' && (
          <Box sx={{ width: 300, flexShrink: 0 }}>
            <Card sx={{ position: 'sticky', top: 16 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rankings
                </Typography>
                {teams.map((team, index) => (
                  <Box key={team.id} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    py: 1,
                    borderBottom: index < teams.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {index + 1}. {team.team_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {team.player1?.name} & {team.player2?.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {team.total_points}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* Add Team Dialog */}
      <Dialog open={showAddTeam} onClose={() => setShowAddTeam(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Player 1 Name"
            value={player1Name}
            onChange={(e) => setPlayer1Name(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Player 2 Name"
            value={player2Name}
            onChange={(e) => setPlayer2Name(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddTeam(false)}>Cancel</Button>
          <Button 
            onClick={addTeam} 
            variant="contained"
            disabled={!teamName || !player1Name || !player2Name}
          >
            Add Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finish Tournament Confirmation */}
      <Dialog open={showFinishConfirm} onClose={() => setShowFinishConfirm(false)}>
        <DialogTitle>Finish Tournament</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to finish this tournament? This will mark it as completed and calculate final standings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinishConfirm(false)}>Cancel</Button>
          <Button onClick={finishTournament} variant="contained" color="error">
            Finish Tournament
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Codes Dialog */}
      <Dialog open={showTeamCodes} onClose={() => setShowTeamCodes(false)} maxWidth="md" fullWidth>
        <DialogTitle>Team Access Codes</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team Name</TableCell>
                  <TableCell>Player 1</TableCell>
                  <TableCell>Player 2</TableCell>
                  <TableCell>Access Code</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {team.team_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{team.player1?.name}</TableCell>
                    <TableCell>{team.player2?.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={team.access_token} 
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTeamCodes(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
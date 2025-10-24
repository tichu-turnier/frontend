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
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { Logout as LogoutIcon, Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon, ExpandMore } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-toastify'
import MatchDetailsDialog from '../../components/MatchDetailsDialog'
import MatchDetailsView from '../../components/MatchDetailsView'

export default function MatchOverview() {
  const [match, setMatch] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [teamAuth, setTeamAuth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewGame, setViewGame] = useState<any>(null)
  const [currentTab, setCurrentTab] = useState(0)
  const [allMatches, setAllMatches] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [showMatchDetails, setShowMatchDetails] = useState(false)
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
    // First get tournament info
    const { data: teamData } = await supabase
      .from('teams')
      .select(`
        *,
        tournament:tournament_id(
          id, name, status, current_round,
          teams(id)
        )
      `)
      .eq('id', teamId)
      .single()

    if (!teamData) {
      toast.error('Team not found')
      navigate('/team/login')
      return
    }

    // Try to get current match
    const { data: matchData } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(id, team_name, player1:player1_id(id, name), player2:player2_id(id, name)),
        team2:team2_id(id, team_name, player1:player1_id(id, name), player2:player2_id(id, name)),
        games(*, game_participants(*))
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setMatch(matchData)
    setGames(matchData?.games || [])
    setTeamAuth(prev => ({ ...prev, tournament: teamData.tournament }))
    
    // Get all matches in the tournament
    const { data: allMatchesData } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(team_name),
        team2:team2_id(team_name),
        tournament_rounds!inner(round_number),
        games(id)
      `)
      .eq('tournament_id', teamData.tournament.id)
      .order('created_at', { ascending: false })
    
    setAllMatches(allMatchesData || [])
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

  if (!match && currentTab === 0) {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {teamAuth?.teamName} - Tournament Status
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tournament Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  Tournament: <strong>{teamAuth?.tournament?.name}</strong>
                </Typography>
                <Typography variant="body1" component="div">
                  Status: <Chip label={teamAuth?.tournament?.status} color={teamAuth?.tournament?.status === 'active' ? 'primary' : 'default'} size="small" />
                </Typography>
                <Typography variant="body1">
                  Current Round: <strong>{teamAuth?.tournament?.current_round || 0}</strong>
                </Typography>
                <Typography variant="body1">
                  Teams: <strong>{teamAuth?.tournament?.teams?.length || 0}</strong>
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {teamAuth?.tournament?.status === 'setup' 
                  ? 'Tournament is being set up. Please wait for it to start.'
                  : teamAuth?.tournament?.status === 'active'
                  ? 'No active match found. Please wait for the next round.'
                  : 'Tournament has ended.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
              <Tab label="Current Match" />
              <Tab label="Past Matches" />
              <Tab label="All Results" />
            </Tabs>
          </Box>
        </Box>
      </>
    )
  }

  const isTeam1 = match?.team1.id === teamAuth.teamId
  const ownTeam = isTeam1 ? match?.team1 : match?.team2
  const opponentTeam = isTeam1 ? match?.team2 : match?.team1
  const ownConfirmed = isTeam1 ? match?.team1_confirmed : match?.team2_confirmed
  const opponentConfirmed = isTeam1 ? match?.team2_confirmed : match?.team1_confirmed
  const maxGames = 4
  const canAddGame = games.length < maxGames
  const canConfirm = games.length === maxGames && !ownConfirmed

  // Create player ID to name mapping
  const playerNames: Record<string, string> = match ? {
    [match.team1.player1?.id]: match.team1.player1?.name || 'Player 1',
    [match.team1.player2?.id]: match.team1.player2?.name || 'Player 2',
    [match.team2.player1?.id]: match.team2.player1?.name || 'Player 3',
    [match.team2.player2?.id]: match.team2.player2?.name || 'Player 4'
  } : {}

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {teamAuth?.teamName} - {match ? `Table ${match.table_number}` : 'Tournament'}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Tournament Status - shown on all tabs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tournament Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
              <Typography variant="body2">
                Tournament: <strong>{teamAuth?.tournament?.name}</strong>
              </Typography>
              <Typography variant="body2" component="div">
                Status: <Chip label={teamAuth?.tournament?.status} color={teamAuth?.tournament?.status === 'active' ? 'primary' : 'default'} size="small" />
              </Typography>
              <Typography variant="body2">
                Round: <strong>{teamAuth?.tournament?.current_round || 0}</strong>
              </Typography>
              <Typography variant="body2">
                Teams: <strong>{teamAuth?.tournament?.teams?.length || 0}</strong>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label="Current Match" />
            <Tab label="Past Matches" />
            <Tab label="All Results" />
          </Tabs>
        </Box>

        {/* Current Match Tab */}
        {currentTab === 0 && match && (
          <>
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
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Game Results
                </Typography>
                <MatchDetailsView 
                  match={match}
                  onAddGame={() => navigate('/team/game')}
                  onEditGame={(gameId) => navigate(`/team/game?edit=${gameId}`)}
                  canEdit={!match.team1_confirmed && !match.team2_confirmed}
                />
              </CardContent>
            </Card>

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
          </>
        )}

        {/* Past Matches Tab */}
        {currentTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Past Matches
              </Typography>
              {allMatches.filter(m => m.status === 'completed' && (m.team1_id === teamAuth.teamId || m.team2_id === teamAuth.teamId)).length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Round</TableCell>
                        <TableCell>Opponent</TableCell>
                        <TableCell>Games</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allMatches.filter(m => m.status === 'completed' && (m.team1_id === teamAuth.teamId || m.team2_id === teamAuth.teamId)).map(match => {
                        const isTeam1 = match.team1_id === teamAuth.teamId
                        const opponent = isTeam1 ? match.team2?.team_name : match.team1?.team_name
                        return (
                          <TableRow key={match.id}>
                            <TableCell>{match.tournament_rounds?.round_number}</TableCell>
                            <TableCell>{opponent}</TableCell>
                            <TableCell>{match.games?.length || 0}/4</TableCell>
                            <TableCell>
                              <Button 
                                size="small" 
                                variant="outlined"
                                onClick={() => {
                                  setSelectedMatch(match)
                                  setShowMatchDetails(true)
                                }}
                              >
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No completed matches yet</Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Results Tab */}
        {currentTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All Results by Round
              </Typography>
              {Object.entries(
                allMatches.reduce((acc, match) => {
                  const round = match.tournament_rounds?.round_number || 0
                  if (!acc[round]) acc[round] = []
                  acc[round].push(match)
                  return acc
                }, {} as Record<number, any[]>)
              )
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([round, roundMatches]) => (
                  <Accordion key={round}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6">
                        Round {round} ({roundMatches.length} Match{roundMatches.length !== 1 ? 'es' : ''})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {roundMatches.map(match => {
                        return (
                          <Box key={match.id} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle1">
                                {match.team1?.team_name} vs {match.team2?.team_name}
                              </Typography>
                              <Box display="flex" gap={1} alignItems="center">
                                <Chip 
                                  label={match.status} 
                                  color={match.status === 'completed' ? 'success' : 'default'}
                                  size="small"
                                />
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={() => {
                                    setSelectedMatch(match)
                                    setShowMatchDetails(true)
                                  }}
                                >
                                  Details
                                </Button>
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {match.games?.length || 0} / 4 Games played
                            </Typography>
                          </Box>
                        )
                      })}
                    </AccordionDetails>
                  </Accordion>
                ))}
            </CardContent>
          </Card>
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
                  <Typography>Base Score: {match?.team1.team_name} {viewGame.team1_score} - {viewGame.team2_score} {match?.team2.team_name}</Typography>
                  <Typography>Total Score: {match?.team1.team_name} {viewGame.team1_total_score} - {viewGame.team2_total_score} {match?.team2.team_name}</Typography>
                  {(viewGame.team1_double_win || viewGame.team2_double_win) && (
                    <Typography color="primary">Double Win: {viewGame.team1_double_win ? match?.team1.team_name : match?.team2.team_name}</Typography>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewGame(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Match Details Dialog */}
        <MatchDetailsDialog 
          match={selectedMatch}
          open={showMatchDetails}
          onClose={() => setShowMatchDetails(false)}
          showActions={selectedMatch?.id === match?.id}
          onAddGame={() => {
            setShowMatchDetails(false)
            navigate('/team/game')
          }}
          onEditGame={(gameId) => {
            setShowMatchDetails(false)
            navigate(`/team/game?edit=${gameId}`)
          }}
          canEdit={!match?.team1_confirmed && !match?.team2_confirmed}
        />
      </Box>
    </>
  )
}
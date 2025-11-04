import { useState, useEffect, useRef } from 'react'
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { toast } from 'react-toastify'
import QRCode from 'qrcode'
import { 
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  SkipNext as SkipNextIcon,
  ExpandMore,
  QrCode as QrCodeIcon,
} from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import MatchDetailsDialog from '../../components/MatchDetailsDialog'
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
  const [expandedRound, setExpandedRound] = useState<number | false>(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [currentTab, setCurrentTab] = useState(0)
  const [sortBy, setSortBy] = useState<'victory_points' | 'points' | 'bombs'>('victory_points')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null)
  const [showMatchDetails, setShowMatchDetails] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [qrTeamName, setQrTeamName] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [allowGrandTichu, setAllowGrandTichu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null)
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const isLoadingRef = useRef(false)

  useEffect(() => {
    if (!user || !id) return
    fetchTournamentData()
  }, [user, id])

  const fetchTournamentData = async () => {
    if (!id || isLoadingRef.current) return
    
    isLoadingRef.current = true

    // Fetch tournament
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()

    // Fetch teams with bomb counts
    const { data: teamsData } = await supabase
      .from('teams')
      .select(`
        *,
        player1:player1_id(name),
        player2:player2_id(name)
      `)
      .eq('tournament_id', id)

    // Calculate bomb counts for all teams in one query
    if (teamsData) {
      const allPlayerIds = teamsData.flatMap(team => [team.player1_id, team.player2_id])
      
      const { data: bombData } = await supabase
        .from('game_participants')
        .select(`
          player_id,
          bomb_count,
          games!inner(
            tournament_matches!inner(
              tournament_id
            )
          )
        `)
        .in('player_id', allPlayerIds)
        .eq('games.tournament_matches.tournament_id', id)
      
      // Group bomb counts by team
      for (const team of teamsData) {
        team.total_bombs = bombData
          ?.filter(p => p.player_id === team.player1_id || p.player_id === team.player2_id)
          .reduce((sum, p) => sum + (p.bomb_count || 0), 0) || 0
      }
    }

    // Fetch current round matches
    const { data: matchesData } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(team_name),
        team2:team2_id(team_name),
        tournament_rounds!inner(round_number),
        games(id)
      `)
      .eq('tournament_id', id)

    setTournament(tournamentData)
    setTeams(teamsData || [])
    setMatches(matchesData || [])
    if (tournamentData) {
      setEditName(tournamentData.name)
      setEditDescription(tournamentData.description || '')
      setAllowGrandTichu(tournamentData.settings?.allow_grand_tichu ?? false)
    }
    setLoading(false)
    isLoadingRef.current = false
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
        toast.error(errorData.error || 'Nächste Runde konnte nicht gestartet werden')
      }
    } catch (error) {
      console.error('Error starting next round:', error)
      toast.error('Fehler beim Starten der nächsten Runde')
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
        toast.success('Turnier erfolgreich wiedereröffnet')
      } else {
        toast.error('Turnier konnte nicht wiedereröffnet werden')
      }
    } catch (error) {
      console.error('Error reopening tournament:', error)
      toast.error('Fehler beim Wiedereröffnen des Turniers')
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
        // Check for duplicate players
        if (player1.id === player2.id) {
          toast.error('Spieler 1 und Spieler 2 können nicht dieselbe Person sein')
          return
        }

        // Create team
        const { error } = await supabase
          .from('teams')
          .insert({
            tournament_id: id,
            team_name: teamName,
            player1_id: player1.id,
            player2_id: player2.id
          })

        if (error) {
          console.error('Team creation error:', error)
          if (error.code === '23505' && error.message.includes('teams_tournament_id_team_name_key')) {
            toast.error('Teamname existiert bereits in diesem Turnier')
          } else if (error.message?.includes('Player is already in another team')) {
            toast.error('Einer der Spieler ist bereits in einem anderen Team')
          } else {
            toast.error('Team konnte nicht erstellt werden')
          }
          return
        }

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

  const deleteTeam = async () => {
    if (!session || !id || !teamToDelete) return

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamToDelete.id)

      if (error) {
        toast.error('Team konnte nicht gelöscht werden')
      } else {
        toast.success('Team erfolgreich gelöscht')
        fetchTournamentData()
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Fehler beim Löschen des Teams')
    } finally {
      setShowDeleteConfirm(false)
      setTeamToDelete(null)
    }
  }

  const updateTournamentName = async () => {
    if (!tournament || !id) return

    const { error } = await supabase
      .from('tournaments')
      .update({ name: editName })
      .eq('id', id)

    if (error) {
      toast.error('Turniername konnte nicht aktualisiert werden')
    } else {
      setTournament({ ...tournament, name: editName })
      setEditingName(false)
      toast.success('Turniername aktualisiert')
    }
  }

  const updateTournamentDescription = async () => {
    if (!tournament || !id) return

    const { error } = await supabase
      .from('tournaments')
      .update({ description: editDescription })
      .eq('id', id)

    if (error) {
      toast.error('Turnierbeschreibung konnte nicht aktualisiert werden')
    } else {
      setTournament({ ...tournament, description: editDescription })
      setEditingDescription(false)
      toast.success('Turnierbeschreibung aktualisiert')
    }
  }

  const updateTournamentSettings = async () => {
    if (!tournament || !id) return

    const settings = {
      allow_grand_tichu: allowGrandTichu
    }

    const { error } = await supabase
      .from('tournaments')
      .update({ settings })
      .eq('id', id)

    if (error) {
      toast.error('Turniereinstellungen konnten nicht aktualisiert werden')
    } else {
      setTournament({ ...tournament, settings })
      setShowSettings(false)
      toast.success('Turniereinstellungen aktualisiert')
    }
  }

  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.tournament_rounds?.round_number || 0
    if (!acc[round]) acc[round] = []
    acc[round].push(match)
    return acc
  }, {} as Record<number, typeof matches>)

  // Auto-expand current round on load
  useEffect(() => {
    if (tournament && expandedRound === false && !loading) {
      setExpandedRound(tournament.current_round)
    }
  }, [tournament, loading])

  if (loading || !tournament) {
    return <Typography>Loading...</Typography>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editingName ? (
              <>
                <TextField
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  size="small"
                  sx={{ '& .MuiInputBase-input': { color: 'white' } }}
                />
                <Button color="inherit" onClick={updateTournamentName}>Speichern</Button>
                <Button color="inherit" onClick={() => { setEditingName(false); setEditName(tournament.name) }}>Abbrechen</Button>
              </>
            ) : (
              <>
                <Typography variant="h6" component="div">
                  {tournament.name}
                </Typography>
                <Button color="inherit" size="small" onClick={() => setEditingName(true)}>Bearbeiten</Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, width: '100%', minHeight: '100vh' }}>
          {/* Tournament Controls */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Turnierstatus
              </Typography>
              {editingDescription ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    size="small"
                    placeholder="Turnierbeschreibung"
                  />
                  <Button onClick={updateTournamentDescription}>Speichern</Button>
                  <Button onClick={() => { setEditingDescription(false); setEditDescription(tournament.description || '') }}>Abbrechen</Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {tournament.description || 'Keine Beschreibung'}
                  </Typography>
                  <Button size="small" onClick={() => setEditingDescription(true)}>Bearbeiten</Button>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip 
                  label={tournament.status} 
                  color={tournament.status === 'active' ? 'primary' : tournament.status === 'completed' ? 'success' : 'default'}
                />
                <Typography variant="body2">
                  Runde: {tournament.current_round} | Teams: {teams.length} / {tournament.max_teams}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {tournament.status === 'setup' && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setShowAddTeam(true)}
                    >
                      Team hinzufügen
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setShowSettings(true)}
                    >
                      Turniereinstellungen
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={startTournament}
                      disabled={teams.length < 4}
                    >
                      Turnier starten
                    </Button>
                  </>
                )}
                
                {tournament.status === 'active' && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setShowTeamCodes(true)}
                    >
                      Team-Codes anzeigen
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SkipNextIcon />}
                      onClick={startNextRound}
                    >
                      Nächste Runde starten
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<StopIcon />}
                      onClick={() => setShowFinishConfirm(true)}
                    >
                      Turnier beenden
                    </Button>
                  </>
                )}
                
                {tournament.status === 'completed' && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => setShowTeamCodes(true)}
                    >
                      Team-Codes anzeigen
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={reopenTournament}
                    >
                      Turnier wiedereröffnen
                    </Button>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
              <Tab label="Begegnungen" />
              <Tab label="Rangliste" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          {currentTab === 0 && (
            <>
              {/* Setup Phase: Team Overview */}
          {tournament.status === 'setup' && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Teams & Zugangscodes
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Teile diese Zugangscodes mit den Teams, damit sie ihre Ergebnisse eingeben können.
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Teamname</TableCell>
                        <TableCell>Spieler 1</TableCell>
                        <TableCell>Spieler 2</TableCell>
                        <TableCell>Zugangscode</TableCell>
                        <TableCell>Login-Link</TableCell>
                        <TableCell>Aktionen</TableCell>
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
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  const loginUrl = `${window.location.origin}/frontend/team/match?tournament=${tournament.id}&team=${team.id}&token=${team.access_token}`
                                  navigator.clipboard.writeText(loginUrl)
                                  toast.success('Login-Link in Zwischenablage kopiert!')
                                }}
                              >
                                Link kopieren
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<QrCodeIcon />}
                                onClick={async () => {
                                  const loginUrl = `${window.location.origin}/frontend/team/match?tournament=${tournament.id}&team=${team.id}&token=${team.access_token}`
                                  try {
                                    const qrDataUrl = await QRCode.toDataURL(loginUrl)
                                    setQrCodeUrl(qrDataUrl)
                                    setQrTeamName(team.team_name)
                                    setShowQrCode(true)
                                  } catch (err) {
                                    toast.error('QR-Code konnte nicht generiert werden')
                                  }
                                }}
                              >
                                QR
                              </Button>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                setTeamToDelete({ id: team.id, name: team.team_name })
                                setShowDeleteConfirm(true)
                              }}
                            >
                              Löschen
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {teams.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      Noch keine Teams hinzugefügt. Klicke auf "Team hinzufügen" um zu beginnen.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

              {/* Round Matches */}
              {Object.keys(matchesByRound).length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Turnierspiele
                    </Typography>
                    {Object.keys(matchesByRound)
                      .map(Number)
                      .sort((a, b) => b - a)
                      .map(round => (
                        <Accordion 
                          key={round}
                          expanded={expandedRound === round}
                          onChange={(_, isExpanded) => setExpandedRound(isExpanded ? round : false)}
                        >
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography 
                                sx={{ 
                                  fontWeight: round === tournament.current_round ? 'bold' : 'normal',
                                  color: round === tournament.current_round ? 'primary.main' : 'inherit'
                                }}
                              >
                                Runde {round}
                              </Typography>
                              {round === tournament.current_round && (
                                <Chip label="Aktuelle Runde" size="small" color="primary" />
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <TableContainer>
                              <Table size="medium">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Tisch</TableCell>
                                    <TableCell>Team 1</TableCell>
                                    <TableCell>Team 2</TableCell>
                                    <TableCell>Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {matchesByRound[round].map((match) => (
                                    <TableRow key={match.id}>
                                      <TableCell>{match.table_number}</TableCell>
                                      <TableCell>{match.team1?.team_name}</TableCell>
                                      <TableCell>{match.team2?.team_name}</TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Chip 
                                            label={match.status} 
                                            color={match.status === 'completed' ? 'success' : 'default'}
                                            size="small"
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                            {match.games?.length || 0}/4
                                          </Typography>
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
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </AccordionDetails>
                        </Accordion>
                      ))
                    }
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Rankings Tab */}
          {currentTab === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team-Rangliste
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Rang</TableCell>
                        <TableCell>Teamname</TableCell>
                        <TableCell>Spieler</TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => {
                            if (sortBy === 'victory_points') {
                              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                            } else {
                              setSortBy('victory_points')
                              setSortOrder('desc')
                            }
                          }}
                        >
                          Siegpunkte {sortBy === 'victory_points' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => {
                            if (sortBy === 'points') {
                              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                            } else {
                              setSortBy('points')
                              setSortOrder('desc')
                            }
                          }}
                        >
                          Tichu-Punkte {sortBy === 'points' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => {
                            if (sortBy === 'bombs') {
                              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                            } else {
                              setSortBy('bombs')
                              setSortOrder('desc')
                            }
                          }}
                        >
                          Bomben {sortBy === 'bombs' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...teams].sort((a, b) => {
                        if (sortBy === 'victory_points') {
                          const diff = (b.victory_points || 0) - (a.victory_points || 0)
                          return sortOrder === 'desc' ? diff : -diff
                        } else if (sortBy === 'points') {
                          const diff = (b.total_points || 0) - (a.total_points || 0)
                          return sortOrder === 'desc' ? diff : -diff
                        } else {
                          const diff = (b.total_bombs || 0) - (a.total_bombs || 0)
                          return sortOrder === 'desc' ? diff : -diff
                        }
                      }).map((team, index) => (
                        <TableRow key={team.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {index + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {team.team_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {team.player1?.name} & {team.player2?.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {team.victory_points || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {team.total_points || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {team.total_bombs || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {teams.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      Noch keine Teams hinzugefügt.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
      </Box>

      {/* Add Team Dialog */}
      <Dialog open={showAddTeam} onClose={() => setShowAddTeam(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Team hinzufügen</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Teamname"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Spieler 1 Name"
            value={player1Name}
            onChange={(e) => setPlayer1Name(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Spieler 2 Name"
            value={player2Name}
            onChange={(e) => setPlayer2Name(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddTeam(false)}>Abbrechen</Button>
          <Button 
            onClick={addTeam} 
            variant="contained"
            disabled={!teamName || !player1Name || !player2Name}
          >
            Team hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finish Tournament Confirmation */}
      <Dialog open={showFinishConfirm} onClose={() => setShowFinishConfirm(false)}>
        <DialogTitle>Turnier beenden</DialogTitle>
        <DialogContent>
          <Typography>
            Bist du sicher, dass du dieses Turnier beenden möchtest? Es wird als abgeschlossen markiert und die Endwertung berechnet.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinishConfirm(false)}>Abbrechen</Button>
          <Button onClick={finishTournament} variant="contained" color="error">
            Turnier beenden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Codes Dialog */}
      <Dialog open={showTeamCodes} onClose={() => setShowTeamCodes(false)} maxWidth="md" fullWidth>
        <DialogTitle>Team-Zugangscodes</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Teamname</TableCell>
                  <TableCell>Spieler 1</TableCell>
                  <TableCell>Spieler 2</TableCell>
                  <TableCell>Zugangscode</TableCell>
                  <TableCell>Login-Link</TableCell>
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
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const loginUrl = `${window.location.origin}/frontend/team/match?tournament=${tournament.id}&team=${team.id}&token=${team.access_token}`
                            navigator.clipboard.writeText(loginUrl)
                            toast.success('Login-Link in Zwischenablage kopiert!')
                          }}
                        >
                          Link kopieren
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<QrCodeIcon />}
                          onClick={async () => {
                            const loginUrl = `${window.location.origin}/frontend/team/match?tournament=${tournament.id}&team=${team.id}&token=${team.access_token}`
                            try {
                              const qrDataUrl = await QRCode.toDataURL(loginUrl)
                              setQrCodeUrl(qrDataUrl)
                              setQrTeamName(team.team_name)
                              setShowQrCode(true)
                            } catch (err) {
                              toast.error('Failed to generate QR code')
                            }
                          }}
                        >
                          QR
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTeamCodes(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Tournament Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Turniereinstellungen</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowGrandTichu}
                  onChange={(e) => setAllowGrandTichu(e.target.checked)}
                />
              }
              label="Großes Tichu erlauben"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Wenn deaktiviert, können Teams nur Kleines Tichu ansagen.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Abbrechen</Button>
          <Button onClick={updateTournamentSettings} variant="contained">
            Einstellungen speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrCode} onClose={() => setShowQrCode(false)} maxWidth="sm">
        <DialogTitle>QR-Code für {qrTeamName}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          {qrCodeUrl && (
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Scanne diesen QR-Code um direkt zum Team-Login zu gelangen
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQrCode(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Team Confirmation */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>Team löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Bist du sicher, dass du das Team "{teamToDelete?.name}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Abbrechen</Button>
          <Button onClick={deleteTeam} variant="contained" color="error">
            Team löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Match Details Dialog */}
      <MatchDetailsDialog 
        match={selectedMatch}
        open={showMatchDetails}
        onClose={() => setShowMatchDetails(false)}
      />
    </>
  )
}
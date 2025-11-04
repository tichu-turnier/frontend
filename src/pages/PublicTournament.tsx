import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Typography, Tabs, Tab, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Accordion, AccordionSummary, AccordionDetails, Button } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { supabase } from '../lib/supabase'
import LiveBadge from '../components/LiveBadge'
import MatchDetailsDialog from '../components/MatchDetailsDialog'
import type { Tournament, Team, TournamentMatch } from '../lib/types'

export default function PublicTournament() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [currentTab, setCurrentTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null)
  const [showMatchDetails, setShowMatchDetails] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchTournamentData()
    
    if (tournament?.status === 'active') {
      const interval = setInterval(fetchTournamentData, 30000)
      return () => clearInterval(interval)
    }
  }, [id, tournament?.status])

  const fetchTournamentData = async () => {
    if (!id) return

    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()

    const { data: teamsData } = await supabase
      .from('teams')
      .select(`
        *,
        player1:player1_id(name),
        player2:player2_id(name)
      `)
      .eq('tournament_id', id)
      .order('victory_points', { ascending: false })

    const { data: matchesData } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(team_name),
        team2:team2_id(team_name),
        tournament_rounds!inner(round_number),
        games(*)
      `)
      .eq('tournament_id', id)

    setTournament(tournamentData)
    setTeams(teamsData || [])
    setMatches(matchesData || [])
    setLoading(false)
  }

  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.tournament_rounds?.round_number || 1
    if (!acc[round]) acc[round] = []
    acc[round].push(match)
    return acc
  }, {} as Record<number, TournamentMatch[]>)

  if (loading || !tournament) return <div>Lädt...</div>

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography variant="h4" component="h1">
          {tournament.name}
        </Typography>
        {tournament.status === 'active' && <LiveBadge />}
      </Box>

      {tournament.description && (
        <Typography variant="body1" color="text.secondary" mb={3}>
          {tournament.description}
        </Typography>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
          <Tab label="Rangliste" />
          <Tab label="Begegnungen" />
          <Tab label="Statistiken" />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rang</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Spieler</TableCell>
                <TableCell align="right">Siegpunkte</TableCell>
                <TableCell align="right">Tichu-Punkte</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team, index) => (
                <TableRow key={team.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{team.team_name}</TableCell>
                  <TableCell>
                    {team.player1?.name} & {team.player2?.name}
                  </TableCell>
                  <TableCell align="right">{team.victory_points || 0}</TableCell>
                  <TableCell align="right">{team.points || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {currentTab === 1 && (
        <Box>
          {Object.entries(matchesByRound)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([round, roundMatches]) => (
              <Accordion key={round}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">
                    Runde {round} ({roundMatches.length} Begegnungen)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {roundMatches.map(match => (
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
                        {match.games?.length || 0} / 4 Spiele gespielt
                      </Typography>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
        </Box>
      )}

      {currentTab === 2 && (
        <Typography variant="h6" color="text.secondary" align="center" py={4}>
          Statistiken kommen bald...
        </Typography>
      )}

      <MatchDetailsDialog 
        match={selectedMatch}
        open={showMatchDetails}
        onClose={() => setShowMatchDetails(false)}
      />
    </Container>
  )
}
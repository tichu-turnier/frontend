import { useState, useEffect } from 'react'
import { Container, Typography, Tabs, Tab, Box, Grid } from '@mui/material'
import { supabase } from '../lib/supabase'
import TournamentCard from '../components/TournamentCard'
import type { Tournament } from '../lib/types'

export default function PublicHome() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [currentTab, setCurrentTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()
    const interval = setInterval(fetchTournaments, 30000) // Live updates every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select(`
        *,
        teams(id),
        tournament_rounds(round_number)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      const tournamentsWithCounts = data.map(tournament => ({
        ...tournament,
        team_count: tournament.teams?.length || 0,
        current_round: Math.max(...(tournament.tournament_rounds?.map(r => r.round_number) || [0]))
      }))
      setTournaments(tournamentsWithCounts)
    }
    setLoading(false)
  }

  const filteredTournaments = tournaments.filter(tournament => {
    if (currentTab === 0) return tournament.status === 'active' // Aktuelle
    if (currentTab === 1) return tournament.status === 'completed' // Vergangene
    return true // Alle
  })

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Tichu Tournaments
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)} centered>
          <Tab label="Active Tournaments" />
          <Tab label="Past Tournaments" />
          <Tab label="All Tournaments" />
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {filteredTournaments.map(tournament => (
          <Grid item xs={12} sm={6} md={4} key={tournament.id}>
            <TournamentCard tournament={tournament} />
          </Grid>
        ))}
      </Grid>

      {filteredTournaments.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No tournaments found
          </Typography>
        </Box>
      )}
    </Container>
  )
}
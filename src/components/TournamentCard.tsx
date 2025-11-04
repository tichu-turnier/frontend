import { Card, CardContent, Typography, Chip, Button, Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import LiveBadge from './LiveBadge'
import type { Tournament } from '../lib/types'

interface TournamentCardProps {
  tournament: Tournament & {
    team_count: number
    current_round: number
  }
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return 'default'
      case 'active': return 'primary'
      case 'completed': return 'success'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'setup': return 'Vorbereitung'
      case 'active': return 'Aktiv'
      case 'completed': return 'Abgeschlossen'
      default: return status
    }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="h2" gutterBottom>
            {tournament.name}
          </Typography>
          {tournament.status === 'active' && <LiveBadge />}
        </Box>

        {tournament.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {tournament.description}
          </Typography>
        )}

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip 
            label={getStatusLabel(tournament.status)} 
            color={getStatusColor(tournament.status)}
            size="small"
          />
          <Chip 
            label={`${tournament.team_count} Teams`} 
            variant="outlined"
            size="small"
          />
          {tournament.status === 'active' && tournament.current_round > 0 && (
            <Chip 
              label={`Runde ${tournament.current_round}`} 
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2}>
          {new Date(tournament.created_at).toLocaleDateString('de-DE')}
        </Typography>
      </CardContent>

      <Box p={2} pt={0}>
        <Button 
          variant="contained" 
          fullWidth
          onClick={() => navigate(`/public/tournament/${tournament.id}`)}
        >
          Details anzeigen
        </Button>
      </Box>
    </Card>
  )
}
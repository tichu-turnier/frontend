import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Paper,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material'
import { Home as HomeIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'

const adjectives = ['rot', 'blau', 'gruen', 'gelb', 'lila', 'orange', 'rosa', 'schwarz', 'weiss', 'silber', 'gold', 'hell', 'dunkel', 'schnell', 'langsam', 'gross', 'klein', 'froh', 'stark', 'wild']
const nouns = ['katze', 'hund', 'vogel', 'fisch', 'loewe', 'tiger', 'baer', 'wolf', 'fuchs', 'reh', 'baum', 'stein', 'stern', 'mond', 'sonne', 'feuer', 'wasser', 'wind', 'wolke', 'berg']

export default function TeamLogin() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTournament, setSelectedTournament] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [showCodePicker, setShowCodePicker] = useState(false)
  const [selectedAdjective, setSelectedAdjective] = useState('')
  const [selectedNoun, setSelectedNoun] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if already logged in via URL params
    const tournamentId = searchParams.get('tournament')
    const teamId = searchParams.get('team')
    const accessToken = searchParams.get('token')
    
    if (tournamentId && teamId && accessToken) {
      navigate(`/team/match?${searchParams.toString()}`)
      return
    }
    
    fetchActiveTournaments()
  }, [navigate, searchParams])

  useEffect(() => {
    if (selectedTournament) {
      fetchTeamsForTournament(selectedTournament)
    } else {
      setTeams([])
      setSelectedTeam('')
    }
  }, [selectedTournament])

  const fetchActiveTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, name')
      .eq('status', 'active')

    if (!error && data) {
      setTournaments(data)
    }
  }

  const fetchTeamsForTournament = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, team_name, access_token')
      .eq('tournament_id', tournamentId)

    if (!error && data) {
      setTeams(data)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const team = teams.find(t => t.id === selectedTeam)
    if (!team || team.access_token !== accessCode) {
      setError('Invalid team or access code')
      setLoading(false)
      return
    }

    const params = new URLSearchParams({
      tournament: selectedTournament,
      team: team.id,
      token: team.access_token
    })

    navigate(`/team/match?${params.toString()}`)
    setLoading(false)
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      bgcolor: 'grey.100'
    }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%', mx: 2, position: 'relative' }}>
        <IconButton 
          onClick={() => navigate('/')}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <HomeIcon />
        </IconButton>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Team Login
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Select Tournament</InputLabel>
            <Select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              label="Select Tournament"
            >
              {tournaments.map((tournament) => (
                <MenuItem key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal" required disabled={!selectedTournament}>
            <InputLabel>Select Team</InputLabel>
            <Select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              label="Select Team"
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.team_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowCodePicker(true)}
            disabled={!selectedTeam}
            sx={{ mt: 2, py: 2 }}
          >
            {accessCode ? `Access Code: ${accessCode}` : 'Select Access Code'}
          </Button>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !selectedTeam || !accessCode}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </Box>
      </Paper>

      {/* Access Code Picker Dialog */}
      <Dialog open={showCodePicker} onClose={() => setShowCodePicker(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Access Code</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Choose first word:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {adjectives.map((word) => (
              <Button
                key={word}
                variant={selectedAdjective === word ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedAdjective(word)}
              >
                {word}
              </Button>
            ))}
          </Box>
          
          <Typography variant="h6" gutterBottom>
            Choose second word:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {nouns.map((word) => (
              <Button
                key={word}
                variant={selectedNoun === word ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedNoun(word)}
              >
                {word}
              </Button>
            ))}
          </Box>
          
          {selectedAdjective && selectedNoun && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6" align="center">
                {selectedAdjective}-{selectedNoun}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCodePicker(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setAccessCode(`${selectedAdjective}-${selectedNoun}`)
              setShowCodePicker(false)
            }}
            variant="contained"
            disabled={!selectedAdjective || !selectedNoun}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
import { useNavigate } from 'react-router-dom'
import {
  Paper,
  Button,
  Typography,
  Box,
  Grid,
} from '@mui/material'
import { 
  AdminPanelSettings as AdminIcon,
  Groups as TeamIcon,
  Visibility as PublicIcon 
} from '@mui/icons-material'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      bgcolor: 'grey.100',
      p: 2
    }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%' }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Tichu Turnier
        </Typography>
        
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Wähle deine Zugangsebene
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AdminIcon />}
              onClick={() => navigate('/admin/login')}
              sx={{ py: 3, flexDirection: 'column', gap: 1 }}
            >
              <Typography variant="h6">Admin</Typography>
              <Typography variant="body2">Turnierverwaltung</Typography>
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<TeamIcon />}
              onClick={() => navigate('/team/login')}
              sx={{ py: 3, flexDirection: 'column', gap: 1 }}
            >
              <Typography variant="h6">Team</Typography>
              <Typography variant="body2">Spielergebnisse eingeben</Typography>
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<PublicIcon />}
              onClick={() => navigate('/public')}
              sx={{ py: 3, flexDirection: 'column', gap: 1 }}
            >
              <Typography variant="h6">Öffentlich</Typography>
              <Typography variant="body2">Turniere anschauen</Typography>
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Admin Pages
import LoginPage from './pages/admin/LoginPage'
import Dashboard from './pages/admin/Dashboard'
import CreateTournament from './pages/admin/CreateTournament'
import TournamentManagement from './pages/admin/TournamentManagement'
import ProtectedRoute from './components/admin/ProtectedRoute'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          maxWidth: 'none !important',
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Redirect root to admin */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/create" element={<ProtectedRoute><CreateTournament /></ProtectedRoute>} />
          <Route path="/admin/tournament/:id" element={<ProtectedRoute><TournamentManagement /></ProtectedRoute>} />
        </Routes>
      </Router>
      <ToastContainer position="bottom-right" />
    </ThemeProvider>
  )
}

export default App

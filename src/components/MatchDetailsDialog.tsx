import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import { Close as CloseIcon, ExpandMore } from '@mui/icons-material'
import { supabase } from '../lib/supabase'
import type { TournamentMatch } from '../lib/types'

interface Game {
  id: string
  game_number: number
  team1_score: number
  team2_score: number
  team1_total_score: number
  team2_total_score: number
  team1_victory_points: number
  team2_victory_points: number
  game_participants: Array<{
    player_id: string
    position: number | null
    tichu_call: boolean
    grand_tichu_call: boolean
    tichu_success: boolean
    bomb_count: number
    team: number
    players: { name: string }
  }>
}

interface MatchDetailsDialogProps {
  match: TournamentMatch | null
  open: boolean
  onClose: () => void
}

export default function MatchDetailsDialog({ match, open, onClose }: MatchDetailsDialogProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedGame, setExpandedGame] = useState<string | false>(false)

  useEffect(() => {
    if (match && open) {
      fetchGameDetails()
    }
  }, [match, open])

  const fetchGameDetails = async () => {
    if (!match) return
    
    setLoading(true)
    const { data } = await supabase
      .from('games')
      .select(`
        *,
        game_participants(
          player_id,
          position,
          tichu_call,
          grand_tichu_call,
          tichu_success,
          bomb_count,
          team,
          players(name)
        )
      `)
      .eq('match_id', match.id)
      .order('game_number')

    setGames(data || [])
    setLoading(false)
  }

  if (!match) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {match.team1?.team_name} vs {match.team2?.team_name}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={2}>
          <Chip 
            label={match.status} 
            color={match.status === 'completed' ? 'success' : 'default'}
            sx={{ mr: 1 }}
          />
          <Typography variant="body2" color="text.secondary" component="span">
            {games.length} / 4 Games played
          </Typography>
        </Box>

        {games.length > 0 && (
          <Box>
            {games.map(game => {
              const team1Players = game.game_participants?.filter(p => p.team === 1) || []
              const team2Players = game.game_participants?.filter(p => p.team === 2) || []
              
              return (
                <Accordion 
                  key={game.id}
                  expanded={expandedGame === game.id}
                  onChange={(_, isExpanded) => setExpandedGame(isExpanded ? game.id : false)}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" justifyContent="space-between" width="100%" mr={2}>
                      <Typography>Game {game.game_number}</Typography>
                      <Typography>
                        {game.team1_total_score} ({game.team1_victory_points} VP) - {game.team2_total_score} ({game.team2_victory_points} VP)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell align="center"><strong>{match.team1?.team_name}</strong></TableCell>
                            <TableCell align="center"><strong>{match.team2?.team_name}</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell align="center">{game.team1_score} points</TableCell>
                            <TableCell align="center">{game.team2_score} points</TableCell>
                          </TableRow>
                          {[0, 1].map(playerIndex => {
                            const team1Player = team1Players[playerIndex]
                            const team2Player = team2Players[playerIndex]
                            return (
                              <TableRow key={playerIndex}>
                                <TableCell align="center">
                                  {team1Player ? (
                                    <Box>
                                      <Typography variant="body2">{team1Player.players?.name}</Typography>
                                      <Box display="flex" gap={0.5} justifyContent="center" mt={0.5}>
                                        <Chip label={team1Player.position || 'N/A'} size="small" variant="outlined" />
                                        {team1Player.tichu_call && <Chip label="T" size="small" color={team1Player.tichu_success ? 'success' : 'error'} />}
                                        {team1Player.grand_tichu_call && <Chip label="GT" size="small" color={team1Player.tichu_success ? 'success' : 'error'} />}
                                        <Typography variant="caption">{'💣'.repeat(team1Player.bomb_count)}</Typography>
                                      </Box>
                                    </Box>
                                  ) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {team2Player ? (
                                    <Box>
                                      <Typography variant="body2">{team2Player.players?.name}</Typography>
                                      <Box display="flex" gap={0.5} justifyContent="center" mt={0.5}>
                                        <Chip label={team2Player.position || 'N/A'} size="small" variant="outlined" />
                                        {team2Player.tichu_call && <Chip label="T" size="small" color={team2Player.tichu_success ? 'success' : 'error'} />}
                                        {team2Player.grand_tichu_call && <Chip label="GT" size="small" color={team2Player.tichu_success ? 'success' : 'error'} />}
                                        <Typography variant="caption">{'💣'.repeat(team2Player.bomb_count)}</Typography>
                                      </Box>
                                    </Box>
                                  ) : '-'}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )
            })}
          </Box>
        )}

        {games.length === 0 && !loading && (
          <Typography color="text.secondary" align="center" py={2}>
            No games played yet
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
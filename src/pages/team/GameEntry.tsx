import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  CircularProgress,
  Backdrop,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-toastify'

type TichuCall = 'NONE' | 'ST' | 'GT'

const TICHU_POINTS = 100
const GRAND_TICHU_POINTS = 200
const DOUBLE_WIN_POINTS = 200

export default function GameEntry() {
  const [match, setMatch] = useState<any>(null)
  const [teamAuth, setTeamAuth] = useState<any>(null)
  const [positions, setPositions] = useState<(number | null)[]>([null, null, null, null])
  const [tichuCalls, setTichuCalls] = useState<TichuCall[]>(['NONE', 'NONE', 'NONE', 'NONE'])
  const [bombCounts, setBombCounts] = useState<number[]>([0, 0, 0, 0])
  const [teamScores, setTeamScores] = useState<number[]>([50, 50])
  const [doubleWinTeam, setDoubleWinTeam] = useState<number | null>(null)
  const [teamTotalScores, setTeamTotalScores] = useState<number[]>([0, 0])
  const [error, setError] = useState<string | null>(null)
  const [beschissFlag, setBeschissFlag] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const navigate = useNavigate()

  const players = match ? [
    match.team1.player1?.name || 'Player 1',
    match.team1.player2?.name || 'Player 2', 
    match.team2.player1?.name || 'Player 3',
    match.team2.player2?.name || 'Player 4'
  ] : []
  const teams = [1, 1, 2, 2]

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

  useEffect(() => updateDoubleWin(), [positions])
  useEffect(() => updateBonusPoints(), [tichuCalls, teamScores, positions, doubleWinTeam])

  const fetchCurrentMatch = async (teamId: string) => {
    const { data: matchData, error } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:team1_id(id, team_name, player1:player1_id(name), player2:player2_id(name)),
        team2:team2_id(id, team_name, player1:player1_id(name), player2:player2_id(name)),
        games(id)
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .in('status', ['playing'])
      .single()

    if (error) {
      console.error('Match fetch error:', error)
      toast.error('No active match found')
      navigate('/team/match')
      return
    }

    setMatch(matchData)
  }

  const handleTeam1ScoreChange = (_event: Event, value: number | number[]) => {
    const score = Array.isArray(value) ? value[0] : value
    setTeamScores([score, 100 - score])
  }

  const handleTichuCallChange = (
    idx: number,
    newTichuCall: TichuCall,
    setTichuCalls: React.Dispatch<React.SetStateAction<TichuCall[]>>,
  ) => {
    if (newTichuCall === null) {
      newTichuCall = 'NONE'
    }
    setTichuCalls((prev) => {
      const updated = [...prev]
      updated[idx] = newTichuCall
      return updated
    })
  }

  const updateDoubleWin = () => {
    const firstIndex = positions.findIndex((pos) => pos === 1)
    const secondIndex = positions.findIndex((pos) => pos === 2)
    if (firstIndex !== -1 && secondIndex !== -1 && teams[firstIndex] === teams[secondIndex]) {
      const winningTeam = teams[firstIndex]
      setDoubleWinTeam(winningTeam)
      // Clear positions of losing team only if they're not already cleared
      const needsClearing = positions.some((pos, idx) => 
        teams[idx] !== winningTeam && pos !== null
      )
      if (needsClearing) {
        setPositions(prev => prev.map((pos, idx) => 
          teams[idx] !== winningTeam ? null : pos
        ))
      }
    } else {
      setDoubleWinTeam(null)
    }
  }

  const updateBonusPoints = () => {
    const bonusPoints = [0, 0]

    players.forEach((_, idx) => {
      const call = tichuCalls[idx]
      const success = positions[idx] === 1
      const team = teams[idx] - 1

      if (call === 'ST') {
        bonusPoints[team] += success ? TICHU_POINTS : -TICHU_POINTS
      } else if (call === 'GT') {
        bonusPoints[team] += success ? GRAND_TICHU_POINTS : -GRAND_TICHU_POINTS
      }
    })

    if (doubleWinTeam !== null) {
      bonusPoints[doubleWinTeam - 1] += DOUBLE_WIN_POINTS
    }

    setTeamTotalScores([
      (doubleWinTeam == null ? teamScores[0] : 0) + bonusPoints[0],
      (doubleWinTeam == null ? teamScores[1] : 0) + bonusPoints[1],
    ])
  }

  const handleSubmit = async () => {
    if (isSaving || !match) return

    setError(null)
    setIsSaving(true)

    try {
      if (doubleWinTeam === null && positions.some((pos) => pos === null)) {
        setError('Please set the finishing position for all players.')
        return
      }
      
      if (doubleWinTeam !== null && positions.some((pos, idx) => pos === null && teams[idx] === doubleWinTeam)) {
        setError('Please set positions for winning team players.')
        return
      }

      if (doubleWinTeam === null) {
        const uniquePositions = new Set(positions)
        if (uniquePositions.size !== 4 || ![1, 2, 3, 4].every((n) => uniquePositions.has(n))) {
          setError('Positions must be unique and between 1 and 4.')
          return
        }
      } else {
        const nonNullPositions = positions.filter(pos => pos !== null)
        const uniquePositions = new Set(nonNullPositions)
        if (uniquePositions.size !== 2 || !uniquePositions.has(1) || !uniquePositions.has(2)) {
          setError('For double win, only positions 1 and 2 should be set.')
          return
        }
      }

      const gameNumber = (match.games?.length || 0) + 1
      
      const participants = [
        { 
          player_id: match.team1.player1?.id, 
          team: 1, 
          position: positions[0], 
          bomb_count: bombCounts[0], 
          tichu_call: tichuCalls[0] === 'ST',
          grand_tichu_call: tichuCalls[0] === 'GT',
          tichu_success: positions[0] === 1 && tichuCalls[0] !== 'NONE'
        },
        { 
          player_id: match.team1.player2?.id, 
          team: 1, 
          position: positions[1], 
          bomb_count: bombCounts[1], 
          tichu_call: tichuCalls[1] === 'ST',
          grand_tichu_call: tichuCalls[1] === 'GT',
          tichu_success: positions[1] === 1 && tichuCalls[1] !== 'NONE'
        },
        { 
          player_id: match.team2.player1?.id, 
          team: 2, 
          position: positions[2], 
          bomb_count: bombCounts[2], 
          tichu_call: tichuCalls[2] === 'ST',
          grand_tichu_call: tichuCalls[2] === 'GT',
          tichu_success: positions[2] === 1 && tichuCalls[2] !== 'NONE'
        },
        { 
          player_id: match.team2.player2?.id, 
          team: 2, 
          position: positions[3], 
          bomb_count: bombCounts[3], 
          tichu_call: tichuCalls[3] === 'ST',
          grand_tichu_call: tichuCalls[3] === 'GT',
          tichu_success: positions[3] === 1 && tichuCalls[3] !== 'NONE'
        }
      ]

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-scores`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
          'team-token': teamAuth.accessToken,
        },
        body: JSON.stringify({
          match_id: match.id,
          game_number: gameNumber,
          team1_score: doubleWinTeam !== null ? 0 : teamScores[0],
          team2_score: doubleWinTeam !== null ? 0 : teamScores[1],
          team1_total_score: teamTotalScores[0],
          team2_total_score: teamTotalScores[1],
          team1_double_win: doubleWinTeam === 1,
          team2_double_win: doubleWinTeam === 2,
          participants: participants
        }),
      })

      if (response.ok) {
        toast.success('Game saved successfully!')
        navigate('/team/match')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save game')
      }
    } catch (err) {
      console.error('Error saving game:', err)
      toast.error('Error saving game')
    } finally {
      setIsSaving(false)
    }
  }

  if (!match) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Enter Game Results
      </Typography>

      <Table sx={{ "& .MuiTableCell-root": { py: 1, px: 1 } }}>
        <TableHead>
          <TableRow>
            <TableCell align="center" colSpan={2}>
              Team 1
            </TableCell>
            <TableCell align="center" colSpan={2}>
              Team 2
            </TableCell>
          </TableRow>
          <TableRow>
            {players.map((player) => (
              <TableCell align="center">{player}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {players.map((player, idx) => (
              <TableCell align="center">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                    minWidth: "36px",
                    height: "32px",
                  }}
                >
                  <Box sx={{ flex: 1 }}></Box>
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {positions[idx] === null ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={doubleWinTeam !== null && teams[idx] !== doubleWinTeam}
                        sx={{
                          minWidth: "36px",
                          height: "32px",
                        }}
                        aria-label={`Set the finishing order for ${player} to the next available position`}
                        onClick={() => {
                          setPositions((prev) => {
                            const newPositions = [...prev];
                            const usedPositions = new Set(
                              newPositions.filter((p) => p !== null),
                            );
                            for (let i = 1; i <= 4; i++) {
                              if (!usedPositions.has(i)) {
                                newPositions[idx] = i;
                                break;
                              }
                            }
                            return newPositions;
                          });
                        }}
                      >
                        Finish
                      </Button>
                    ) : (
                      <Typography>{positions[idx]}.</Typography>
                    )}
                  </Box>
                  {positions[idx] !== null && (
                    <Button
                      size="small"
                      sx={{
                        minWidth: "36px",
                        height: "32px",
                      }}
                      aria-label={`Reset the finishing order for ${player}`}
                      onClick={() => {
                        setPositions((prev) => {
                          const newPositions = [...prev];
                          newPositions[idx] = null;
                          return newPositions;
                        });
                      }}
                    >
                      🗑️
                    </Button>
                  )}
                </Box>
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            {players.map((player, idx) => (
              <TableCell align="center">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={tichuCalls[idx]}
                  onChange={(_, newVal) => handleTichuCallChange(idx, newVal, setTichuCalls)}
                  aria-label={`Tichu call for player ${player}`}
                >
                  {["ST", "GT"].map((tichu) => (
                    <ToggleButton key={tichu} value={tichu} aria-label={`Tichu call ${tichu}`}>
                      {tichu}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            {players.map((player, idx) => (
              <TableCell align="center">
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    minWidth: "36px",
                    height: "32px",
                    opacity: bombCounts[idx] === 0 ? "60%" : "100%",
                  }}
                  aria-label={`Increment bomb count for player ${player}`}
                  onClick={() => {
                    setBombCounts((prev) => {
                      const newCounter = [...prev];
                      newCounter[idx] = (newCounter[idx] + 1) % 4;
                      return newCounter;
                    });
                  }}
                >
                  {bombCounts[idx] === 0 ? "💣" : "💣".repeat(bombCounts[idx])}
                </Button>
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            {[1, 2].map((team) => (
              <TableCell align="center" colSpan={2}>
                <Typography>
                  Score
                </Typography>
                <Typography variant="h6">{doubleWinTeam != null ? 0 : teamScores[team - 1]}</Typography>
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            {[1, 2].map((team) => (
              <TableCell align="center" colSpan={2}>
                <Typography>
                  with bonus points
                </Typography>
                <Typography variant="h6">{teamTotalScores[team - 1]}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>

      <Box mb={1} sx={{ mt: 4 }}>
        <Typography variant="caption">
          Team 1 Score
        </Typography>
        <Slider
          value={teamScores[0]}
          min={-25}
          max={125}
          step={5}
          disabled={doubleWinTeam != null}
          onChange={handleTeam1ScoreChange}
          valueLabelDisplay="auto"
          sx={{ mt: 0 }}
        />
      </Box>

      {error && (
        <Typography color="error" mt={2}>
          Error: {error}
        </Typography>
      )}

      <Box mt={3} display="flex" gap={2}>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={isSaving}>
          Save Game
        </Button>
        <Button
          variant="outlined"
          onClick={() => setBeschissFlag(!beschissFlag)}
          sx={{
            color: beschissFlag ? "white" : "error.main",
            bgcolor: beschissFlag ? "error.main" : "transparent",
            borderColor: beschissFlag ? "error.main" : "rgba(0, 0, 0, 0.23)",
            "&:hover": {
              bgcolor: "rgba(0, 0, 0, 0.04)",
              borderColor: "error.main",
            },
          }}
        >
          {beschissFlag ? 'Beschiss ✓' : 'Beschiss'}
        </Button>
      </Box>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isSaving}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  )
}
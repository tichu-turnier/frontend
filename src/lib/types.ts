export interface Tournament {
  id: string
  name: string
  description?: string
  status: 'setup' | 'active' | 'completed' | 'cancelled'
  max_teams: number
  current_round: number
  total_rounds?: number
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  tournament_id: string
  team_name: string
  player1_id: string
  player2_id: string
  access_token: string
  total_points: number
  created_at: string
}

export interface Player {
  id: string
  name: string
  created_at: string
}

export interface TournamentMatch {
  id: string
  round_id: string
  tournament_id: string
  team1_id: string
  team2_id: string
  table_number: number
  status: 'pending' | 'playing' | 'confirming' | 'completed'
  team1_confirmed: boolean
  team2_confirmed: boolean
  completed_at?: string
  created_at: string
}

export interface Game {
  id: string
  match_id: string
  game_number: number
  team1_score: number
  team2_score: number
  team1_total_score: number
  team2_total_score: number
  created_at: string
}
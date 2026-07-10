export type UserRole = 'user' | 'club'
export type TournamentStatus = 'draft' | 'open' | 'running' | 'finished'
export type ParticipantStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: UserRole
          cidade: string | null
          estado: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: UserRole
          cidade?: string | null
          estado?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: UserRole
          cidade?: string | null
          estado?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          id: string
          user_id: string
          name: string
          cidade: string | null
          estado: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          cidade?: string | null
          estado?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          cidade?: string | null
          estado?: string | null
        }
        Relationships: []
      }
      birds: {
        Row: {
          id: string
          user_id: string
          name: string
          raca: string | null
          estilo_canto: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          raca?: string | null
          estilo_canto?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          raca?: string | null
          estilo_canto?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          club_id: string
          name: string
          start_at: string | null
          duration_secs: number
          status: TournamentStatus
          qr_token: string
          cidade: string | null
          estado: string | null
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          name: string
          start_at?: string | null
          duration_secs?: number
          status?: TournamentStatus
          qr_token?: string
          cidade?: string | null
          estado?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          name?: string
          start_at?: string | null
          duration_secs?: number
          status?: TournamentStatus
          qr_token?: string
          cidade?: string | null
          estado?: string | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          id: string
          tournament_id: string
          user_id: string | null
          user_name: string
          bird_name: string
          cage_number: number | null
          status: ParticipantStatus
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id?: string | null
          user_name: string
          bird_name: string
          cage_number?: number | null
          status?: ParticipantStatus
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string | null
          user_name?: string
          bird_name?: string
          cage_number?: number | null
          status?: ParticipantStatus
        }
        Relationships: []
      }
      scores: {
        Row: {
          id: string
          participant_id: string
          tournament_id: string
          count: number
          last_click_at: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          tournament_id: string
          count?: number
          last_click_at?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          tournament_id?: string
          count?: number
          last_click_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

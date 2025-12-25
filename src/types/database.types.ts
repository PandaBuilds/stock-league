export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string | null
                    avatar_url: string | null
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    username?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    username?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                }
            }
            leagues: {
                Row: {
                    id: string
                    created_at: string
                    name: string
                    admin_id: string
                    start_date: string | null
                    end_date: string | null
                    budget: number
                    is_active: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    name: string
                    admin_id: string
                    start_date?: string | null
                    end_date?: string | null
                    budget?: number
                    is_active?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    name?: string
                    admin_id?: string
                    start_date?: string | null
                    end_date?: string | null
                    budget?: number
                    is_active?: boolean
                }
            }
        }
    }
}

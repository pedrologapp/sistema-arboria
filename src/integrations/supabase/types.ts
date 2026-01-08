export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aluno_turma: {
        Row: {
          aluno_id: string
          ano_letivo: number
          ativo: boolean | null
          created_at: string | null
          data_entrada: string | null
          data_saida: string | null
          id: string
          motivo_saida: string | null
          numero_chamada: number | null
          turma_id: string
        }
        Insert: {
          aluno_id: string
          ano_letivo: number
          ativo?: boolean | null
          created_at?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          id?: string
          motivo_saida?: string | null
          numero_chamada?: number | null
          turma_id: string
        }
        Update: {
          aluno_id?: string
          ano_letivo?: number
          ativo?: boolean | null
          created_at?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          id?: string
          motivo_saida?: string | null
          numero_chamada?: number | null
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_turma_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_turma_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_arquivos: {
        Row: {
          created_at: string | null
          entrega_id: string
          id: string
          nome_original: string
          nome_storage: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          entrega_id: string
          id?: string
          nome_original: string
          nome_storage: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          entrega_id?: string
          id?: string
          nome_original?: string
          nome_storage?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_arquivos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          aluno_id: string
          avaliado_por: string | null
          created_at: string | null
          data_avaliacao: string | null
          data_entrega: string | null
          entregue_no_prazo: boolean | null
          feedback_professor: string | null
          id: string
          missao_id: string
          nota: number | null
          numero_tentativa: number | null
          pontos_concedidos: number | null
          status: string | null
          texto_resposta: string | null
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          avaliado_por?: string | null
          created_at?: string | null
          data_avaliacao?: string | null
          data_entrega?: string | null
          entregue_no_prazo?: boolean | null
          feedback_professor?: string | null
          id?: string
          missao_id: string
          nota?: number | null
          numero_tentativa?: number | null
          pontos_concedidos?: number | null
          status?: string | null
          texto_resposta?: string | null
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          avaliado_por?: string | null
          created_at?: string | null
          data_avaliacao?: string | null
          data_entrega?: string | null
          entregue_no_prazo?: boolean | null
          feedback_professor?: string | null
          id?: string
          missao_id?: string
          nota?: number | null
          numero_tentativa?: number | null
          pontos_concedidos?: number | null
          status?: string | null
          texto_resposta?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_avaliado_por_fkey"
            columns: ["avaliado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fases: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          id: string
          institution_id: string
          inteligencia_id: number
          numero_fase: number
          semana_atual: number | null
          updated_at: string | null
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          institution_id: string
          inteligencia_id: number
          numero_fase: number
          semana_atual?: number | null
          updated_at?: string | null
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          institution_id?: string
          inteligencia_id?: number
          numero_fase?: number
          semana_atual?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fases_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fases_inteligencia_id_fkey"
            columns: ["inteligencia_id"]
            isOneToOne: false
            referencedRelation: "inteligencias"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          ano_letivo_atual: number | null
          cor_acento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          data_fim_letivo: string | null
          data_inicio_letivo: string | null
          duracao_fase_semanas: number | null
          email_contato: string | null
          endereco: string | null
          favicon_url: string | null
          id: string
          institution_id: string
          logo_url: string | null
          slug: string | null
          telefone: string | null
          updated_at: string | null
          usa_sistema_casas: boolean | null
          website: string | null
        }
        Insert: {
          ano_letivo_atual?: number | null
          cor_acento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          data_fim_letivo?: string | null
          data_inicio_letivo?: string | null
          duracao_fase_semanas?: number | null
          email_contato?: string | null
          endereco?: string | null
          favicon_url?: string | null
          id?: string
          institution_id: string
          logo_url?: string | null
          slug?: string | null
          telefone?: string | null
          updated_at?: string | null
          usa_sistema_casas?: boolean | null
          website?: string | null
        }
        Update: {
          ano_letivo_atual?: number | null
          cor_acento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          data_fim_letivo?: string | null
          data_inicio_letivo?: string | null
          duracao_fase_semanas?: number | null
          email_contato?: string | null
          endereco?: string | null
          favicon_url?: string | null
          id?: string
          institution_id?: string
          logo_url?: string | null
          slug?: string | null
          telefone?: string | null
          updated_at?: string | null
          usa_sistema_casas?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      inteligencias: {
        Row: {
          codigo: string
          cor_hex: string | null
          descricao: string | null
          emoji: string | null
          id: number
          nome: string
          ordem: number | null
        }
        Insert: {
          codigo: string
          cor_hex?: string | null
          descricao?: string | null
          emoji?: string | null
          id: number
          nome: string
          ordem?: number | null
        }
        Update: {
          codigo?: string
          cor_hex?: string | null
          descricao?: string | null
          emoji?: string | null
          id?: number
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      missao_destinatarios: {
        Row: {
          aluno_id: string
          created_at: string | null
          id: string
          missao_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          id?: string
          missao_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          id?: string
          missao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missao_destinatarios_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missao_destinatarios_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes: {
        Row: {
          casa_id: number | null
          criado_por: string
          data_criacao: string | null
          data_liberacao: string
          data_prazo: string
          descricao: string | null
          fase_id: string | null
          id: string
          institution_id: string
          instrucoes: string | null
          para_todos_da_casa: boolean | null
          permite_entrega_atrasada: boolean | null
          pontos_base: number
          requer_arquivo: boolean | null
          requer_texto: boolean | null
          serie_filtro: number | null
          status: string | null
          tipo: string
          titulo: string
          turma_filtro: string | null
          updated_at: string | null
        }
        Insert: {
          casa_id?: number | null
          criado_por: string
          data_criacao?: string | null
          data_liberacao: string
          data_prazo: string
          descricao?: string | null
          fase_id?: string | null
          id?: string
          institution_id: string
          instrucoes?: string | null
          para_todos_da_casa?: boolean | null
          permite_entrega_atrasada?: boolean | null
          pontos_base?: number
          requer_arquivo?: boolean | null
          requer_texto?: boolean | null
          serie_filtro?: number | null
          status?: string | null
          tipo?: string
          titulo: string
          turma_filtro?: string | null
          updated_at?: string | null
        }
        Update: {
          casa_id?: number | null
          criado_por?: string
          data_criacao?: string | null
          data_liberacao?: string
          data_prazo?: string
          descricao?: string | null
          fase_id?: string | null
          id?: string
          institution_id?: string
          instrucoes?: string | null
          para_todos_da_casa?: boolean | null
          permite_entrega_atrasada?: boolean | null
          pontos_base?: number
          requer_arquivo?: boolean | null
          requer_texto?: boolean | null
          serie_filtro?: number | null
          status?: string | null
          tipo?: string
          titulo?: string
          turma_filtro?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missoes_casa_id_fkey"
            columns: ["casa_id"]
            isOneToOne: false
            referencedRelation: "inteligencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      observacoes: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_observacao: string
          fase_id: string
          foi_cross_im: boolean | null
          id: string
          institution_id: string
          inteligencia_expressa: number
          inteligencia_fase: number
          intensidade: string | null
          observacao_texto: string | null
          professor_id: string
          sinal_id: number
          turma_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_observacao?: string
          fase_id: string
          foi_cross_im?: boolean | null
          id?: string
          institution_id: string
          inteligencia_expressa: number
          inteligencia_fase: number
          intensidade?: string | null
          observacao_texto?: string | null
          professor_id: string
          sinal_id: number
          turma_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_observacao?: string
          fase_id?: string
          foi_cross_im?: boolean | null
          id?: string
          institution_id?: string
          inteligencia_expressa?: number
          inteligencia_fase?: number
          intensidade?: string | null
          observacao_texto?: string | null
          professor_id?: string
          sinal_id?: number
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_inteligencia_expressa_fkey"
            columns: ["inteligencia_expressa"]
            isOneToOne: false
            referencedRelation: "inteligencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_inteligencia_fase_fkey"
            columns: ["inteligencia_fase"]
            isOneToOne: false
            referencedRelation: "inteligencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_sinal_id_fkey"
            columns: ["sinal_id"]
            isOneToOne: false
            referencedRelation: "sinais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_casa: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          casa_id: number
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          eh_mentor_principal: boolean | null
          id: string
          institution_id: string
          professor_id: string
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean | null
          casa_id: number
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          eh_mentor_principal?: boolean | null
          id?: string
          institution_id: string
          professor_id: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean | null
          casa_id?: number
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          eh_mentor_principal?: boolean | null
          id?: string
          institution_id?: string
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_casa_casa_id_fkey"
            columns: ["casa_id"]
            isOneToOne: false
            referencedRelation: "inteligencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_casa_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_casa_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          casa: string | null
          casa_id: number | null
          created_at: string
          full_name: string | null
          id: string
          institution: string | null
          institution_id: string | null
          must_change_password: boolean | null
          nome: string | null
          serie: string | null
          sobrenome: string | null
          turma: string | null
          updated_at: string
        }
        Insert: {
          casa?: string | null
          casa_id?: number | null
          created_at?: string
          full_name?: string | null
          id: string
          institution?: string | null
          institution_id?: string | null
          must_change_password?: boolean | null
          nome?: string | null
          serie?: string | null
          sobrenome?: string | null
          turma?: string | null
          updated_at?: string
        }
        Update: {
          casa?: string | null
          casa_id?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          institution?: string | null
          institution_id?: string | null
          must_change_password?: boolean | null
          nome?: string | null
          serie?: string | null
          sobrenome?: string | null
          turma?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_casa_id_fkey"
            columns: ["casa_id"]
            isOneToOne: false
            referencedRelation: "inteligencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      sinais: {
        Row: {
          codigo: string
          descricao: string | null
          emoji: string
          id: number
          label_pt: string
          ordem: number | null
          peso_inteligencia: number | null
          pilar: string
          valencia: string
        }
        Insert: {
          codigo: string
          descricao?: string | null
          emoji: string
          id: number
          label_pt: string
          ordem?: number | null
          peso_inteligencia?: number | null
          pilar: string
          valencia: string
        }
        Update: {
          codigo?: string
          descricao?: string | null
          emoji?: string
          id?: number
          label_pt?: string
          ordem?: number | null
          peso_inteligencia?: number | null
          pilar?: string
          valencia?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          capacidade: number | null
          created_at: string | null
          id: string
          institution_id: string
          nome: string
          sala: string | null
          serie: number
          turma_letra: string
          turno: string | null
          updated_at: string | null
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean | null
          capacidade?: number | null
          created_at?: string | null
          id?: string
          institution_id: string
          nome: string
          sala?: string | null
          serie: number
          turma_letra: string
          turno?: string | null
          updated_at?: string | null
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean | null
          capacidade?: number | null
          created_at?: string | null
          id?: string
          institution_id?: string
          nome?: string
          sala?: string | null
          serie?: number
          turma_letra?: string
          turno?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_turma_exists: {
        Args: {
          p_ano_letivo: number
          p_institution_id: string
          p_serie: string
          p_turma_letra: string
        }
        Returns: string
      }
      get_alunos_minha_casa: {
        Args: { p_serie?: number; p_turma_letra?: string }
        Returns: {
          aluno_id: string
          casa_id: number
          casa_nome: string
          full_name: string
          nome: string
          serie: string
          sobrenome: string
          turma: string
        }[]
      }
      get_user_institution_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "professor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "professor"],
    },
  },
} as const

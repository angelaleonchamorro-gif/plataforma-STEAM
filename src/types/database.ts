export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      instituciones: {
        Row: {
          id: string;
          nombre: string;
          codigo_amie: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          codigo_amie?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          codigo_amie?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      perfiles: {
        Row: {
          id: string;
          institucion_id: string | null;
          rol: Database["public"]["Enums"]["rol_usuario"];
          nombres: string;
          apellidos: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          institucion_id?: string | null;
          rol?: Database["public"]["Enums"]["rol_usuario"];
          nombres: string;
          apellidos: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          institucion_id?: string | null;
          rol?: Database["public"]["Enums"]["rol_usuario"];
          nombres?: string;
          apellidos?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      configuracion_subniveles: {
        Row: {
          institucion_id: string;
          subnivel: string;
          frecuencia_proyectos: string;
          duracion_meses: number;
          actualizado_por: string | null;
          updated_at: string;
        };
        Insert: {
          institucion_id: string;
          subnivel: string;
          frecuencia_proyectos?: string;
          duracion_meses?: number;
          actualizado_por?: string | null;
          updated_at?: string;
        };
        Update: {
          institucion_id?: string;
          subnivel?: string;
          frecuencia_proyectos?: string;
          duracion_meses?: number;
          actualizado_por?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      asignaturas: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          es_principal: boolean;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          es_principal?: boolean;
        };
        Update: {
          id?: string;
          codigo?: string;
          nombre?: string;
          es_principal?: boolean;
        };
        Relationships: [];
      };
      institucion_asignaturas: {
        Row: {
          institucion_id: string;
          asignatura_id: string;
        };
        Insert: {
          institucion_id: string;
          asignatura_id: string;
        };
        Update: {
          institucion_id?: string;
          asignatura_id?: string;
        };
        Relationships: [];
      };
      dcd: {
        Row: {
          id: string;
          asignatura_id: string;
          codigo: string;
          descripcion: string;
          subnivel: string;
          grado: string | null;
          indicador: string | null;
        };
        Insert: {
          id?: string;
          asignatura_id: string;
          codigo: string;
          descripcion: string;
          subnivel: string;
          grado?: string | null;
          indicador?: string | null;
        };
        Update: {
          id?: string;
          asignatura_id?: string;
          codigo?: string;
          descripcion?: string;
          subnivel?: string;
          grado?: string | null;
          indicador?: string | null;
        };
        Relationships: [];
      };
      proyecto_habilidades: {
        Row: {
          id: string;
          proyecto_id: string;
          componente: string;
          descripcion: string;
          indicador: string | null;
          orden: number;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          componente: string;
          descripcion: string;
          indicador?: string | null;
          orden?: number;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          componente?: string;
          descripcion?: string;
          indicador?: string | null;
          orden?: number;
        };
        Relationships: [];
      };
      clases: {
        Row: {
          id: string;
          institucion_id: string;
          docente_id: string;
          nombre: string;
          grado: string;
          edad_referencial: number;
          codigo_invitacion: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institucion_id: string;
          docente_id: string;
          nombre: string;
          grado: string;
          edad_referencial: number;
          codigo_invitacion?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          institucion_id?: string;
          docente_id?: string;
          nombre?: string;
          grado?: string;
          edad_referencial?: number;
          codigo_invitacion?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clase_estudiantes: {
        Row: {
          clase_id: string;
          estudiante_id: string;
          created_at: string;
        };
        Insert: {
          clase_id: string;
          estudiante_id: string;
          created_at?: string;
        };
        Update: {
          clase_id?: string;
          estudiante_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      proyectos: {
        Row: {
          id: string;
          clase_id: string;
          estado: Database["public"]["Enums"]["estado_proyecto"];
          titulo: string | null;
          reto: string | null;
          duracion_semanas: number;
          fecha_inicio: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clase_id: string;
          estado?: Database["public"]["Enums"]["estado_proyecto"];
          titulo?: string | null;
          reto?: string | null;
          duracion_semanas?: number;
          fecha_inicio?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clase_id?: string;
          estado?: Database["public"]["Enums"]["estado_proyecto"];
          titulo?: string | null;
          reto?: string | null;
          duracion_semanas?: number;
          fecha_inicio?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      proyecto_dcd: {
        Row: {
          proyecto_id: string;
          dcd_id: string;
          es_conexion: boolean;
        };
        Insert: {
          proyecto_id: string;
          dcd_id: string;
          es_conexion?: boolean;
        };
        Update: {
          proyecto_id?: string;
          dcd_id?: string;
          es_conexion?: boolean;
        };
        Relationships: [];
      };
      planificacion_semanas: {
        Row: {
          id: string;
          proyecto_id: string;
          numero_semana: number;
          fase: Database["public"]["Enums"]["fase_proyecto"];
          objetivo: string;
          descripcion: string | null;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          numero_semana: number;
          fase: Database["public"]["Enums"]["fase_proyecto"];
          objetivo: string;
          descripcion?: string | null;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          numero_semana?: number;
          fase?: Database["public"]["Enums"]["fase_proyecto"];
          objetivo?: string;
          descripcion?: string | null;
        };
        Relationships: [];
      };
      actividades: {
        Row: {
          id: string;
          proyecto_id: string;
          semana_id: string | null;
          fase: Database["public"]["Enums"]["fase_proyecto"];
          dcd_id: string | null;
          asignatura_id: string | null;
          titulo: string;
          instrucciones: string;
          criterio_evaluacion: string | null;
          recursos: string | null;
          evidencia: string | null;
          orden: number;
          generada_por_ia: boolean;
          publicada: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          semana_id?: string | null;
          fase: Database["public"]["Enums"]["fase_proyecto"];
          dcd_id?: string | null;
          asignatura_id?: string | null;
          titulo: string;
          instrucciones: string;
          criterio_evaluacion?: string | null;
          recursos?: string | null;
          evidencia?: string | null;
          orden?: number;
          generada_por_ia?: boolean;
          publicada?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          semana_id?: string | null;
          fase?: Database["public"]["Enums"]["fase_proyecto"];
          dcd_id?: string | null;
          asignatura_id?: string | null;
          titulo?: string;
          instrucciones?: string;
          criterio_evaluacion?: string | null;
          recursos?: string | null;
          evidencia?: string | null;
          orden?: number;
          generada_por_ia?: boolean;
          publicada?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      entregas: {
        Row: {
          id: string;
          actividad_id: string;
          estudiante_id: string;
          estado: Database["public"]["Enums"]["estado_entrega"];
          contenido: string | null;
          evidencia_url: string | null;
          entregada_at: string | null;
          retroalimentacion: string | null;
          calificacion: number | null;
          revisada_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          actividad_id: string;
          estudiante_id: string;
          estado?: Database["public"]["Enums"]["estado_entrega"];
          contenido?: string | null;
          evidencia_url?: string | null;
          entregada_at?: string | null;
          retroalimentacion?: string | null;
          calificacion?: number | null;
          revisada_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          actividad_id?: string;
          estudiante_id?: string;
          estado?: Database["public"]["Enums"]["estado_entrega"];
          contenido?: string | null;
          evidencia_url?: string | null;
          entregada_at?: string | null;
          retroalimentacion?: string | null;
          calificacion?: number | null;
          revisada_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      eventos_actividad: {
        Row: {
          id: number;
          actividad_id: string;
          estudiante_id: string | null;
          tipo_evento: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          actividad_id: string;
          estudiante_id?: string | null;
          tipo_evento: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          actividad_id?: string;
          estudiante_id?: string | null;
          tipo_evento?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      amie_catalogo: {
        Row: {
          codigo: string;
          nombre: string;
          provincia: string | null;
          canton: string | null;
          sostenimiento: string | null;
          nivel_educacion: string | null;
        };
        Insert: {
          codigo: string;
          nombre: string;
          provincia?: string | null;
          canton?: string | null;
          sostenimiento?: string | null;
          nivel_educacion?: string | null;
        };
        Update: {
          codigo?: string;
          nombre?: string;
          provincia?: string | null;
          canton?: string | null;
          sostenimiento?: string | null;
          nivel_educacion?: string | null;
        };
        Relationships: [];
      };
      articulos_cientificos: {
        Row: {
          id: string;
          proyecto_id: string;
          estudiante_id: string;
          secciones: Json;
          estado: Database["public"]["Enums"]["estado_entrega"];
          entregado_at: string | null;
          retroalimentacion: string | null;
          calificacion: number | null;
          revisado_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          estudiante_id: string;
          secciones?: Json;
          estado?: Database["public"]["Enums"]["estado_entrega"];
          entregado_at?: string | null;
          retroalimentacion?: string | null;
          calificacion?: number | null;
          revisado_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          estudiante_id?: string;
          secciones?: Json;
          estado?: Database["public"]["Enums"]["estado_entrega"];
          entregado_at?: string | null;
          retroalimentacion?: string | null;
          calificacion?: number | null;
          revisado_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      generaciones_ia: {
        Row: {
          id: string;
          proyecto_id: string;
          tipo: Database["public"]["Enums"]["tipo_generacion_ia"];
          modelo: string;
          respuesta: Json | null;
          estado: Database["public"]["Enums"]["estado_generacion_ia"];
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          tipo: Database["public"]["Enums"]["tipo_generacion_ia"];
          modelo: string;
          respuesta?: Json | null;
          estado: Database["public"]["Enums"]["estado_generacion_ia"];
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          tipo?: Database["public"]["Enums"]["tipo_generacion_ia"];
          modelo?: string;
          respuesta?: Json | null;
          estado?: Database["public"]["Enums"]["estado_generacion_ia"];
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fn_mi_rol: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["rol_usuario"];
      };
      fn_mi_institucion: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      fn_es_docente_de_proyecto: {
        Args: { p_proyecto: string };
        Returns: boolean;
      };
      fn_es_estudiante_de_proyecto: {
        Args: { p_proyecto: string };
        Returns: boolean;
      };
    };
    Enums: {
      rol_usuario: "directivo" | "docente" | "estudiante";
      fase_proyecto:
        | "socializacion"
        | "indagacion"
        | "diseno_plan_accion"
        | "prototipado"
        | "pruebas_rediseno"
        | "divulgacion";
      estado_proyecto: "definicion" | "planificacion" | "en_ejecucion" | "finalizado";
      estado_entrega: "pendiente" | "en_progreso" | "entregada" | "revisada";
      tipo_generacion_ia: "temas" | "planificacion" | "actividades";
      estado_generacion_ia: "ok" | "error";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type Perfil = Tables<"perfiles">;
export type Clase = Tables<"clases">;
export type Proyecto = Tables<"proyectos">;
export type Actividad = Tables<"actividades">;
export type Entrega = Tables<"entregas">;
export type Dcd = Tables<"dcd">;
export type FaseProyecto = Enums<"fase_proyecto">;

export const FASES_PROYECTO: { valor: FaseProyecto; nombre: string; descripcion: string }[] = [
  {
    valor: "socializacion",
    nombre: "Socialización",
    descripcion: "Situación que plantea el reto y preguntas de reflexión para generar desequilibrio cognitivo",
  },
  {
    valor: "indagacion",
    nombre: "Indagación",
    descripcion: "Desarrollo de las destrezas con criterios de desempeño y actividades de evaluación",
  },
  {
    valor: "diseno_plan_accion",
    nombre: "Diseño y plan de acción",
    descripcion: "Diseño del prototipo, materiales y proceso de construcción",
  },
  {
    valor: "prototipado",
    nombre: "Prototipado",
    descripcion: "Construcción del prototipo",
  },
  {
    valor: "pruebas_rediseno",
    nombre: "Pruebas y rediseño",
    descripcion: "Cuantificar el desempeño del prototipo y mejorarlo si no cumple el reto",
  },
  {
    valor: "divulgacion",
    nombre: "Divulgación",
    descripcion: "Artículo científico (BGU) o exposición, carteles y videos (grados menores)",
  },
];

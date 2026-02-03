export interface KPIData {
  tasaAprobacion: number;
  tiempoOnboarding: number;
  indiceCarteraSinErrores: number;
  efectividadRecaudo: number;
  fechaGeneracion: Date;
  periodo: {
    inicio: Date;
    fin: Date;
  };
  financialEntity?: string; // Nombre de la entidad financiera (opcional para reporte general)
}

export interface FinancialEntityStats {
  financialEntityId: string;
  nombre: string;
  totalLeads: number;
  totalUsers: number;
  tasaAprobacion: number;
}

export interface KPIDataByEntity {
  [entityName: string]: KPIData;
}

export interface KPISummary {
  totalLeads: number;
  totalUsers: number;
  totalSolicitudes: number;
  totalLoans: number;
  erroresCartera: number;
  formulas: {
    tasaAprobacion: string;
    indiceCarteraSinErrores: string;
    tiempoOnboarding: string;
  };
}

export interface KPIGenerationResult {
  success: boolean;
  data?: KPIData;
  summary?: KPISummary;
  error?: string;
  pdfBuffer?: Buffer;
  fileName?: string;
  filePath?: string;
}

export interface FintechEmailConfig {
  fintechName: string;
  emails: string[];
  frequency: 'weekly' | 'monthly';
}

export interface KPIGenerationResultByEntity {
  success: boolean;
  results?: { [entityName: string]: KPIGenerationResult };
  error?: string;
}


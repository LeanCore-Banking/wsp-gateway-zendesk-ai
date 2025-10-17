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

export interface KPIGenerationResult {
  success: boolean;
  data?: KPIData;
  error?: string;
  pdfBuffer?: Buffer;
  fileName?: string;
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


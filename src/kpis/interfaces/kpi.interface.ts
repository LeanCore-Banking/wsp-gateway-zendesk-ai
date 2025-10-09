export interface KPIData {
  tasaAprobacion: number;
  tiempoOnboarding: number;
  tiempoPromedioDesembolso: number;
  indiceCarteraSinErrores: number;
  efectividadRecaudo: number;
  fechaGeneracion: Date;
  periodo: {
    inicio: Date;
    fin: Date;
  };
}

export interface FinancialEntityStats {
  financialEntityId: string;
  nombre: string;
  totalLeads: number;
  totalUsers: number;
  tasaAprobacion: number;
}

export interface KPIGenerationResult {
  success: boolean;
  data?: KPIData;
  error?: string;
  pdfBuffer?: Buffer;
  fileName?: string;
}


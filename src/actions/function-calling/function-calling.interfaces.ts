export interface FunctionParameter {
  type: string;
  description: string;
  format?: string;
  enum?: string[];
}

export interface FunctionParameters {
  type: string;
  properties: Record<string, FunctionParameter>;
  required: string[];
}

export interface FunctionArguments {
  [key: string]: string | number | boolean | null | undefined;
}

export interface FunctionExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AIFunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameters;
}

export interface TestEndpointRequest {
  [key: string]: unknown;
}

export interface TestEndpointResponse {
  status: string;
  received: TestEndpointRequest;
}

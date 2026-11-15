import client from './services/negotiation.client'

// Extend these types and endpoints as the calculum-ai service grows
export interface CalculumRequest {
  input: string
  [key: string]: unknown
}

export interface CalculumResponse {
  result: unknown
  [key: string]: unknown
}

export const calculumApi = {
  process: (payload: CalculumRequest) =>
    client.post<CalculumResponse>('/calculum/process', payload),

  getHistory: () =>
    client.get<CalculumResponse[]>('/calculum/history'),
}

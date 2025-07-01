export interface APIError {
  detail?: string | ValidationError[]
  message?: string
  retry_after?: number
}

export interface ValidationError {
  loc: string[]
  msg: string
  type: string
}
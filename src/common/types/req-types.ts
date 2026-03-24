export type RequestTokenPayload = {
  sub: string;
  name: string;
}

export type AuthenticatedRequest = {
  user: RequestTokenPayload;
}
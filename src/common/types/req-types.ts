export type RequestTokenPayload = {
  sub: string;
  email: string;
  name: string;
}

export type AuthenticatedRequest = {
  user: RequestTokenPayload;
}
import { ClientContext, type Result } from "./context.js";

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  user_metadata: Record<string, unknown>;
}

export class AuthClient {
  private session: Session | null = null;

  constructor(private ctx: ClientContext) {}

  private base(): string {
    return `${this.ctx.apiUrl}/auth/v1`;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.base()}${path}`, {
      method: "POST",
      headers: this.ctx.headers({ "content-type": "application/json" }),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
    return json;
  }

  private apply(session: Session | null): void {
    this.session = session;
    this.ctx.accessToken = session?.access_token ?? null;
  }

  getSession(): Session | null {
    return this.session;
  }

  async signUp(creds: { email: string; password: string; data?: Record<string, unknown> }): Promise<
    Result<{ user: AuthUser; session: Session | null }>
  > {
    try {
      const r = (await this.post("/signup", creds)) as {
        user: AuthUser;
        session: Session | null;
      };
      if (r.session) this.apply(r.session);
      return { data: r, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  async signInWithPassword(creds: { email: string; password: string }): Promise<Result<Session>> {
    try {
      const s = (await this.post("/token?grant_type=password", creds)) as Session;
      this.apply(s);
      return { data: s, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  async refreshSession(): Promise<Result<Session>> {
    if (!this.session) return { data: null, error: { message: "Sessiya yo'q" } };
    try {
      const s = (await this.post("/token?grant_type=refresh_token", {
        refresh_token: this.session.refresh_token,
      })) as Session;
      this.apply(s);
      return { data: s, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  async signOut(): Promise<Result<null>> {
    try {
      if (this.session) await this.post("/logout", {});
    } catch {
      /* jim */
    }
    this.apply(null);
    return { data: null, error: null };
  }

  async getUser(): Promise<Result<AuthUser>> {
    try {
      const res = await fetch(`${this.base()}/user`, { headers: this.ctx.headers() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      return { data: json as AuthUser, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  async resetPasswordForEmail(email: string): Promise<Result<null>> {
    try {
      await this.post("/recover", { email });
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
}

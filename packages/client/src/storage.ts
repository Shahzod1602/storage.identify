import { ClientContext, type Result } from "./context.js";

class BucketApi {
  constructor(
    private ctx: ClientContext,
    private bucket: string,
  ) {}

  private objUrl(path: string): string {
    return `${this.ctx.apiUrl}/storage/v1/object/${this.bucket}/${path}`;
  }

  async upload(
    path: string,
    data: Blob | ArrayBuffer | Uint8Array | string,
    opts?: { contentType?: string },
  ): Promise<Result<{ Key: string }>> {
    try {
      const res = await fetch(this.objUrl(path), {
        method: "POST",
        headers: this.ctx.headers({
          "content-type": opts?.contentType ?? "application/octet-stream",
        }),
        body: data as BodyInit,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      return { data: json, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  async download(path: string): Promise<Result<Blob>> {
    try {
      const res = await fetch(this.objUrl(path), { headers: this.ctx.headers() });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      return { data: await res.blob(), error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  async remove(path: string): Promise<Result<null>> {
    try {
      const res = await fetch(this.objUrl(path), {
        method: "DELETE",
        headers: this.ctx.headers(),
      });
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  /** Ommaviy bucket uchun to'g'ridan-to'g'ri URL. */
  getPublicUrl(path: string): { publicUrl: string } {
    return {
      publicUrl: `${this.ctx.apiUrl}/storage/v1/public/${this.bucket}/${path}`,
    };
  }

  async createSignedUrl(
    path: string,
    expiresIn = 3600,
  ): Promise<Result<{ signedUrl: string }>> {
    try {
      const res = await fetch(
        `${this.ctx.apiUrl}/storage/v1/object/sign/${this.bucket}/${path}`,
        {
          method: "POST",
          headers: this.ctx.headers({ "content-type": "application/json" }),
          body: JSON.stringify({ expiresIn }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      return {
        data: { signedUrl: `${this.ctx.apiUrl.replace(/\/v1\/.*/, "")}${json.signedUrl}` },
        error: null,
      };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
}

export class StorageClient {
  constructor(private ctx: ClientContext) {}

  from(bucket: string): BucketApi {
    return new BucketApi(this.ctx, bucket);
  }

  async createBucket(
    id: string,
    opts?: { public?: boolean },
  ): Promise<Result<{ id: string }>> {
    try {
      const res = await fetch(`${this.ctx.apiUrl}/storage/v1/bucket`, {
        method: "POST",
        headers: this.ctx.headers({ "content-type": "application/json" }),
        body: JSON.stringify({ id, public: opts?.public ?? false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      return { data: json, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
}

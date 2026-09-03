import type { Bindings } from '../types';
export class CloudflareClient {
  constructor(private readonly env: Bindings) {}
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.env.CLOUDFLARE_API_TOKEN || !this.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Cloudflare API 尚未配置');
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}${path}`, { ...init, headers: { Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json', ...init?.headers } });
    const body = await response.json<{ success: boolean; result: T; errors?: { message: string }[] }>();
    if (!response.ok || !body.success) throw new Error(body.errors?.[0]?.message ?? 'Cloudflare API 请求失败');
    return body.result;
  }
  workers() { return this.request<Array<{ id: string; created_on?: string; modified_on?: string }>>('/workers/scripts'); }
  pages() { return this.request<Array<{ name: string; subdomain: string; created_on: string; production_branch?: string }>>('/pages/projects'); }
  d1() { return this.request<Array<{ uuid: string; name: string; created_at: string }>>('/d1/database'); }
  kv() { return this.request<Array<{ id: string; title: string }>>('/storage/kv/namespaces'); }
  async deleteWorker(name: string) { return this.request(`/workers/scripts/${encodeURIComponent(name)}`, { method: 'DELETE' }); }
}

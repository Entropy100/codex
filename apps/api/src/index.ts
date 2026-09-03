import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { ApiFailure } from '@entropy/shared';
import { audit } from './services/audit';
import { CloudflareClient } from './services/cloudflare';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();
app.use('/api/*', cors({ origin: (origin, c) => origin === c.env.DASHBOARD_ORIGIN ? origin : c.env.DASHBOARD_ORIGIN, credentials: true }));
app.onError((error, c) => c.json<ApiFailure>({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message === 'Cloudflare API 尚未配置' ? error.message : '服务器处理请求失败' } }, 500));
const ok = <T>(data: T) => ({ success: true as const, data });
const invalid = (message: string) => ({ success: false as const, error: { code: 'INVALID_ARGUMENT', message } });
const client = (env: Bindings) => new CloudflareClient(env);

app.get('/api/health', async c => { const checks = await Promise.allSettled([c.env.DB.prepare('SELECT 1').first(), c.env.KV.get('__health__'), c.env.BUCKET.head('__health__')]); return c.json(ok({ status: 'ok', services: { d1: checks[0].status === 'fulfilled', kv: checks[1].status === 'fulfilled', r2: checks[2].status === 'fulfilled', cloudflare: Boolean(c.env.CLOUDFLARE_API_TOKEN && c.env.CLOUDFLARE_ACCOUNT_ID) })); });
app.get('/api/overview', async c => { const logs = await c.env.DB.prepare('SELECT id, action, resource_type as resourceType, resource_id as resourceId, success, error_message as errorMessage, created_at as createdAt FROM operation_logs ORDER BY id DESC LIMIT 10').all(); const count = await c.env.DB.prepare('SELECT COUNT(*) as count FROM file_objects').first<{ count: number }>(); return c.json(ok({ services: { d1: true, kv: true, r2: true, cloudflare: Boolean(c.env.CLOUDFLARE_API_TOKEN) }, counts: { files: count?.count ?? 0 }, logs: logs.results })); });
app.get('/api/logs', async c => c.json(ok((await c.env.DB.prepare('SELECT id, action, resource_type as resourceType, resource_id as resourceId, success, error_message as errorMessage, created_at as createdAt FROM operation_logs ORDER BY id DESC LIMIT 100').all()).results)));
for (const [route, method] of [['workers', 'workers'], ['pages', 'pages'], ['d1', 'd1'], ['kv', 'kv']] as const) app.get(`/api/${route}`, async c => c.json(ok(await client(c.env)[method]())));
app.delete('/api/workers/:name', async c => { const name = z.string().min(1).safeParse(c.req.param('name')); if (!name.success) return c.json(invalid('Worker 名称无效'), 400); await client(c.env).deleteWorker(name.data); await audit(c.env, 'delete', 'worker', name.data, true); return c.json(ok({ deleted: true })); });
app.get('/api/kv/:namespace/keys', async c => { const prefix = c.req.query('prefix') ?? ''; const list = await c.env.KV.list({ prefix }); return c.json(ok(list)); });
app.get('/api/kv/:namespace/keys/:key', async c => { const value = await c.env.KV.get(c.req.param('key')); return value === null ? c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Key 不存在' } }, 404) : c.json(ok({ value })); });
app.put('/api/kv/:namespace/keys/:key', async c => { const parsed = z.object({ value: z.string().max(25_000_000) }).safeParse(await c.req.json()); if (!parsed.success) return c.json(invalid('Value 必须是字符串'), 400); await c.env.KV.put(c.req.param('key'), parsed.data.value); await audit(c.env, 'update', 'kv_key', c.req.param('key'), true); return c.json(ok({ updated: true })); });
app.delete('/api/kv/:namespace/keys/:key', async c => { await c.env.KV.delete(c.req.param('key')); await audit(c.env, 'delete', 'kv_key', c.req.param('key'), true); return c.json(ok({ deleted: true })); });
app.get('/api/r2/:bucket/objects', async c => c.json(ok(await c.env.BUCKET.list({ prefix: c.req.query('prefix') }))));
app.put('/api/r2/:bucket/objects/:key', async c => { const key = c.req.param('key'); const body = await c.req.arrayBuffer(); if (!body.byteLength) return c.json(invalid('不能上传空文件'), 400); await c.env.BUCKET.put(key, body, { httpMetadata: { contentType: c.req.header('content-type') } }); await c.env.DB.prepare('INSERT OR REPLACE INTO file_objects (object_key, filename, mime_type, size, bucket, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').bind(key, key.split('/').pop(), c.req.header('content-type') ?? null, body.byteLength, c.req.param('bucket')).run(); await audit(c.env, 'upload', 'r2_object', key, true); return c.json(ok({ uploaded: true })); });
app.get('/api/r2/:bucket/objects/:key', async c => { const object = await c.env.BUCKET.get(c.req.param('key')); return object ? new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream', 'Content-Disposition': `attachment; filename="${c.req.param('key').split('/').pop()}"` } }) : c.json({ success: false, error: { code: 'NOT_FOUND', message: '对象不存在' } }, 404); });
app.delete('/api/r2/:bucket/objects/:key', async c => { const key = c.req.param('key'); await c.env.BUCKET.delete(key); await c.env.DB.prepare('DELETE FROM file_objects WHERE object_key = ?').bind(key).run(); await audit(c.env, 'delete', 'r2_object', key, true); return c.json(ok({ deleted: true })); });
export default app;

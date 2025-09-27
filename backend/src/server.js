import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import {
  loadConfig,
  upsertTarget,
  removeTarget,
  setActiveTarget,
  updatePingSettings,
  setPassword
} from './configStore.js';
import { wakeManager } from './services/wakeManager.js';
import { createToken, validateToken } from './tokenStore.js';

dotenv.config();

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true,
  credentials: true
});

const PUBLIC_ROUTES = new Set(['/api/login', '/api/health']);

fastify.addHook('onRequest', async (request, reply) => {
  const url = request.raw.url ?? '';
  if (!url.startsWith('/api/')) {
    return;
  }

  const route = request.routerPath ?? request.routeOptions?.url ?? url;
  if (PUBLIC_ROUTES.has(route)) {
    return;
  }

  const header = request.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) {
    token = request.headers['x-auth-token'];
  }
  if (!token && request.headers.cookie) {
    const match = request.headers.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('lw_token='));
    if (match) {
      token = decodeURIComponent(match.split('=')[1]);
    }
  }
  if (!validateToken(token)) {
    reply.code(401);
    throw new Error('Unauthorized');
  }
});

fastify.get('/api/health', async () => ({ status: 'ok' }));

fastify.post('/api/login', async (request, reply) => {
  const { password } = request.body ?? {};
  const expected = await resolvePassword();
  if (!expected) {
    reply.code(500);
    return { error: 'APP_PASSWORD is not configured on the server' };
  }
  if (!password || password !== expected) {
    reply.code(401);
    return { error: 'Invalid password' };
  }
  const token = createToken();
  reply.header('X-Auth-Token', token);
  return { token };
});

fastify.get('/api/config', async () => {
  const config = await loadConfig();
  return config;
});

fastify.post('/api/config/ping', async (request) => {
  const { intervalMs, timeoutMs } = request.body ?? {};
  const updated = await updatePingSettings({ intervalMs, timeoutMs });
  return updated;
});

fastify.post('/api/targets', async (request, reply) => {
  try {
    const { config, target } = await upsertTarget(request.body ?? {});
    if (!config.activeTargetId) {
      const updated = await setActiveTarget(target.id);
      return { config: updated, target };
    }
    return { config, target };
  } catch (error) {
    reply.code(400);
    return { error: error.message };
  }
});

fastify.delete('/api/targets/:id', async (request, reply) => {
  try {
    const config = await removeTarget(request.params.id);
    return config;
  } catch (error) {
    reply.code(400);
    return { error: error.message };
  }
});

fastify.post('/api/targets/select', async (request, reply) => {
  const { id } = request.body ?? {};
  if (!id) {
    reply.code(400);
    return { error: 'id is required' };
  }
  try {
    const config = await setActiveTarget(id);
    return config;
  } catch (error) {
    reply.code(400);
    return { error: error.message };
  }
});

fastify.post('/api/wake', async (request, reply) => {
  const { targetId, mac, ip, interface: iface } = request.body ?? {};
  try {
    const job = await wakeManager.enqueueWake({ targetId, mac, ip, interface: iface });
    return job;
  } catch (error) {
    reply.code(400);
    return { error: error.message };
  }
});

fastify.get('/api/status/:jobId', async (request, reply) => {
  const job = wakeManager.getJob(request.params.jobId);
  if (!job) {
    reply.code(404);
    return { error: 'Job not found' };
  }
  return job;
});

const port = Number(process.env.PORT ?? 8086);
const host = process.env.BIND_ADDRESS ?? '0.0.0.0';
const serveStaticAssets = (process.env.SERVE_STATIC ?? 'true') !== 'false';
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, '../../frontend/dist');

const start = async () => {
  try {
    if (serveStaticAssets) {
      try {
        await access(distPath);
        await fastify.register(fastifyStatic, {
          root: distPath,
          wildcard: false
        });

        fastify.setNotFoundHandler((request, reply) => {
          if (request.method === 'GET' && !request.url.startsWith('/api/')) {
            reply.type('text/html');
            return reply.sendFile('index.html');
          }
          reply.status(404).send({ error: 'Not Found' });
        });
        fastify.log.info(`Serving static frontend from ${distPath}`);
      } catch (error) {
        fastify.log.warn(`Static assets unavailable at ${distPath}: ${error.message}`);
      }
    }
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

async function resolvePassword() {
  const direct = process.env.APP_PASSWORD;
  if (direct) {
    return direct;
  }
  const config = await loadConfig();
  return config?.password ?? '';
}

start();

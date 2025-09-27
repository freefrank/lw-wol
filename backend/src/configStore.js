import { readFile, writeFile, access, constants } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const DEFAULT_CONFIG = {
  password: '',
  targets: [],
  activeTargetId: null,
  ping: {
    intervalMs: 1000,
    timeoutMs: 60000
  }
};

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const configPath = resolve(dataDir, 'config.json');
let inMemoryConfig;

const clone = (value) => JSON.parse(JSON.stringify(value));

async function ensureConfigFile() {
  try {
    await access(configPath, constants.F_OK);
  } catch {
    await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    inMemoryConfig = clone(DEFAULT_CONFIG);
  }
}

export async function loadConfig() {
  if (inMemoryConfig) {
    return inMemoryConfig;
  }
  await ensureConfigFile();
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    inMemoryConfig = migrateConfig(parsed);
    await saveConfig(inMemoryConfig);
  } catch (error) {
    console.warn('[config] Failed to read config, recreating default:', error);
    inMemoryConfig = clone(DEFAULT_CONFIG);
    await saveConfig(inMemoryConfig);
  }
  return inMemoryConfig;
}

export async function saveConfig(config) {
  inMemoryConfig = migrateConfig(config);
  await writeFile(configPath, JSON.stringify(inMemoryConfig, null, 2), 'utf8');
  return inMemoryConfig;
}

export async function upsertTarget(targetInput) {
  const current = await loadConfig();
  const targets = [...current.targets];
  const normalizedInput = targetInput ?? {};
  const targetId = normalizedInput.id ?? null;

  if (!targetId && !normalizedInput.mac) {
    throw new Error('MAC address is required when creating a target');
  }

  let target;
  if (targetId) {
    const index = targets.findIndex((item) => item.id === targetId);
    if (index === -1) {
      throw new Error(`Target ${targetId} not found`);
    }
    target = normalizeTarget({ ...targets[index], ...normalizedInput });
    targets[index] = target;
  } else {
    target = normalizeTarget(normalizedInput);
    targets.push(target);
  }

  const next = {
    ...current,
    targets,
    activeTargetId: current.activeTargetId ?? target.id
  };

  const savedConfig = await saveConfig(next);
  return {
    config: savedConfig,
    target
  };
}

export async function patchTarget(targetId, partial) {
  if (!targetId) {
    throw new Error('Target id is required to patch target');
  }
  const current = await loadConfig();
  const index = current.targets.findIndex((item) => item.id === targetId);
  if (index === -1) {
    throw new Error(`Target ${targetId} not found`);
  }
  const target = normalizeTarget({ ...current.targets[index], ...partial });
  const next = {
    ...current,
    targets: current.targets.map((item, idx) => (idx === index ? target : item))
  };
  const savedConfig = await saveConfig(next);
  return {
    config: savedConfig,
    target
  };
}

export async function removeTarget(targetId) {
  const current = await loadConfig();
  const remaining = current.targets.filter((item) => item.id !== targetId);
  const next = {
    ...current,
    targets: remaining,
    activeTargetId:
      current.activeTargetId === targetId ? remaining[0]?.id ?? null : current.activeTargetId
  };
  return saveConfig(next);
}

export async function setActiveTarget(targetId) {
  const current = await loadConfig();
  if (targetId && !current.targets.some((item) => item.id === targetId)) {
    throw new Error(`Target ${targetId} not found`);
  }
  const next = {
    ...current,
    activeTargetId: targetId ?? null
  };
  return saveConfig(next);
}

export async function updatePingSettings(partialPing) {
  const current = await loadConfig();
  const next = {
    ...current,
    ping: {
      ...current.ping,
      ...partialPing
    }
  };
  return saveConfig(next);
}

export async function setPassword(plain) {
  const current = await loadConfig();
  const next = {
    ...current,
    password: plain ?? ''
  };
  return saveConfig(next);
}

export async function getTargetById(targetId) {
  if (!targetId) return null;
  const config = await loadConfig();
  return config.targets.find((item) => item.id === targetId) ?? null;
}

export function resetCache() {
  inMemoryConfig = undefined;
}

function migrateConfig(rawConfig = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...(rawConfig ?? {})
  };

  let targets = Array.isArray(config.targets) ? config.targets.map((item) => normalizeTarget(item)) : [];

  if ((!targets || targets.length === 0) && rawConfig?.target) {
    const migrated = normalizeTarget(rawConfig.target);
    targets = [migrated];
    config.activeTargetId = migrated.id;
    delete config.target;
  }

  const hydratedTargets = targets.map((item) => normalizeTarget(item));

  const activeTargetId = hydratedTargets.some((item) => item.id === config.activeTargetId)
    ? config.activeTargetId
    : hydratedTargets[0]?.id ?? null;

  return {
    password: config.password ?? DEFAULT_CONFIG.password,
    targets: hydratedTargets,
    activeTargetId,
    ping: {
      ...DEFAULT_CONFIG.ping,
      ...(config.ping ?? {})
    }
  };
}

function normalizeTarget(targetInput = {}) {
  const baseId = targetInput.id ?? randomUUID();
  return {
    id: baseId,
    name: targetInput.name ?? '',
    mac: targetInput.mac ?? '',
    ip: targetInput.ip ?? '',
    interface: targetInput.interface ?? '',
    lastWakeAt: targetInput.lastWakeAt ?? null,
    lastStatus: targetInput.lastStatus ?? 'unknown'
  };
}

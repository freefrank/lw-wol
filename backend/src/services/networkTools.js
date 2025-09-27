import { promisify } from 'node:util';
import { exec as execCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import wol from 'wake_on_lan';
import ping from 'ping';

const exec = promisify(execCallback);
const wakeAsync = promisify(wol.wake);

const MAC_REGEX = /([0-9a-fA-F]{2}([-:])){5}[0-9a-fA-F]{2}/;

function normalizeMac(mac) {
  return mac?.trim().toUpperCase().replace(/-/g, ':') ?? '';
}

export async function sendMagicPackets(mac, attempts = 3, intervalMs = 500) {
  const formattedMac = normalizeMac(mac);
  if (!MAC_REGEX.test(formattedMac)) {
    throw new Error('Invalid MAC address format');
  }

  for (let i = 0; i < attempts; i += 1) {
    await wakeAsync(formattedMac);
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

export async function pingUntilAlive(ip, { timeoutMs = 60000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    try {
      const res = await ping.promise.probe(ip, { timeout: intervalMs / 1000, min_reply: 1 });
      if (res.alive) {
        return true;
      }
    } catch (error) {
      console.warn('[ping] probe failed:', error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export async function discoverIpByMac(mac, interfaceHint) {
  const formattedMac = normalizeMac(mac);
  if (!MAC_REGEX.test(formattedMac)) {
    return null;
  }

  const commands = [
    interfaceHint ? `ip neigh show dev ${interfaceHint}` : 'ip neigh',
    'ip neigh'
  ];

  for (const command of commands) {
    try {
      const { stdout } = await exec(command);
      const match = parseForMac(stdout, formattedMac);
      if (match) {
        return match;
      }
    } catch (error) {
      console.warn('[discoverIpByMac] command failed', command, error.message);
    }
  }

  try {
    const proc = await readFile('/proc/net/arp', 'utf8');
    const match = parseProcArp(proc, formattedMac);
    if (match) {
      return match;
    }
  } catch (error) {
    console.warn('[discoverIpByMac] failed to read /proc/net/arp', error.message);
  }
  return null;
}

function parseForMac(output, mac) {
  const normalized = mac.toUpperCase();
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (line.toUpperCase().includes(normalized)) {
      const ipMatch = line.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      if (ipMatch) {
        return ipMatch[1];
      }
    }
  }
  return null;
}

function parseProcArp(output, mac) {
  const normalized = mac.toUpperCase();
  const lines = output.split(/\r?\n/).slice(1); // skip header
  for (const line of lines) {
    if (!line) continue;
    const segments = line.trim().split(/\s+/);
    if (segments.length >= 4) {
      const [ip, , , macAddr] = segments;
      if (macAddr?.toUpperCase() === normalized) {
        return ip;
      }
    }
  }
  return null;
}

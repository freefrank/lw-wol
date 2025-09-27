import crypto from 'node:crypto';
import { sendMagicPackets, discoverIpByMac, pingUntilAlive } from './networkTools.js';
import { loadConfig, getTargetById, patchTarget } from '../configStore.js';

function createInitialJob(payload) {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    mac: payload.mac,
    requestedIp: payload.ip ?? '',
    interface: payload.interface ?? '',
    targetId: payload.targetId ?? null,
    targetName: payload.targetName ?? '',
    status: 'queued',
    logs: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    result: null,
    resolvedIp: payload.ip ?? ''
  };
}

function pushLog(job, message) {
  job.logs.push({
    timestamp: new Date().toISOString(),
    message
  });
  job.updatedAt = new Date().toISOString();
}

function markFinished(job, status, result) {
  job.status = status;
  job.result = result;
  job.completedAt = new Date().toISOString();
  job.updatedAt = job.completedAt;
}

export class WakeManager {
  constructor() {
    this.jobs = new Map();
  }

  getJob(jobId) {
    return this.jobs.get(jobId) ?? null;
  }

  listJobs() {
    return Array.from(this.jobs.values());
  }

  async enqueueWake(payload) {
    const resolvedPayload = await this.#resolvePayload(payload);
    const job = createInitialJob(resolvedPayload);
    this.jobs.set(job.id, job);
    this.#processJob(job).catch((error) => {
      pushLog(job, `Wake job crashed: ${error.message}`);
      markFinished(job, 'failed', { success: false, reason: error.message });
    });
    return job;
  }

  async #resolvePayload(payload) {
    const result = { ...payload };
    if (payload.targetId) {
      const target = await getTargetById(payload.targetId);
      if (!target) {
        throw new Error(`Target ${payload.targetId} not found`);
      }
      result.mac = target.mac;
      result.ip = payload.ip ?? target.ip ?? '';
      result.interface = payload.interface ?? target.interface ?? '';
      result.targetName = target.name ?? '';
    }

    if (!result.mac) {
      throw new Error('MAC address is required to trigger wake');
    }

    if (!result.targetName) {
      result.targetName = result.mac;
    }

    return result;
  }

  async #processJob(job) {
    pushLog(job, 'Sending Wake-on-LAN packets');
    job.status = 'sending_packets';
    try {
      await sendMagicPackets(job.mac);
      pushLog(job, 'Magic packets sent');
    } catch (error) {
      const reason = `Failed to send magic packets: ${error.message}`;
      pushLog(job, reason);
      markFinished(job, 'failed', { success: false, reason });
      return;
    }

    const config = await loadConfig();
    const pingSettings = config.ping ?? {};

    if (!job.requestedIp) {
      job.status = 'discovering_ip';
      pushLog(job, 'Discovering IP via ARP table');
      const ip = await discoverIpByMac(job.mac, job.interface);
      if (ip) {
        job.resolvedIp = ip;
        pushLog(job, `Discovered IP ${ip}`);
        if (job.targetId) {
          await patchTarget(job.targetId, {
            ip,
            mac: job.mac,
            lastWakeAt: new Date().toISOString(),
            lastStatus: 'booting'
          });
        }
      } else {
        pushLog(job, 'No IP match found yet');
      }
    } else {
      job.resolvedIp = job.requestedIp;
      pushLog(job, `Using provided IP ${job.requestedIp}`);
      if (job.targetId) {
        await patchTarget(job.targetId, {
          ip: job.requestedIp,
          mac: job.mac,
          lastWakeAt: new Date().toISOString(),
          lastStatus: 'booting'
        });
      }
    }

    const ipToPing = job.resolvedIp;
    if (!ipToPing) {
      pushLog(job, 'Stopped: IP address unresolved');
      markFinished(job, 'waiting_for_ip', { success: false, reason: 'IP address not available; cannot ping host' });
      return;
    }

    job.status = 'pinging';
    pushLog(job, `Pinging ${ipToPing} until reachable`);
    const pingSuccess = await pingUntilAlive(ipToPing, {
      timeoutMs: pingSettings.timeoutMs,
      intervalMs: pingSettings.intervalMs
    });

    pushLog(job, pingSuccess ? 'Host is reachable' : 'Host is still unreachable after timeout');
    markFinished(job, pingSuccess ? 'online' : 'unreachable', {
      success: pingSuccess,
      ip: ipToPing,
      reason: pingSuccess ? undefined : 'Host did not respond before timeout'
    });

    if (job.targetId) {
      await patchTarget(job.targetId, {
        ip: ipToPing,
        mac: job.mac,
        lastWakeAt: job.completedAt,
        lastStatus: job.status
      });
    }
  }
}

export const wakeManager = new WakeManager();

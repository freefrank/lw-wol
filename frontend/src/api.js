const ENV_BASE = import.meta.env.VITE_API_BASE_URL?.trim();

function resolveBase() {
  if (!ENV_BASE) {
    return '';
  }

  if (typeof window !== 'undefined') {
    const { protocol, origin } = window.location;
    if (protocol === 'https:' && ENV_BASE.startsWith('http://')) {
      // Avoid mixed-content in secure contexts; fall back to same origin.
      return '';
    }
    if (ENV_BASE === origin) {
      return '';
    }
  }

  return ENV_BASE.replace(/\/$/, '');
}

const API_BASE = resolveBase();

function withBase(path) {
  if (!API_BASE) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
  }
  return headers;
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data?.error ?? 'Request failed';
    throw new Error(error);
  }
  return data;
}

export async function login(password) {
  const res = await fetch(withBase('/api/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  return handleResponse(res);
}

export async function fetchConfig(token) {
  const res = await fetch(withBase('/api/config'), {
    headers: authHeaders(token)
  });
  return handleResponse(res);
}

export async function saveTarget(token, target) {
  const res = await fetch(withBase('/api/targets'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(target)
  });
  return handleResponse(res);
}

export async function deleteTarget(token, id) {
  const res = await fetch(withBase(`/api/targets/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  return handleResponse(res);
}

export async function selectTarget(token, id) {
  const res = await fetch(withBase('/api/targets/select'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id })
  });
  return handleResponse(res);
}

export async function updatePing(token, ping) {
  const res = await fetch(withBase('/api/config/ping'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(ping)
  });
  return handleResponse(res);
}

export async function triggerWake(token, payload) {
  const res = await fetch(withBase('/api/wake'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchJobStatus(token, jobId) {
  const res = await fetch(withBase(`/api/status/${jobId}`), {
    headers: authHeaders(token)
  });
  return handleResponse(res);
}

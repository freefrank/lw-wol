import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  login,
  fetchConfig,
  saveTarget,
  deleteTarget,
  selectTarget,
  triggerWake,
  fetchJobStatus
} from './api.js';
import { LoginCard } from './components/LoginCard.jsx';
import { TargetForm } from './components/TargetForm.jsx';
import { WakeControls } from './components/WakeControls.jsx';
import { WakeStatusList } from './components/WakeStatusList.jsx';

const detectSystemTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const detectSystemLanguage = () => {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  const candidates = navigator.languages ?? [navigator.language];
  const match = candidates.find((code) => typeof code === 'string' && code.toLowerCase().startsWith('zh'));
  return match ? 'zh' : 'en';
};

const translations = {
  en: {
    headerTitle: 'lw-wol Console',
    tagline: 'Sends three magic packets, then discovers the IP (if missing) and pings until the host is reachable.',
    themeToLight: 'Light Theme',
    themeToDark: 'Dark Theme',
    languageToZh: '中文',
    languageToEn: 'English',
    logout: 'Log Out',
    login: {
      title: 'Secure Login',
      subtitle: 'Enter the password configured on the server (.env).',
      passwordLabel: 'Password',
      passwordPlaceholder: 'App password',
      submit: 'Log In',
      checking: 'Checking...'
    },
    general: {
      loading: 'Loading configuration...',
      loadError: 'Unable to load configuration.',
      noTargetSelected: 'Select or create a target first.',
      selectBeforeWake: 'Select or save a target to enable wake actions.'
    },
    wake: {
      title: 'Wake Action',
      working: 'Working...',
      button: (label) => `Wake ${label}`,
      selectHint: 'Select or save a target to enable wake actions.',
      selectPrompt: 'Select or create a target first.',
      usingActive: 'Using active target',
      usingSelected: 'Using selected target',
      macUnknown: 'MAC unknown',
      missingMac: 'Add a MAC address before waking this target.',
      lastWake: 'Last wake',
      lastStatus: 'Last status',
      defaultLabel: 'Target'
    },
    targets: {
      title: 'Wake Targets',
      listLabel: 'Saved Targets',
      addNew: 'Add new target',
      creatingNew: 'Creating new target',
      emptyList: 'No targets saved yet',
      name: 'Friendly Name',
      mac: 'MAC Address',
      ip: 'IP Address (optional)',
      interface: 'Network Interface (optional)',
      saving: 'Saving...',
      createButton: 'Create Target',
      saveButton: 'Save Target',
      deleteButton: 'Delete Target',
      discardDraft: 'Discard draft',
      activeBadge: 'Active Target',
      setActive: 'Set as Active',
      setActiveMessage: 'Set as active target',
      created: 'Target created',
      updated: 'Target updated',
      deleted: 'Target deleted',
      draftCleared: 'Draft cleared',
      deleteConfirm: 'Delete this target?',
      unnamed: 'Unnamed target'
    },
    sessions: {
      title: 'Wake Sessions',
      refresh: 'Refresh',
      refreshing: 'Updating...',
      empty: 'No wake attempts yet.',
      ip: (ip) => `IP: ${ip}`,
      ipPending: 'IP not yet discovered',
      success: 'Wake confirmed',
      failure: 'Wake failed',
      unknownTarget: 'Unknown target',
      mac: (mac) => `MAC: ${mac}`,
      status: {
        queued: 'Queued',
        sending_packets: 'Sending packets',
        discovering_ip: 'Discovering IP',
        waiting_for_ip: 'Waiting for IP',
        pinging: 'Pinging',
        online: 'Online',
        unreachable: 'Unreachable',
        failed: 'Failed'
      }
    }
  },
  zh: {
    headerTitle: 'lw-wol 控制台',
    tagline: '发送三次魔术唤醒包，若未设置 IP 将自动发现并持续 Ping 直至主机在线。',
    themeToLight: '切换为浅色',
    themeToDark: '切换为深色',
    languageToZh: '中文',
    languageToEn: 'English',
    logout: '退出登录',
    login: {
      title: '安全登录',
      subtitle: '输入服务器 .env 中配置的访问密码。',
      passwordLabel: '访问密码',
      passwordPlaceholder: '应用访问密码',
      submit: '登录',
      checking: '验证中...'
    },
    general: {
      loading: '正在加载配置...',
      loadError: '无法加载配置。',
      noTargetSelected: '请先选择或创建一个唤醒目标。',
      selectBeforeWake: '选择或保存一个目标后才能执行唤醒。'
    },
    wake: {
      title: '唤醒操作',
      working: '执行中...',
      button: (label) => `唤醒 ${label}`,
      selectHint: '选择或保存一个目标后才能执行唤醒。',
      selectPrompt: '请先选择或创建一个唤醒目标。',
      usingActive: '当前使用活动目标',
      usingSelected: '当前使用已选目标',
      macUnknown: '未知 MAC',
      missingMac: '请为该目标填写 MAC 地址后再唤醒。',
      lastWake: '最近唤醒',
      lastStatus: '最近状态',
      defaultLabel: '目标'
    },
    targets: {
      title: '唤醒目标',
      listLabel: '已保存的目标',
      addNew: '新增目标',
      creatingNew: '正在创建新目标',
      emptyList: '暂无保存的目标',
      name: '显示名称',
      mac: 'MAC 地址',
      ip: 'IP 地址（可选）',
      interface: '网络接口（可选）',
      saving: '保存中...',
      createButton: '保存新目标',
      saveButton: '保存修改',
      deleteButton: '删除目标',
      discardDraft: '清除草稿',
      activeBadge: '当前活动目标',
      setActive: '设为活动目标',
      setActiveMessage: '已设为活动目标',
      created: '目标已创建',
      updated: '目标已更新',
      deleted: '目标已删除',
      draftCleared: '草稿已清除',
      deleteConfirm: '确定删除该目标？',
      unnamed: '未命名目标'
    },
    sessions: {
      title: '唤醒记录',
      refresh: '刷新',
      refreshing: '更新中...',
      empty: '尚未尝试唤醒。',
      ip: (ip) => `IP：${ip}`,
      ipPending: '正在发现 IP',
      success: '唤醒成功',
      failure: '唤醒失败',
      unknownTarget: '未知目标',
      mac: (mac) => `MAC：${mac}`,
      status: {
        queued: '排队中',
        sending_packets: '发送唤醒包',
        discovering_ip: '正在发现 IP',
        waiting_for_ip: '等待 IP',
        pinging: 'Ping 测试中',
        online: '已上线',
        unreachable: '不可达',
        failed: '失败'
      }
    }
  }
};

const FINISHED_STATUSES = new Set(['online', 'unreachable', 'failed', 'waiting_for_ip']);

const resolveFallback = (fallback) => (typeof fallback === 'function' ? fallback() : fallback);

const getStoredValue = (key, fallback) => {
  const resolvedFallback = resolveFallback(fallback);
  if (typeof window === 'undefined') return resolvedFallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ?? resolvedFallback;
  } catch {
    return resolvedFallback;
  }
};

function App() {
  const [token, setToken] = useState(() => getStoredValue('authToken', ''));
  const [theme, setTheme] = useState(() => getStoredValue('lw-wol-theme', detectSystemTheme));
  const [language, setLanguage] = useState(() => getStoredValue('lw-wol-language', detectSystemLanguage));
  const [config, setConfig] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [draftTarget, setDraftTarget] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [refreshingJobs, setRefreshingJobs] = useState(false);

  const t = translations[language] ?? translations.en;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lw-wol-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lw-wol-language', language);
    }
  }, [language]);

  const applyConfig = useCallback((data, options = {}) => {
    const nextConfig = data ?? { targets: [], activeTargetId: null, ping: {} };
    setConfig(nextConfig);
    const targets = nextConfig.targets ?? [];
    const defaultId = (() => {
      if (targets.length === 0) {
        return 'new';
      }
      if (nextConfig.activeTargetId && targets.some((item) => item.id === nextConfig.activeTargetId)) {
        return nextConfig.activeTargetId;
      }
      return targets[0]?.id ?? null;
    })();

    setSelectedTargetId((prev) => {
      if (options.forceSelectedId) {
        return options.forceSelectedId;
      }
      if (prev === 'new' && options.keepDraft) {
        return prev;
      }
      if (prev && prev !== 'new' && targets.some((item) => item.id === prev)) {
        return prev;
      }
      return defaultId;
    });

    if (!options.keepDraft) {
      if (targets.length === 0) {
        setDraftTarget({ id: null, name: '', mac: '', ip: '', interface: '' });
      } else {
        setDraftTarget(null);
      }
    }
  }, []);

  const loadConfig = useCallback(
    async (activeToken = token) => {
      if (!activeToken) return;
      setLoading(true);
      try {
        const data = await fetchConfig(activeToken);
        applyConfig(data);
        setLoginError('');
      } catch (error) {
        console.error(error);
        setLoginError(error.message);
      } finally {
        setLoading(false);
      }
    },
    [token, applyConfig]
  );

  useEffect(() => {
    if (token) {
      loadConfig(token).catch((error) => console.error('Failed to load config', error));
    }
  }, [token, loadConfig]);

  const handleLogin = async (password) => {
    setLoading(true);
    setLoginError('');
    try {
      const result = await login(password);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('authToken', result.token);
      }
      setToken(result.token);
      await loadConfig(result.token);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('authToken');
    }
    setToken('');
    setConfig(null);
    setJobs([]);
  };

  const handleTargetSave = async (form) => {
    if (!token) return;
    setSavingTarget(true);
    try {
      const response = await saveTarget(token, form);
      const configData = response.config ?? response;
      const savedId = response.target?.id ?? form.id ?? null;
      applyConfig(configData, { forceSelectedId: savedId });
      setDraftTarget(null);
      return configData;
    } catch (error) {
      throw error;
    } finally {
      setSavingTarget(false);
    }
  };

  const handleTargetDelete = async (id) => {
    if (!token) return;
    setSavingTarget(true);
    try {
      const updated = await deleteTarget(token, id);
      applyConfig(updated);
    } catch (error) {
      throw error;
    } finally {
      setSavingTarget(false);
    }
  };

  const handleSetActiveTarget = async (id) => {
    if (!token) return;
    setSavingTarget(true);
    try {
      const updated = await selectTarget(token, id);
      applyConfig(updated, { forceSelectedId: id });
    } catch (error) {
      throw error;
    } finally {
      setSavingTarget(false);
    }
  };

  const handleSelectTarget = (id) => {
    if (!id || id === 'new') {
      setDraftTarget({ id: null, name: '', mac: '', ip: '', interface: '' });
      setSelectedTargetId('new');
      return;
    }
    setSelectedTargetId(id);
    setDraftTarget(null);
  };

  const refreshJobs = useCallback(
    async (jobIds) => {
      if (!token) return;
      const ids = jobIds ?? jobs.map((job) => job.id);
      if (ids.length === 0) return;
      setRefreshingJobs(true);
      try {
        const updates = await Promise.all(
          ids.map(async (id) => {
            try {
              return await fetchJobStatus(token, id);
            } catch (error) {
              console.error('Job refresh failed', error);
              return null;
            }
          })
        );
        setJobs((prev) => {
          const next = [...prev];
          updates.forEach((update) => {
            if (!update) return;
            const index = next.findIndex((job) => job.id === update.id);
            if (index === -1) {
              next.push(update);
            } else {
              next[index] = update;
            }
          });
          return next;
        });
      } finally {
        setRefreshingJobs(false);
      }
    },
    [jobs, token]
  );

  useEffect(() => {
    if (!token) return undefined;
    const pending = jobs.filter((job) => !FINISHED_STATUSES.has(job.status)).map((job) => job.id);
    if (pending.length === 0) return undefined;
    const timer = setInterval(() => {
      refreshJobs(pending).catch((error) => console.error('Polling jobs failed', error));
    }, 2000);
    return () => clearInterval(timer);
  }, [jobs, token, refreshJobs]);

  const targets = config?.targets ?? [];
  const activeTarget = targets.find((item) => item.id === config?.activeTargetId) ?? null;
  const selectedTarget = selectedTargetId && selectedTargetId !== 'new'
    ? targets.find((item) => item.id === selectedTargetId) ?? null
    : null;
  const wakeTarget = selectedTarget ?? activeTarget ?? null;

  const handleWake = async () => {
    if (!token || !wakeTarget) {
      alert(t.general.noTargetSelected);
      return;
    }
    try {
      const job = await triggerWake(token, {
        targetId: wakeTarget.id
      });
      setJobs((prev) => [job, ...prev.filter((existing) => existing.id !== job.id)]);
    } catch (error) {
      alert(error.message);
    }
  };

  const activeJobs = useMemo(
    () => [...jobs].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
    [jobs]
  );

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'));

  return (
    <main className="layout">
      {!token ? (
        <LoginCard
          onSubmit={handleLogin}
          loading={loading}
          error={loginError}
          texts={t.login}
        />
      ) : (
        <>
          {loading ? <p className="muted">{t.general.loading}</p> : null}

          {config ? (
            <>
              <WakeControls
                onWake={handleWake}
                busy={refreshingJobs}
                target={wakeTarget}
                activeTargetId={config.activeTargetId}
                texts={t.wake}
              />
              <section className="grid">
                <TargetForm
                  targets={targets}
                  target={selectedTargetId === 'new' ? draftTarget : selectedTarget}
                  selectedId={selectedTargetId}
                  activeId={config.activeTargetId}
                  onSelect={handleSelectTarget}
                  onCreateNew={() => handleSelectTarget('new')}
                  onSave={handleTargetSave}
                  onDelete={handleTargetDelete}
                  onSetActive={handleSetActiveTarget}
                  onDraftChange={setDraftTarget}
                  saving={savingTarget}
                  texts={t.targets}
                />
                <WakeStatusList
                  jobs={activeJobs}
                  onRefresh={() => refreshJobs()}
                  refreshing={refreshingJobs}
                  texts={t.sessions}
                />
              </section>
            </>
          ) : (
            <p className="error">{t.general.loadError}</p>
          )}
        </>
      )}

      <footer className="top-bar bottom-bar">
        <div>
          <h1>{t.headerTitle}</h1>
          <p className="muted">{t.tagline}</p>
        </div>
        <div className="bar-actions">
          <button type="button" className="ghost" onClick={toggleTheme}>
            {theme === 'dark' ? t.themeToLight : t.themeToDark}
          </button>
          <button type="button" className="ghost" onClick={toggleLanguage}>
            {language === 'en' ? t.languageToZh : t.languageToEn}
          </button>
          {token ? (
            <button type="button" className="ghost" onClick={handleLogout}>
              {t.logout}
            </button>
          ) : null}
        </div>
      </footer>
    </main>
  );
}

export default App;

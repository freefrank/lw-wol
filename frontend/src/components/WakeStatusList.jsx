const FINISHED = new Set(['online', 'unreachable', 'failed', 'waiting_for_ip']);

export function WakeStatusList({ jobs = [], onRefresh, refreshing, texts }) {
  return (
    <div className="card">
      <div className="header-row">
        <h2>{texts.title}</h2>
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? texts.refreshing : texts.refresh}
        </button>
      </div>
      {jobs.length === 0 ? (
        <p className="muted">{texts.empty}</p>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.id} className={`job job-${job.status}`}>
              <div className="job-heading">
                <div>
                  <strong>{job.targetName || job.mac || texts.unknownTarget}</strong>
                  {job.mac ? <p className="muted">{texts.mac(job.mac)}</p> : null}
                </div>
                <span className={`status status-${job.status}`}>
                  {texts.status?.[job.status] ?? (job.status || 'unknown').replace(/_/g, ' ')}
                </span>
              </div>
              {job.resolvedIp ? (
                <p className="muted">{texts.ip(job.resolvedIp)}</p>
              ) : (
                <p className="muted">{texts.ipPending}</p>
              )}
              <ul className="log">
                {job.logs?.slice(-4).map((log) => (
                  <li key={log.timestamp}>{log.message}</li>
                ))}
              </ul>
              {FINISHED.has(job.status) && job.result ? (
                <p className="muted">
                  {job.result.success ? texts.success : job.result.reason || texts.failure}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

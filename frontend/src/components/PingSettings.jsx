import { useEffect, useState } from 'react';

export function PingSettings({ ping, onSave, saving }) {
  const [form, setForm] = useState({ intervalMs: 1000, timeoutMs: 60000 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (ping) {
      setForm({
        intervalMs: ping.intervalMs ?? 1000,
        timeoutMs: ping.timeoutMs ?? 60000
      });
    }
  }, [ping]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await onSave(form);
      setMessage('Ping settings saved');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="card">
      <h2>Ping Strategy</h2>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="label" htmlFor="intervalMs">
          Interval (ms)
        </label>
        <input
          id="intervalMs"
          name="intervalMs"
          type="number"
          min="100"
          step="100"
          value={form.intervalMs}
          onChange={handleChange}
        />
        <label className="label" htmlFor="timeoutMs">
          Timeout (ms)
        </label>
        <input
          id="timeoutMs"
          name="timeoutMs"
          type="number"
          min="1000"
          step="1000"
          value={form.timeoutMs}
          onChange={handleChange}
        />
        {message ? <p className="muted">{message}</p> : null}
        <button className="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

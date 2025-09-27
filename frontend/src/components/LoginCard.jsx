import { useState } from 'react';

export function LoginCard({ onSubmit, loading, error, texts }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!loading) {
      onSubmit(password);
    }
  };

  return (
    <div className="card">
      <h2>{texts.title}</h2>
      <p className="muted">{texts.subtitle}</p>
      <form onSubmit={handleSubmit} className="stack">
        <label htmlFor="password" className="label">
          {texts.passwordLabel}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={texts.passwordPlaceholder}
          required
        />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? texts.checking : texts.submit}
        </button>
      </form>
    </div>
  );
}

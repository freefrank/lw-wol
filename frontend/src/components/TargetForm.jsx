import { useEffect, useState } from 'react';

const EMPTY_TARGET = { name: '', mac: '', ip: '', interface: '' };

export function TargetForm({
  targets = [],
  target,
  selectedId,
  activeId,
  onSelect,
  onCreateNew,
  onSave,
  onDelete,
  onSetActive,
  onDraftChange,
  saving,
  texts
}) {
  const [form, setForm] = useState(EMPTY_TARGET);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const base = target ? { ...EMPTY_TARGET, ...target } : EMPTY_TARGET;
    setForm({
      name: base.name ?? '',
      mac: base.mac ?? '',
      ip: base.ip ?? '',
      interface: base.interface ?? ''
    });
  }, [target, selectedId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (selectedId === 'new' && onDraftChange) {
        const base = target ?? {};
        onDraftChange({ ...base, ...next, id: null });
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...form,
        ...(target?.id ? { id: target.id } : {})
      };
      await onSave(payload);
      const isNew = selectedId === 'new';
      setMessage(isNew ? texts.created : texts.updated);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDelete = async () => {
    if (!target?.id) {
      onCreateNew();
      setMessage(texts.draftCleared);
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(texts.deleteConfirm)) {
      return;
    }
    try {
      await onDelete(target.id);
      setMessage(texts.deleted);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleSetActive = async () => {
    if (!target?.id) return;
    try {
      await onSetActive(target.id);
      setMessage(texts.setActiveMessage);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const selectValue = selectedId === 'new' ? '__new' : selectedId ?? '';
  const isExisting = selectedId !== 'new' && Boolean(target?.id);
  const isActive = isExisting && target?.id === activeId;

  return (
    <div className="card">
      <h2>{texts.title}</h2>
      <div className="stack">
        <label className="label" htmlFor="target-select">
          {texts.listLabel}
        </label>
        <div className="stack" style={{ gap: '0.5rem' }}>
          <select
            id="target-select"
            value={selectValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === '__new') {
                onCreateNew();
              } else {
                onSelect(value || null);
              }
            }}
          >
            {targets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name?.trim() || item.mac || texts.unnamed}
              </option>
            ))}
            <option value="__new">+ {texts.addNew}</option>
          </select>
          <button type="button" onClick={onCreateNew} disabled={selectedId === 'new'}>
            {selectedId === 'new' ? texts.creatingNew : texts.addNew}
          </button>
        </div>
        {targets.length === 0 ? <p className="muted">{texts.emptyList}</p> : null}
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="label" htmlFor="name">
          {texts.name}
        </label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Office PC"
        />

        <label className="label" htmlFor="mac">
          {texts.mac}
        </label>
        <input
          id="mac"
          name="mac"
          value={form.mac}
          onChange={handleChange}
          placeholder="AA:BB:CC:DD:EE:FF"
          required
        />

        <label className="label" htmlFor="ip">
          {texts.ip}
        </label>
        <input
          id="ip"
          name="ip"
          value={form.ip}
          onChange={handleChange}
          placeholder="192.168.1.10"
        />

        <label className="label" htmlFor="interface">
          {texts.interface}
        </label>
        <input
          id="interface"
          name="interface"
          value={form.interface}
          onChange={handleChange}
          placeholder="eth0"
        />

        {message ? <p className="muted">{message}</p> : null}

        <div className="stack" style={{ gap: '0.5rem' }}>
          <button className="primary" type="submit" disabled={saving}>
            {saving
              ? texts.saving
              : selectedId === 'new'
                ? texts.createButton
                : texts.saveButton}
          </button>
          <button type="button" onClick={handleDelete} disabled={saving}>
            {isExisting ? texts.deleteButton : texts.discardDraft}
          </button>
          <button type="button" onClick={handleSetActive} disabled={!isExisting || isActive || saving}>
            {isActive ? texts.activeBadge : texts.setActive}
          </button>
        </div>
      </form>
    </div>
  );
}

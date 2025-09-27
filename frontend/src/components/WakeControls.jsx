export function WakeControls({ onWake, busy, target, activeTargetId, texts }) {
  const handleWake = () => {
    if (!target?.id) {
      alert(texts.selectPrompt);
      return;
    }
    onWake();
  };

  const formattedLastWake = (() => {
    if (!target?.lastWakeAt) return null;
    const value = new Date(target.lastWakeAt);
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toLocaleString();
  })();

  const buttonDisabled = busy || !target?.id || !target.mac;
  const targetLabel = target?.name?.trim() || target?.mac || texts.defaultLabel;
  const usingActive = target?.id && target.id === activeTargetId;

  return (
    <div className="card">
      <h2>{texts.title}</h2>
      <button className="primary" type="button" onClick={handleWake} disabled={buttonDisabled}>
        {busy ? texts.working : texts.button(targetLabel)}
      </button>
      {!target?.id ? (
        <p className="muted">{texts.selectHint}</p>
      ) : (
        <>
          <p className="muted">
            {usingActive ? texts.usingActive : texts.usingSelected} ({target.mac || texts.macUnknown})
          </p>
          {!target.mac ? <p className="error">{texts.missingMac}</p> : null}
          {formattedLastWake ? <p className="muted">{`${texts.lastWake}: ${formattedLastWake}`}</p> : null}
          {target?.lastStatus ? <p className="muted">{`${texts.lastStatus}: ${target.lastStatus}`}</p> : null}
        </>
      )}
    </div>
  );
}

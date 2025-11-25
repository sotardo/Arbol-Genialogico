import { useRef, useState } from 'react';
import { personasApi } from '../api';

export default function BackupRestorePanel({ onDone }) {
  const fileRef = useRef(null);
  const [mode, setMode] = useState('merge'); // merge | replace
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const doBackup = async () => {
    setBusy(true); setMsg('');
    try {
      const data = await personasApi.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-arbol-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally { setBusy(false); }
  };

  const doRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const resp = await personasApi.restore({ personas: json.personas || json }, mode);
      setMsg(`Restore ${mode}: ok. total=${resp.total ?? '-'} (created=${resp.created ?? 0}, updated=${resp.updated ?? 0})`);
      onDone?.();
    } catch (err) {
      console.error(err);
      setMsg('Error leyendo o restaurando el archivo');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ border:'1px solid #eee', borderRadius:10, padding:12, marginTop:16 }}>
      <h3 style={{ marginTop:0 }}>Backup / Restore</h3>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={doBackup} disabled={busy}>Exportar JSON</button>
        <select value={mode} onChange={e=>setMode(e.target.value)} disabled={busy}>
          <option value="merge">Importar (merge)</option>
          <option value="replace">Importar (replace)</option>
        </select>
        <input type="file" accept="application/json" onChange={doRestore} disabled={busy}/>
        {busy && <span style={{ opacity:.7 }}>Procesando…</span>}
      </div>
      {msg && <div style={{ marginTop:8, fontSize:13, opacity:.85 }}>{msg}</div>}
      <p style={{ marginTop:8, fontSize:12, opacity:.7 }}>
        • <b>Exportar</b> baja un JSON con todas las personas y relaciones.<br/>
        • <b>Merge</b> inserta/actualiza por <code>_id</code> (si falta <code>_id</code>, crea nueva).<br/>
        • <b>Replace</b> borra todo y carga sólo lo del archivo (¡cuidado!).
      </p>
    </div>
  );
}

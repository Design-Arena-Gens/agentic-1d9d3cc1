"use client";

import { useEffect, useMemo, useState } from 'react';
import { Section } from '@/components/Section';
import { TextArea } from '@/components/TextArea';
import { Button } from '@/components/Button';

type Row = Record<string, any>;

export default function Page() {
  const [kubeconfig, setKubeconfig] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [type, setType] = useState<'namespaces' | 'deployments' | 'pods' | 'services' | 'configmaps' | 'secrets'>('deployments');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [manifest, setManifest] = useState('');
  const [logs, setLogs] = useState('');
  const [logQuery, setLogQuery] = useState({ namespace: 'default', pod: '', container: '' });
  const [scale, setScale] = useState({ namespace: 'default', name: '', replicas: 1 });
  const [deleteReq, setDeleteReq] = useState({ kind: 'Pod', namespace: 'default', name: '' } as { kind: 'Deployment'|'Service'|'ConfigMap'|'Secret'|'Pod'|'Namespace'; namespace?: string; name: string });

  // Persist kubeconfig locally (never stored server-side)
  useEffect(() => {
    const k = localStorage.getItem('kubeconfig');
    if (k) setKubeconfig(k);
  }, []);
  useEffect(() => {
    if (kubeconfig) localStorage.setItem('kubeconfig', kubeconfig);
  }, [kubeconfig]);

  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  async function call(path: string, body: any, parseJson = true) {
    const res = await fetch(path, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }
    return parseJson ? res.json() : res.text();
  }

  async function refresh() {
    if (!kubeconfig) return;
    setLoading(true);
    try {
      const { data } = await call('/api/list', { kubeconfig, type, namespace });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  async function doApply() {
    if (!kubeconfig || !manifest.trim()) return;
    setLoading(true);
    try {
      const { result } = await call('/api/apply', { kubeconfig, manifest });
      alert('Applied: ' + JSON.stringify(result));
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    if (!kubeconfig || !logQuery.namespace || !logQuery.pod) return;
    setLoading(true);
    try {
      const text = await call('/api/logs', { kubeconfig, ...logQuery }, false);
      setLogs(String(text));
    } finally {
      setLoading(false);
    }
  }

  async function doScale() {
    if (!kubeconfig || !scale.namespace || !scale.name) return;
    setLoading(true);
    try {
      const { replicas } = await call('/api/scale', { kubeconfig, ...scale });
      alert('Scaled to ' + replicas);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function doDelete() {
    if (!kubeconfig || !deleteReq.name) return;
    setLoading(true);
    try {
      await call('/api/delete', { kubeconfig, ...deleteReq });
      alert('Deleted');
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <Section title="Cluster Configuration (paste kubeconfig YAML)">
        <div className="grid gap-3">
          <TextArea
            rows={10}
            placeholder="apiVersion: v1\nclusters:..."
            value={kubeconfig}
            onChange={(e) => setKubeconfig(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <label className="text-sm">Namespace</label>
            <input value={namespace} onChange={(e) => setNamespace(e.target.value)} className="w-48 rounded-md border px-2 py-1 text-sm" />
            <label className="text-sm">Resource</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-48 rounded-md border px-2 py-1 text-sm">
              <option>deployments</option>
              <option>pods</option>
              <option>services</option>
              <option>configmaps</option>
              <option>secrets</option>
              <option>namespaces</option>
            </select>
            <Button onClick={refresh} disabled={!kubeconfig || loading}>Refresh</Button>
          </div>
        </div>
      </Section>

      <Section title="Resources">
        {loading && <div className="text-sm text-gray-600">Loading?</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-gray-600">No data</div>}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="border-b px-2 py-1 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="odd:bg-gray-50">
                    {columns.map((c) => (
                      <td key={c} className="px-2 py-1">{String(r[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Apply YAML Manifest">
        <div className="grid gap-3">
          <TextArea rows={8} placeholder="# paste one or more YAML docs (--- separated)" value={manifest} onChange={(e) => setManifest(e.target.value)} />
          <div>
            <Button onClick={doApply} disabled={!manifest.trim() || !kubeconfig || loading}>Apply</Button>
          </div>
        </div>
      </Section>

      <Section title="Logs">
        <div className="flex flex-wrap items-center gap-3">
          <input placeholder="namespace" value={logQuery.namespace} onChange={(e) => setLogQuery({ ...logQuery, namespace: e.target.value })} className="w-44 rounded-md border px-2 py-1 text-sm" />
          <input placeholder="pod" value={logQuery.pod} onChange={(e) => setLogQuery({ ...logQuery, pod: e.target.value })} className="w-72 rounded-md border px-2 py-1 text-sm" />
          <input placeholder="container (optional)" value={logQuery.container} onChange={(e) => setLogQuery({ ...logQuery, container: e.target.value })} className="w-60 rounded-md border px-2 py-1 text-sm" />
          <Button onClick={fetchLogs} disabled={!logQuery.pod || !kubeconfig || loading}>Fetch Logs</Button>
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-md border bg-black p-3 text-xs text-green-200">{logs || '?'}</pre>
      </Section>

      <Section title="Scale Deployment">
        <div className="flex flex-wrap items-center gap-3">
          <input placeholder="namespace" value={scale.namespace} onChange={(e) => setScale({ ...scale, namespace: e.target.value })} className="w-44 rounded-md border px-2 py-1 text-sm" />
          <input placeholder="name" value={scale.name} onChange={(e) => setScale({ ...scale, name: e.target.value })} className="w-72 rounded-md border px-2 py-1 text-sm" />
          <input type="number" min={0} placeholder="replicas" value={scale.replicas} onChange={(e) => setScale({ ...scale, replicas: Number(e.target.value) })} className="w-32 rounded-md border px-2 py-1 text-sm" />
          <Button onClick={doScale} disabled={!scale.name || !kubeconfig || loading}>Scale</Button>
        </div>
      </Section>

      <Section title="Delete Resource">
        <div className="flex flex-wrap items-center gap-3">
          <select value={deleteReq.kind} onChange={(e) => setDeleteReq({ ...deleteReq, kind: e.target.value as any })} className="w-44 rounded-md border px-2 py-1 text-sm">
            <option>Pod</option>
            <option>Deployment</option>
            <option>Service</option>
            <option>ConfigMap</option>
            <option>Secret</option>
            <option>Namespace</option>
          </select>
          {deleteReq.kind !== 'Namespace' && (
            <input placeholder="namespace" value={deleteReq.namespace ?? ''} onChange={(e) => setDeleteReq({ ...deleteReq, namespace: e.target.value })} className="w-44 rounded-md border px-2 py-1 text-sm" />
          )}
          <input placeholder="name" value={deleteReq.name} onChange={(e) => setDeleteReq({ ...deleteReq, name: e.target.value })} className="w-72 rounded-md border px-2 py-1 text-sm" />
          <Button onClick={doDelete} disabled={!deleteReq.name || !kubeconfig || loading} variant="secondary">Delete</Button>
        </div>
      </Section>
    </main>
  );
}

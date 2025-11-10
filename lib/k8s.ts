import { KubeConfig, CoreV1Api, AppsV1Api, KubernetesObjectApi, PatchUtils } from '@kubernetes/client-node';
import yaml from 'js-yaml';

export type ResourceType = 'namespaces' | 'deployments' | 'pods' | 'services' | 'configmaps' | 'secrets';

export function kubeConfigFromString(kubeconfigYaml: string): KubeConfig {
  const kc = new KubeConfig();
  kc.loadFromString(kubeconfigYaml);
  return kc;
}

export async function listResources(kubeconfigYaml: string, type: ResourceType, namespace?: string) {
  const kc = kubeConfigFromString(kubeconfigYaml);
  if (type === 'namespaces') {
    const api = kc.makeApiClient(CoreV1Api);
    const res = await api.listNamespace();
    return res.body.items.map((n) => ({ name: n.metadata?.name, status: n.status?.phase }));
  }
  if (type === 'deployments') {
    const api = kc.makeApiClient(AppsV1Api);
    const res = await api.listNamespacedDeployment(namespace ?? 'default');
    return res.body.items.map((d) => ({
      name: d.metadata?.name,
      namespace: d.metadata?.namespace,
      ready: `${d.status?.readyReplicas ?? 0}/${d.status?.replicas ?? 0}`,
      available: d.status?.availableReplicas ?? 0,
    }));
  }
  if (type === 'pods') {
    const api = kc.makeApiClient(CoreV1Api);
    const res = await api.listNamespacedPod(namespace ?? 'default');
    return res.body.items.map((p) => ({
      name: p.metadata?.name,
      namespace: p.metadata?.namespace,
      phase: p.status?.phase,
      node: p.spec?.nodeName,
    }));
  }
  if (type === 'services') {
    const api = kc.makeApiClient(CoreV1Api);
    const res = await api.listNamespacedService(namespace ?? 'default');
    return res.body.items.map((s) => ({
      name: s.metadata?.name,
      namespace: s.metadata?.namespace,
      type: s.spec?.type,
      clusterIP: s.spec?.clusterIP,
    }));
  }
  if (type === 'configmaps') {
    const api = kc.makeApiClient(CoreV1Api);
    const res = await api.listNamespacedConfigMap(namespace ?? 'default');
    return res.body.items.map((c) => ({ name: c.metadata?.name, namespace: c.metadata?.namespace }));
  }
  if (type === 'secrets') {
    const api = kc.makeApiClient(CoreV1Api);
    const res = await api.listNamespacedSecret(namespace ?? 'default');
    return res.body.items.map((s) => ({ name: s.metadata?.name, namespace: s.metadata?.namespace, type: s.type }));
  }
  throw new Error('Unsupported type');
}

export async function getPodLogs(kubeconfigYaml: string, namespace: string, pod: string, container?: string) {
  const kc = kubeConfigFromString(kubeconfigYaml);
  const api = kc.makeApiClient(CoreV1Api);
  const res = await api.readNamespacedPodLog(pod, namespace, container);
  return res.body;
}

export async function scaleDeployment(kubeconfigYaml: string, namespace: string, name: string, replicas: number) {
  const kc = kubeConfigFromString(kubeconfigYaml);
  const api = kc.makeApiClient(AppsV1Api);
  // Strategic merge patch for scale subresource
  const body = { spec: { replicas } } as any;
  await api.patchNamespacedDeploymentScale(
    name,
    namespace,
    body
  );
  const updated = await api.readNamespacedDeploymentScale(name, namespace);
  return updated.body.spec?.replicas;
}

export async function deleteResource(
  kubeconfigYaml: string,
  kind: 'Deployment' | 'Service' | 'ConfigMap' | 'Secret' | 'Pod' | 'Namespace',
  name: string,
  namespace?: string
) {
  const kc = kubeConfigFromString(kubeconfigYaml);
  if (kind === 'Deployment') {
    const api = kc.makeApiClient(AppsV1Api);
    await api.deleteNamespacedDeployment(name, namespace ?? 'default');
    return { deleted: true };
  }
  const core = kc.makeApiClient(CoreV1Api);
  switch (kind) {
    case 'Service':
      await core.deleteNamespacedService(name, namespace ?? 'default');
      return { deleted: true };
    case 'ConfigMap':
      await core.deleteNamespacedConfigMap(name, namespace ?? 'default');
      return { deleted: true };
    case 'Secret':
      await core.deleteNamespacedSecret(name, namespace ?? 'default');
      return { deleted: true };
    case 'Pod':
      await core.deleteNamespacedPod(name, namespace ?? 'default');
      return { deleted: true };
    case 'Namespace':
      await core.deleteNamespace(name);
      return { deleted: true };
  }
}

export async function applyManifests(kubeconfigYaml: string, yamlText: string) {
  const kc = kubeConfigFromString(kubeconfigYaml);
  const client = KubernetesObjectApi.makeApiClient(kc);
  const docs = yaml
    .loadAll(yamlText)
    .filter(Boolean) as Array<Record<string, any>>;

  const results: Array<{ kind?: string; name?: string; namespace?: string; verb: string; status: string } | { error: string }>
    = [];

  for (const d of docs) {
    const obj: any = d;
    if (!obj || !obj.kind || !obj.apiVersion) {
      results.push({ error: 'Invalid manifest (missing kind/apiVersion)' });
      continue;
    }
    obj.metadata = obj.metadata || {};
    if (!obj.metadata.name) {
      results.push({ error: `Missing metadata.name for kind ${obj.kind}` });
      continue;
    }
    try {
      const options = { headers: { 'Content-Type': PatchUtils.PATCH_FORMAT_APPLY_YAML } } as any;
      // Server-side apply: will create or patch declaratively
      await client.patch(obj, undefined, undefined, undefined, options);
      results.push({
        kind: obj.kind,
        name: obj.metadata.name,
        namespace: obj.metadata.namespace,
        verb: 'apply',
        status: 'success',
      });
    } catch (e: any) {
      // Fallback: try create if apply failed
      try {
        await client.create(obj);
        results.push({ kind: obj.kind, name: obj.metadata.name, namespace: obj.metadata.namespace, verb: 'create', status: 'success' });
      } catch (e2: any) {
        results.push({ error: e2?.message ?? 'Unknown error' });
      }
    }
  }
  return results;
}

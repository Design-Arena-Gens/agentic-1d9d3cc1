import { NextRequest } from 'next/server';
import { deleteResource } from '@/lib/k8s';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { kubeconfig, kind, name, namespace } = (await req.json()) as {
      kubeconfig: string; kind: 'Deployment' | 'Service' | 'ConfigMap' | 'Secret' | 'Pod' | 'Namespace'; name: string; namespace?: string;
    };
    if (!kubeconfig || !kind || !name) {
      return new Response(JSON.stringify({ error: 'kubeconfig, kind and name are required' }), { status: 400 });
    }
    const result = await deleteResource(kubeconfig, kind, name, namespace);
    return Response.json(result);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { applyManifests } from '@/lib/k8s';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { kubeconfig, manifest } = (await req.json()) as { kubeconfig: string; manifest: string };
    if (!kubeconfig || !manifest) {
      return new Response(JSON.stringify({ error: 'kubeconfig and manifest are required' }), { status: 400 });
    }
    const result = await applyManifests(kubeconfig, manifest);
    return Response.json({ result });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500 });
  }
}

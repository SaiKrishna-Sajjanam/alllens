import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/data';

export default async function Home() {
  const viewer = await getViewer();
  redirect(viewer.hasPrefs ? '/feed' : '/welcome');
}

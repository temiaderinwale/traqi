import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Pilot from '@/components/pilot/Pilot';

export const metadata: Metadata = {
  /* title.template in the root layout does not reach this segment — spell it out. */
  title: 'Traqi Pilot - Become an early user',
  description: 'Traqi is opening to a small group of business owners first. Tell us about your business and join the pilot.',
  /* The link is handed out by us, not found. Keep it out of the indexes. */
  robots: { index: false, follow: false }
};

const SLIDE = /^pilot-image(\d+)\.(jpe?g|png|webp|avif)$/i;

/** The carousel is however many pilot-image*.jpg files are sitting in
    public/assets, in numeric order. Adding pilot-image6.jpg makes it a
    six-slide carousel with no code change; the count is read here, on the
    server, because the browser has no way to list a directory. */
function slides(): string[] {
  const dir = path.join(process.cwd(), 'public', 'assets');
  let files: string[] = [];
  try { files = fs.readdirSync(dir); } catch { return []; }

  return files
    .map(f => ({ f, m: SLIDE.exec(f) }))
    .filter((x): x is { f: string; m: RegExpExecArray } => !!x.m)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]))
    .map(x => '/assets/' + x.f);
}

export default function PilotPage() {
  return <Pilot images={slides()} />;
}

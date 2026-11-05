import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Team from '@/components/team/Team';

export const metadata: Metadata = {
  /* title.template in the root layout does not reach this segment — spell it out. */
  title: 'Join the Traqi Team',
  description: 'Volunteer roles, remote. Join the Traqi Team — Operations & Customer Support, Technical Assistant, Social Media Manager, Content Creator, and Marketing & Communications Associate.',
  openGraph: {
    title: 'Join the Traqi Team',
    description: 'Volunteer roles, remote. We\'re building tools that help small businesses thrive, and we need people who care about the details.',
    images: ['/assets/team-image1.jpg']
  }
};

const SLIDE = /^team-image(\d+)\.(jpe?g|png|webp|avif)$/i;

/** The carousel is however many team-image*.jpg files are sitting in
    public/assets, in numeric order — the same arrangement as /pilot. */
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

export default function TeamPage() {
  return <Team images={slides()} />;
}

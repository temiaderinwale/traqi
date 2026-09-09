/* Traqi — a picture for each kind of business.

   Drawn rather than photographed: eight scenes that share one geometry, one
   light source and one palette, so the choice reads as a set instead of eight
   borrowed stock images. Each sits on its own two-tone ground and is built
   from the same rounded-rectangle vocabulary as the Traqi mark. */

import type { IndustryKey } from '@/lib/industries';

type ArtProps = { className?: string };

/* Ground + soft light, shared by every scene. `slice` makes the scene fill its
   card edge to edge rather than letterboxing — these are backgrounds, not
   diagrams, so cropping the margins is the right trade. */
function Scene({ from, to, children }: { from: string; to: string; children: React.ReactNode }) {
  const id = 'g' + from.slice(1);
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice"
      className="h-full w-full" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={id + 'l'} cx="0.3" cy="0.15" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${id})`} />
      <rect width="160" height="120" fill={`url(#${id}l)`} />
      {children}
    </svg>
  );
}

const W = '#FFFFFF';
const soft = (o: number) => ({ fill: W, opacity: o });

/** Fashion — a hanging rail with garments. */
const Fashion = () => (
  <Scene from="#7C3AED" to="#4F46E5">
    <rect x="24" y="30" width="112" height="3" rx="1.5" {...soft(0.55)} />
    <g {...soft(0.95)}>
      <path d="M46 33h4l10 8-4 5-3-2v26H43V44l-3 2-4-5 10-8Z" />
    </g>
    <g {...soft(0.75)}>
      <path d="M78 33h5l9 10-5 4v23a2 2 0 0 1-2 2H76a2 2 0 0 1-2-2V47l-5-4 9-10Z" />
    </g>
    <g {...soft(0.55)}>
      <path d="M110 33h4l9 9-4 4 3 24h-20l3-24-4-4 9-9Z" />
    </g>
    <rect x="112" y="86" width="26" height="18" rx="4" {...soft(0.9)} />
    <rect x="120" y="82" width="10" height="6" rx="3" fill="none" stroke={W} strokeOpacity=".9" strokeWidth="2.5" />
  </Scene>
);

/** Fabrics — bolts of cloth and a folded stack. */
const Fabrics = () => (
  <Scene from="#0EA5E9" to="#4F46E5">
    <g {...soft(0.92)}>
      <path d="M22 96V44a10 10 0 0 1 10-10h10v52a10 10 0 0 1-10 10 10 10 0 0 1-10-10Z" />
    </g>
    <ellipse cx="32" cy="44" rx="10" ry="4" fill="#4F46E5" opacity=".35" />
    <g {...soft(0.7)}>
      <path d="M50 96V36a10 10 0 0 1 10-10h10v60a10 10 0 0 1-20 0Z" />
    </g>
    <ellipse cx="60" cy="36" rx="10" ry="4" fill="#4F46E5" opacity=".3" />
    <g {...soft(0.5)}>
      <rect x="84" y="58" width="54" height="11" rx="5.5" />
      <rect x="88" y="72" width="46" height="11" rx="5.5" opacity=".8" />
      <rect x="92" y="86" width="38" height="11" rx="5.5" opacity=".6" />
    </g>
  </Scene>
);

/** Beauty — a cream jar, a dropper and a brush. */
const Beauty = () => (
  <Scene from="#EC4899" to="#8B5CF6">
    <g {...soft(0.95)}>
      <rect x="26" y="58" width="38" height="34" rx="10" />
      <rect x="32" y="50" width="26" height="9" rx="4.5" opacity=".8" />
    </g>
    <rect x="34" y="70" width="22" height="4" rx="2" fill="#8B5CF6" opacity=".35" />
    <g {...soft(0.75)}>
      <rect x="76" y="44" width="20" height="48" rx="9" />
      <rect x="81" y="30" width="10" height="16" rx="5" opacity=".85" />
    </g>
    <g {...soft(0.6)}>
      <rect x="112" y="34" width="9" height="34" rx="4.5" />
      <path d="M112 68h9l4 20a6 6 0 0 1-6 7h-5a6 6 0 0 1-6-7l4-20Z" opacity=".85" />
    </g>
  </Scene>
);

/** Fragrances — a flacon with an atomizer, and a mist. */
const Fragrance = () => (
  <Scene from="#F59E0B" to="#DB2777">
    <g {...soft(0.95)}>
      <rect x="52" y="46" width="46" height="50" rx="12" />
      <rect x="66" y="34" width="18" height="14" rx="5" opacity=".85" />
      <rect x="70" y="26" width="10" height="10" rx="4" opacity=".7" />
    </g>
    <rect x="60" y="62" width="30" height="18" rx="6" fill="#DB2777" opacity=".3" />
    <g {...soft(0.55)}>
      <circle cx="108" cy="30" r="3.5" /><circle cx="120" cy="40" r="2.5" />
      <circle cx="114" cy="52" r="2" /><circle cx="126" cy="24" r="2" />
    </g>
    <rect x="26" y="80" width="18" height="16" rx="5" {...soft(0.5)} />
  </Scene>
);

/** Electronics — a screen, a plug and a bulb. */
const Electronics = () => (
  <Scene from="#0891B2" to="#1D4ED8">
    <g {...soft(0.95)}>
      <rect x="22" y="30" width="76" height="48" rx="8" />
      <rect x="52" y="80" width="16" height="8" rx="2" opacity=".8" />
      <rect x="40" y="88" width="40" height="6" rx="3" opacity=".8" />
    </g>
    <rect x="30" y="38" width="60" height="32" rx="4" fill="#1D4ED8" opacity=".35" />
    <g {...soft(0.7)}>
      <path d="M124 26v14M136 26v14" stroke={W} strokeWidth="5" strokeLinecap="round" opacity=".9" />
      <rect x="116" y="40" width="28" height="22" rx="8" />
      <rect x="126" y="62" width="8" height="14" rx="4" opacity=".8" />
    </g>
    <g {...soft(0.55)}>
      <circle cx="130" cy="90" r="11" />
      <rect x="125" y="99" width="10" height="7" rx="3" opacity=".8" />
    </g>
  </Scene>
);

/** Wholesale — pallet stacks and a delivery van. */
const Wholesale = () => (
  <Scene from="#059669" to="#0D9488">
    <g {...soft(0.9)}>
      <rect x="20" y="52" width="30" height="24" rx="5" />
      <rect x="20" y="78" width="30" height="24" rx="5" opacity=".78" />
      <rect x="54" y="66" width="26" height="36" rx="5" opacity=".62" />
    </g>
    <rect x="30" y="52" width="10" height="24" rx="3" fill="#0D9488" opacity=".35" />
    <g {...soft(0.95)}>
      <path d="M88 60h34l14 16v18a4 4 0 0 1-4 4H88a4 4 0 0 1-4-4V64a4 4 0 0 1 4-4Z" />
    </g>
    <rect x="122" y="66" width="12" height="10" rx="3" fill="#0D9488" opacity=".4" />
    <g fill="#065F46" opacity=".55">
      <circle cx="98" cy="100" r="7" /><circle cx="128" cy="100" r="7" />
    </g>
  </Scene>
);

/** Gadgets — a phone, a laptop and earbuds. */
const Gadgets = () => (
  <Scene from="#4F46E5" to="#0F172A">
    <g {...soft(0.95)}>
      <rect x="24" y="34" width="34" height="60" rx="9" />
    </g>
    <rect x="29" y="41" width="24" height="42" rx="4" fill="#0F172A" opacity=".45" />
    <g {...soft(0.8)}>
      <rect x="68" y="44" width="60" height="38" rx="6" />
      <path d="M62 84h72l-4 8a3 3 0 0 1-3 2H69a3 3 0 0 1-3-2l-4-8Z" opacity=".9" />
    </g>
    <rect x="74" y="50" width="48" height="26" rx="3" fill="#0F172A" opacity=".45" />
    <g {...soft(0.6)}>
      <circle cx="136" cy="28" r="7" /><rect x="133" y="33" width="6" height="14" rx="3" />
    </g>
  </Scene>
);

/** Kitchen & home — a pot, a kettle and stacked plates. */
const Kitchen = () => (
  <Scene from="#EA580C" to="#BE123C">
    <g {...soft(0.95)}>
      <path d="M28 56h44v26a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V56Z" />
      <rect x="24" y="50" width="52" height="8" rx="4" opacity=".85" />
      <rect x="44" y="40" width="12" height="8" rx="4" opacity=".7" />
    </g>
    <g {...soft(0.72)}>
      <path d="M92 60h30v22a8 8 0 0 1-8 8h-14a8 8 0 0 1-8-8V60Z" />
      <path d="M122 66h8a6 6 0 0 1 0 12h-8" fill="none" stroke={W} strokeOpacity=".72" strokeWidth="4" />
      <rect x="100" y="50" width="14" height="8" rx="4" opacity=".85" />
    </g>
    <g {...soft(0.5)}>
      <ellipse cx="132" cy="98" rx="22" ry="5" />
      <ellipse cx="132" cy="90" rx="19" ry="5" opacity=".8" />
      <ellipse cx="132" cy="82" rx="16" ry="5" opacity=".65" />
    </g>
  </Scene>
);

const ART: Record<IndustryKey, () => JSX.Element> = {
  fashion: Fashion, fabrics: Fabrics, beauty: Beauty, fragrance: Fragrance,
  electronics: Electronics, wholesale: Wholesale, gadgets: Gadgets, kitchen: Kitchen
};

export default function IndustryArt({ industry, className = '' }: ArtProps & { industry: IndustryKey }) {
  const Art = ART[industry];
  return <span className={'block overflow-hidden ' + className}><Art /></span>;
}

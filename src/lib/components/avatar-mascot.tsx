import * as React from 'react';
import { hashCode, createRandom, getComplement, getContrast, mixColors } from '../utilities';
import type { AvatarProps } from './types';

const EYES = ['dots', 'wink', 'happy', 'sleepy'] as const;
const MOUTHS = ['smile', 'grin', 'o', 'flat'] as const;
const ACCESSORIES = [
  'none', 'headband', 'eyepatch', 'mask', 'spiky', 'headset', 'sunglasses',
  'beanie', 'party', 'monocle', 'mustache', 'bow', 'tophat',
] as const;
const FACE_X = [-3, 0, 3, 6];
const SPLIT_OFFSETS = [-30, 0, 30];

// Head: circle at (50, 55) r36 in a 100-unit space; the viewBox trims the empty margins
const VIEWBOX = '2 0 96 96';
const CY = 55;
// Face features are drawn small, then scaled up around the face center so they read at avatar sizes
const K = 1.35;

type Eyes = (typeof EYES)[number];
type Mouth = (typeof MOUTHS)[number];

const r2 = (n: number) => Math.round(n * 100) / 100;
// Path template that rounds every interpolated number, so the markup stays short
const d = (s: TemplateStringsArray, ...v: number[]) =>
  s.reduce((out, str, i) => out + str + (i < v.length ? r2(v[i]) : ''), '');

const stroke = (color: string, width: number, opacity?: number) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
  strokeOpacity: opacity,
});

function generateData(name: string, colors: string[]) {
  const random = createRandom(hashCode(name));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)];
  const head = pick(colors);
  const accent = getComplement(head, pick(SPLIT_OFFSETS));

  return {
    head,
    ink: getContrast(head) === '#000000' ? '#1D1B1A' : '#FFFFFF',
    eyes: pick(EYES),
    mouth: pick(MOUTHS),
    accessory: pick(ACCESSORIES),
    faceX: pick(FACE_X),
    accent,
    // Accent, a shade for undersides and far sides, a tint for highlights, and a shadow cast onto the head
    shade: mixColors(accent, '#000000', 0.26),
    tint: mixColors(accent, '#FFFFFF', 0.55),
    headShadow: mixColors(head, '#000000', 0.14),
  };
}

type Data = ReturnType<typeof generateData>;
type Ids = { head: string; face: string; extra: string };

const Eye = ({ x, y, kind, ink }: { x: number; y: number; kind: 'dot' | 'arc' | 'sleepy'; ink: string }) => {
  if (kind === 'dot') return <circle cx={x} cy={y} r={3.5} fill={ink} />;
  if (kind === 'arc') return <path d={d`M${x - 3.8} ${y + 1.3} Q${x} ${y - 4} ${x + 3.8} ${y + 1.3}`} {...stroke(ink, 2.7)} />;
  return <path d={d`M${x - 3.8} ${y - 0.4} Q${x} ${y + 3.2} ${x + 3.8} ${y - 0.4}`} {...stroke(ink, 2.7)} />;
};

const EYE_KINDS: Record<Eyes, ['dot' | 'arc' | 'sleepy', 'dot' | 'arc' | 'sleepy']> = {
  dots: ['dot', 'dot'],
  wink: ['dot', 'arc'],
  happy: ['arc', 'arc'],
  sleepy: ['sleepy', 'sleepy'],
};

const Face = ({ data, fx }: { data: Data; fx: number }) => {
  const { ink } = data;
  const [left, right] = EYE_KINDS[data.eyes];
  const my = data.accessory === 'mustache' ? 63 : 61;
  const mouths: Record<Mouth, React.ReactNode> = {
    smile: <path d={d`M${fx - 5} ${my} Q${fx} ${my + 4.5} ${fx + 5} ${my}`} {...stroke(ink, 2.7)} />,
    grin: (
      <path
        d={d`M${fx - 6} ${my - 1} Q${fx} ${my + 8} ${fx + 6} ${my - 1} Z`}
        fill={ink}
        stroke={ink}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    ),
    o: <circle cx={fx} cy={my + 1} r={2.4} fill={ink} />,
    flat: <path d={d`M${fx - 3.5} ${my + 1} H${fx + 3.5}`} {...stroke(ink, 2.7)} />,
  };
  return (
    <>
      <Eye x={fx - 9} y={52} kind={left} ink={ink} />
      <Eye x={fx + 9} y={52} kind={right} ink={ink} />
      {mouths[data.mouth]}
    </>
  );
};

// Accessories that sit on the face; drawn in the scaled face space
const FaceAccessory = ({ data, fx, ids }: { data: Data; fx: number; ids: Ids }) => {
  const { accent: ac, shade: D, tint: L } = data;
  const e1 = fx - 9;
  const e2 = fx + 9;
  // Screen coordinates mapped back into face space, for parts that must land on the head edge
  const ix = (x: number) => r2(fx + (x - fx) / K);
  const iy = (y: number) => r2(CY + (y - CY) / K);
  const faceClip = `url(#${ids.face})`;

  switch (data.accessory) {
    case 'eyepatch':
      return (
        <>
          <g clipPath={faceClip}>
            <path d={d`M${e2 - 6} 48.6 Q${fx - 6} 42 ${ix(12)} ${iy(36)}`} {...stroke(D, 1.7)} />
            <path d={d`M${e2 + 6} 48.6 Q${e2 + 9} 49 ${ix(90)} ${iy(52)}`} {...stroke(D, 1.7)} />
          </g>
          <path
            d={d`M${e2 - 6.8} 48 Q${e2} 45.8 ${e2 + 6.8} 48 Q${e2 + 7.2} 55.5 ${e2} 58.6 Q${e2 - 7.2} 55.5 ${e2 - 6.8} 48 Z`}
            fill={ac}
            stroke={D}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path d={d`M${e2 - 4.2} 49.6 Q${e2 - 1} 48.4 ${e2 + 1.6} 49`} {...stroke(L, 1.1)} />
        </>
      );
    case 'mask': {
      const band = d`M${ix(9)} 47.6 Q${fx} 45.2 ${ix(91)} 47.6 L${ix(91)} 57 Q${fx} 59.4 ${ix(9)} 57 Z`;
      const hole = (e: number) => d`M${e - 5.6} 52.2 Q${e} 46.2 ${e + 5.6} 52.2 Q${e} 56.8 ${e - 5.6} 52.2 Z`;
      const P = (x: number, y: number) => `${ix(x)} ${iy(y)}`;
      return (
        <>
          <path
            d={`M${P(15, 52)} C${P(11, 58)} ${P(10, 64)} ${P(10, 71)} L${P(13, 68)} L${P(15.5, 70.5)} C${P(14, 64)} ${P(15, 59)} ${P(18, 55)} Z`}
            fill={D}
          />
          <path
            d={`M${P(14, 48)} C${P(8, 50)} ${P(5, 55)} ${P(2.5, 62)} L${P(6.5, 60.5)} L${P(7.5, 64.5)} C${P(9, 58)} ${P(12, 55)} ${P(16, 54)} Z`}
            fill={ac}
          />
          <g clipPath={faceClip}>
            <path d={`${band} ${hole(e1)} ${hole(e2)}`} fill={ac} fillRule="evenodd" />
            <path d={d`M${ix(10)} 55.6 Q${fx} 58 ${ix(90)} 55.6`} {...stroke(D, 1.5)} />
            <path d={d`M${ix(14)} 48.7 Q${fx} 46.5 ${ix(86)} 48.7`} {...stroke(L, 0.9, 0.75)} />
            <path d={`${hole(e1)} ${hole(e2)}`} {...stroke(D, 0.8)} />
          </g>
          <circle cx={ix(15.5)} cy={iy(50.5)} r={2.6} fill={D} />
        </>
      );
    }
    case 'sunglasses': {
      const lens = (cx: number, top: number, w: number, h: number) => {
        const x0 = cx - w / 2;
        const x1 = cx + w / 2;
        const b = top + h;
        return d`M${x0} ${top} H${x1} Q${x1 + 0.4} ${top} ${x1 - 0.1} ${top + 1.6} Q${x1 - 1} ${b} ${cx} ${b} Q${x0 + 1} ${b} ${x0 + 0.1} ${top + 1.6} Q${x0 - 0.4} ${top} ${x0} ${top} Z`;
      };
      const glass = mixColors(ac, '#121014', 0.72);
      const one = (e: number) => (
        <React.Fragment key={e}>
          <path d={lens(e, 46, 16, 11.5)} fill={ac} />
          <path d={lens(e, 47.6, 12.8, 8.6)} fill={glass} />
          <path d={d`M${e - 4.2} 52.8 L${e - 1} 49.6`} {...stroke('#FFFFFF', 1.2, 0.6)} />
          <path d={d`M${e - 1.4} 53.8 L${e + 0.6} 51.8`} {...stroke('#FFFFFF', 0.9, 0.35)} />
          <path d={d`M${e - 6} 47.2 H${e - 1.5}`} {...stroke(L, 0.8, 0.8)} />
        </React.Fragment>
      );
      return (
        <>
          <path
            d={d`M${e1 - 7.8} 47.8 L${ix(14.5)} ${iy(46.5)} M${e2 + 7.8} 47.8 L${ix(85.5)} ${iy(46.5)}`}
            {...stroke(D, 1.6)}
          />
          <path d={d`M${e1 + 7} 48.4 Q${fx} 46.4 ${e2 - 7} 48.4`} {...stroke(ac, 1.8)} />
          {one(e1)}
          {one(e2)}
        </>
      );
    }
    case 'monocle': {
      const p0 = [e2 + 4.6, 56.4];
      const p1 = [e2 + 8, iy(80)];
      const p2 = [ix(71), iy(82)];
      const links = Array.from({ length: 10 }, (_, i) => {
        const t = (i + 1) / 10;
        const u = 1 - t;
        return [
          u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
          u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        ];
      });
      return (
        <>
          {links.map(([x, y], i) => (
            <circle key={i} cx={r2(x)} cy={r2(y)} r={0.85} fill={ac} />
          ))}
          <circle cx={e2} cy={52} r={6.4} fill="#FFFFFF" fillOpacity={0.18} stroke={ac} strokeWidth={1.8} />
          <circle cx={e2} cy={52} r={7.3} {...stroke(D, 0.5)} />
          <path d={d`M${e2 - 4.6} 49.4 A5.3 5.3 0 0 1 ${e2 - 1} 46.9`} {...stroke('#FFFFFF', 0.9, 0.75)} />
          <circle cx={p0[0]} cy={p0[1]} r={1.25} fill={D} />
        </>
      );
    }
    case 'mustache': {
      const shape = d`M${fx} 57.6 C${fx + 3} 55.4 ${fx + 7.5} 55.4 ${fx + 10} 57.2
        C${fx + 11.6} 58.2 ${fx + 13.4} 57.4 ${fx + 13} 55
        C${fx + 15.2} 56.6 ${fx + 14.8} 60.6 ${fx + 10.6} 60.6
        C${fx + 7} 60.6 ${fx + 3} 59.6 ${fx} 58.8
        C${fx - 3} 59.6 ${fx - 7} 60.6 ${fx - 10.6} 60.6
        C${fx - 14.8} 60.6 ${fx - 15.2} 56.6 ${fx - 13} 55
        C${fx - 13.4} 57.4 ${fx - 11.6} 58.2 ${fx - 10} 57.2
        C${fx - 7.5} 55.4 ${fx - 3} 55.4 ${fx} 57.6 Z`;
      return (
        <g transform={`translate(${fx} 58) scale(1.18) translate(${-fx} -58)`}>
          <path d={shape} fill={ac} />
          <path
            d={d`M${fx + 10.4} 60 C${fx + 7} 60 ${fx + 3} 59 ${fx} 58.2 C${fx - 3} 59 ${fx - 7} 60 ${fx - 10.4} 60`}
            {...stroke(D, 1)}
          />
          <path
            d={d`M${fx - 2.6} 57.3 Q${fx - 6} 56.2 ${fx - 9} 57.5 M${fx + 2.6} 57.3 Q${fx + 6} 56.2 ${fx + 9} 57.5`}
            {...stroke(L, 0.9, 0.8)}
          />
        </g>
      );
    }
    default:
      return null;
  }
};

const BEANIE_DOME = 'M15 36 C14 19 30 10.5 50 10.5 C70 10.5 86 19 85 36 Z';
const PARTY_CONE = 'M37 24.5 L50 6.5 L63 24.5 Q50 29 37 24.5 Z';
const PARTY_TRANSFORM = 'translate(50 28.5) rotate(12) scale(1.3) translate(-50 -24.5)';
const TOPHAT_TRANSFORM = 'translate(50 27) rotate(-8) scale(1.25) translate(-50 -22)';

const Fluff = ({ x, y, puffs, fill }: { x: number; y: number; puffs: number[][]; fill: string }) => (
  <>
    {puffs.map(([dx, dy, r], i) => (
      <circle key={i} cx={x + dx} cy={y + dy} r={r} fill={fill} />
    ))}
  </>
);

// Accessories that sit on the head; drawn at full scale. Head shadows clip in an outer group
// so a rotated hat doesn't rotate the head's clip circle with it.
const HeadAccessory = ({ data, fx, ids }: { data: Data; fx: number; ids: Ids }) => {
  const { accent: ac, shade: D, tint: L, headShadow: HS } = data;
  const headClip = `url(#${ids.head})`;

  switch (data.accessory) {
    case 'headband':
      return (
        <>
          <g clipPath={headClip}>
            <path d="M8 41 Q50 48 92 35 L92 37 Q50 50 8 43 Z" fill={HS} />
            <path d="M8 28 Q50 36 92 22 L92 35 Q50 48 8 41 Z" fill={ac} />
            <path d="M8 38.4 Q50 45.4 92 32.4 L92 35 Q50 48 8 41 Z" fill={D} />
            <path d="M8 30.2 Q50 38.2 92 24.2" {...stroke(L, 1.2, 0.7)} />
          </g>
          <path d="M81.5 34 C87 35.5 92 39 96 44.5 L91.5 43 L91 47 C88 42 85 38.5 80 36.5 Z" fill={D} />
          <path d="M80 29 C85 24 90 20 97 15 L94.5 20.5 L98 22.5 C92 25 87 28.5 82.5 33 Z" fill={ac} />
          <ellipse cx={79.5} cy={32} rx={4.6} ry={5.4} transform="rotate(-20 79.5 32)" fill={ac} />
          <path d="M76.6 35.8 Q80.6 37.6 83.4 33.6" {...stroke(D, 1.3)} />
          <circle cx={78} cy={29.8} r={1.1} fill={L} />
        </>
      );
    case 'spiky':
      return (
        <>
          <path d="M33 24 Q35 12 43 5 Q44 15 48 21 Z M60 22 Q67 13 76 14 Q71 21 74 30 Z" fill={D} />
          <g clipPath={headClip}>
            <path
              d="M0 0 H100 V35.5 L84 32.5 L77 39.5 L69 33.5 L61 41 L53 34 L45 41 L37 34 L29 39.5 L21 33 L0 36.5 Z"
              fill={HS}
            />
            <path
              d="M0 0 H100 V33 L84 30 L77 37 L69 31 L61 38.5 L53 31.5 L45 38.5 L37 31.5 L29 37 L21 30.5 L0 34 Z"
              fill={ac}
              stroke={ac}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          </g>
          <path
            d="M27 28 Q25 15 31 7 Q34 17 41 22 Z M39 23 Q41 8 50 1.5 Q52 13 58 21 Z M56 22 Q61 9 70 7 Q67 17 72 27 Z"
            fill={ac}
            stroke={ac}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path d="M33 26.5 Q38 23 44 24 M57 24 Q62 22 67 24 M47 18 Q48.5 10 51.5 5.5" {...stroke(L, 1.2, 0.75)} />
        </>
      );
    case 'headset':
      return (
        <>
          <rect x={86.5} y={47} width={7.5} height={17} rx={3.7} fill={D} />
          <path d="M10 55 A40 40 0 0 1 90 55" {...stroke(ac, 5)} />
          <path d="M12.3 55 A37.7 37.7 0 0 1 87.7 55" {...stroke(D, 1)} />
          <path d="M11.2 40.9 A41.3 41.3 0 0 1 35.9 16.2" {...stroke(L, 1.2, 0.8)} />
          <path d="M28.9 24.9 A36.8 36.8 0 0 1 71.1 24.9" {...stroke(D, 3.2)} />
          <rect x={2.5} y={44} width={11.5} height={25} rx={5.75} fill={ac} />
          <rect x={10.5} y={46.5} width={6} height={20} rx={3} fill={D} />
          <path d="M5.6 48.5 V55" {...stroke(L, 1.5, 0.8)} />
          <path d={d`M9 64 C10 75 20 79.5 ${fx - 13} 75.5`} {...stroke(ac, 2.4)} />
          <ellipse cx={fx - 12.5} cy={75} rx={4} ry={3} fill={D} />
          <circle cx={fx - 13.7} cy={74.1} r={0.9} fill={L} />
        </>
      );
    case 'beanie': {
      const cuff = mixColors(ac, '#000000', 0.12);
      let ribs = '';
      for (let i = -3; i <= 3; i++) ribs += d`M${50 + i * 10} 34 Q${50 + i * 8} 20 ${50 + i * 3.5} 12.5 `;
      let cuffRibs = '';
      for (let x = 15.5; x <= 85; x += 3.5) {
        const top = 30 + 3.5 * ((x - 50) / 37) ** 2;
        const bottom = 37.5 + 3.5 * ((x - 50) / 37.5) ** 2;
        cuffRibs += d`M${x} ${top + 1.2} V${bottom - 1.2} `;
      }
      return (
        <>
          <g clipPath={headClip}>
            <path d="M12.5 41 Q50 34 87.5 41 L87.5 44.5 Q50 37.5 12.5 44.5 Z" fill={HS} />
          </g>
          <clipPath id={`${ids.extra}-dome`}>
            <path d={BEANIE_DOME} />
          </clipPath>
          <path d={BEANIE_DOME} fill={ac} />
          <path d={ribs} clipPath={`url(#${ids.extra}-dome)`} {...stroke(D, 1.1, 0.35)} />
          <path d="M23 23 Q30 15 41 13" {...stroke(L, 1.6, 0.55)} />
          <path
            d="M13 33.5 Q50 26.5 87 33.5 L87.5 41 Q50 34 12.5 41 Z"
            fill={cuff}
            stroke={cuff}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path d={cuffRibs} {...stroke(D, 1, 0.5)} />
          <path d="M14 33.6 Q50 26.8 86 33.6" {...stroke(D, 0.8, 0.6)} />
          <Fluff x={50} y={9.5} fill={L} puffs={[[0, 0, 4.2], [-3.6, 1.6, 3.2], [3.6, 1.6, 3.2], [-2.4, -2.6, 3], [2.4, -2.6, 3]]} />
          <circle cx={51.6} cy={11} r={2.2} fill={D} fillOpacity={0.18} />
        </>
      );
    }
    case 'party':
      return (
        <>
          <g clipPath={headClip}>
            <g transform={PARTY_TRANSFORM}>
              <ellipse cx={50} cy={28} rx={14} ry={3.6} fill={HS} />
            </g>
          </g>
          <g transform={PARTY_TRANSFORM}>
            <clipPath id={`${ids.extra}-cone`}>
              <path d={PARTY_CONE} />
            </clipPath>
            <path d={PARTY_CONE} fill={ac} />
            <g clipPath={`url(#${ids.extra}-cone)`} fill={L}>
              <path d="M30 18.5 Q50 22.5 70 18.5 L70 15 Q50 19 30 15 Z" />
              <path d="M30 11.5 Q50 14.5 70 11.5 L70 9.3 Q50 12.3 30 9.3 Z" />
              <path d="M50 6.5 L63 24.5 Q57 27 52 27.2 Z" fill={D} fillOpacity={0.3} />
            </g>
            <path d="M37 24.5 Q50 29 63 24.5" {...stroke(D, 1.5)} />
            <Fluff x={50} y={6.5} fill={L} puffs={[[0, 0, 2.8], [-2.4, 1, 2], [2.4, 1, 2], [-1.5, -1.9, 2], [1.5, -1.9, 2]]} />
          </g>
        </>
      );
    case 'bow':
      return (
        <g transform="translate(69 23) rotate(-14) scale(1.4)">
          <path d="M-1.5 1.5 C-3.5 6 -5.5 9.5 -8 13 L-4.8 12 L-4 15.5 C-2.2 11 -0.6 6 1.2 2.2 Z" fill={D} />
          <path d="M1.5 1.8 C3 6 4.2 9 6 12 L3.2 11.4 L2.2 14.2 C1.2 10 0.2 6.2 -0.6 2.4 Z" fill={D} />
          <path
            d="M0 0 C-4 -8.5 -14.5 -10.5 -15 -3.5 C-15.4 2.5 -6 4.5 0 0 Z M0 0 C4 -8.5 14.5 -10.5 15 -3.5 C15.4 2.5 6 4.5 0 0 Z"
            fill={ac}
          />
          <path
            d="M0 0 C-3.5 -4.5 -9 -6 -11.5 -4 C-8.5 -2 -4 -0.6 0 0 Z M0 0 C3.5 -4.5 9 -6 11.5 -4 C8.5 -2 4 -0.6 0 0 Z"
            fill={D}
          />
          <path d="M-12.6 -5 Q-11 -8 -7 -7.6" {...stroke(L, 1, 0.75)} />
          <rect x={-3.2} y={-3.8} width={6.4} height={7.6} rx={2.8} fill={ac} stroke={D} strokeWidth={0.8} />
          <path d="M-1.3 -1.9 V0.9" {...stroke(L, 1.1)} />
        </g>
      );
    case 'tophat':
      return (
        <>
          <g clipPath={headClip}>
            <g transform={TOPHAT_TRANSFORM}>
              <path d="M26 25 Q50 33 74 25 L74 27.5 Q50 36 26 27.5 Z" fill={HS} />
            </g>
          </g>
          <g transform={TOPHAT_TRANSFORM}>
            <path d="M35 22 L36.6 5.5 Q50 3 63.4 5.5 L65 22 Q50 25.6 35 22 Z" fill={ac} />
            <path d="M57.5 4.4 Q61 4.8 63.4 5.5 L65 22 Q61.5 23.4 58.5 23.8 Z" fill={D} fillOpacity={0.45} />
            <path d="M36.6 5.5 Q50 3 63.4 5.5 Q50 8 36.6 5.5 Z" fill={L} fillOpacity={0.55} />
            <path d="M35.5 16 Q50 19.6 64.5 16 L64.8 20.2 Q50 23.8 35.2 20.2 Z" fill={mixColors(ac, '#000000', 0.5)} />
            <path d="M40 8.5 L39.4 13.6" {...stroke(L, 1.8, 0.6)} />
            <path
              d="M27 24 Q50 32.5 73 24 Q75.5 21.4 71.5 21.2 Q50 27.4 28.5 21.2 Q24.5 21.4 27 24 Z"
              fill={ac}
            />
            <path d="M27 24 Q50 32.5 73 24" {...stroke(D, 1.2)} />
          </g>
        </>
      );
    default:
      return null;
  }
};

// The mascot is always round; `square` is accepted for API parity with the other variants
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AvatarMascot = ({ name, colors, title, square, size, ...otherProps }: AvatarProps) => {
  const data = generateData(name, colors);
  const id = React.useId();
  const ids: Ids = { head: `${id}-head`, face: `${id}-face`, extra: id };
  const fx = 50 + data.faceX;

  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      {...otherProps}
    >
      {title && <title>{name}</title>}
      <defs>
        <clipPath id={ids.head}>
          <circle cx={50} cy={CY} r={36} />
        </clipPath>
        <clipPath id={ids.face}>
          <circle cx={r2(fx + (50 - fx) / K)} cy={CY} r={r2(36 / K)} />
        </clipPath>
      </defs>
      <circle cx={50} cy={CY} r={36} fill={data.head} />
      <g transform={`translate(${fx} ${CY}) scale(${K}) translate(${-fx} ${-CY})`}>
        <Face data={data} fx={fx} />
        <FaceAccessory data={data} fx={fx} ids={ids} />
      </g>
      <HeadAccessory data={data} fx={fx} ids={ids} />
    </svg>
  );
};

export default AvatarMascot;

// 위에서 내려다본 식물 일러스트 (레퍼런스의 탑뷰 사진 대신 자체 SVG)
import type { PlantArtKind } from "@/lib/types";

const SUCCULENT_LEAF = "M0 0 C 11 -10, 10 -36, 0 -50 C -10 -36, -11 -10, 0 0Z";
const MONSTERA_LEAF = "M0 0 C 30 -8, 36 -52, 0 -78 C -36 -52, -30 -8, 0 0Z";
const HEART_LEAF = "M0 0 C 15 -6, 24 -27, 11 -38 C 5 -42, 0 -38, 0 -34 C 0 -38, -5 -42, -11 -38 C -24 -27, -15 -6, 0 0Z";

function Succulent() {
  const rings = [
    { n: 12, scale: 1.55, rot: 0, fill: "url(#pa-s-outer)" },
    { n: 10, scale: 1.15, rot: 15, fill: "url(#pa-s-mid)" },
    { n: 8, scale: 0.8, rot: 5, fill: "url(#pa-s-inner)" },
    { n: 6, scale: 0.45, rot: 30, fill: "#c8dd9a" },
  ];
  return (
    <>
      <defs>
        <linearGradient id="pa-s-outer" x1="0" y1="0" x2="0" y2="-1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#4c7a52" /><stop offset="1" stopColor="#7fa77a" />
        </linearGradient>
        <linearGradient id="pa-s-mid" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#5f9460" /><stop offset="1" stopColor="#9cc38a" />
        </linearGradient>
        <linearGradient id="pa-s-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7bab6a" /><stop offset="1" stopColor="#b9d692" />
        </linearGradient>
      </defs>
      {rings.map((r, ri) =>
        Array.from({ length: r.n }, (_, i) => (
          <path
            key={`${ri}-${i}`}
            d={SUCCULENT_LEAF}
            fill={r.fill}
            stroke="#2f5233"
            strokeOpacity={0.25}
            strokeWidth={1}
            transform={`rotate(${(360 / r.n) * i + r.rot}) scale(${r.scale})`}
          />
        )),
      )}
    </>
  );
}

function Monstera() {
  const leaves = [0, 52, 104, 160, 214, 268, 318];
  return (
    <>
      <defs>
        <radialGradient id="pa-m-leaf" cx="0.5" cy="0.9" r="0.9">
          <stop offset="0" stopColor="#3f6e40" /><stop offset="1" stopColor="#6e9e5f" />
        </radialGradient>
      </defs>
      {leaves.map((deg, i) => (
        <g key={deg} transform={`rotate(${deg}) scale(${i % 2 ? 1.05 : 1.2})`}>
          <path d={MONSTERA_LEAF} fill="url(#pa-m-leaf)" stroke="#264a2a" strokeOpacity={0.3} />
          <path d="M0 -4 L0 -72" stroke="#a9c896" strokeOpacity={0.55} strokeWidth={1.4} />
          {[-1, 1].flatMap((side) =>
            [22, 38, 54].map((y) => (
              <path
                key={`${side}-${y}`}
                d={`M0 -${y} L${side * 24} -${y - 12}`}
                stroke="#5f8d5e"
                strokeWidth={3.2}
                strokeLinecap="round"
              />
            )),
          )}
        </g>
      ))}
      <circle r={9} fill="#3a5f3b" />
    </>
  );
}

function Vine() {
  const leaves = Array.from({ length: 16 }, (_, i) => {
    const t = i / 16;
    const angle = i * 137.5;
    const dist = 12 + t * 58;
    return { angle, dist, scale: 0.8 + (1 - t) * 0.5, light: i % 3 === 0 };
  });
  return (
    <>
      {leaves.map((l, i) => (
        <g key={i} transform={`rotate(${l.angle}) translate(0 ${-l.dist}) rotate(${(i % 2 ? 1 : -1) * 25})`}>
          <path
            d={HEART_LEAF}
            transform={`scale(${l.scale}) translate(0 20)`}
            fill={l.light ? "#9cc37f" : "#5e9358"}
            stroke="#2f5233"
            strokeOpacity={0.3}
          />
          {l.light ? null : <path d="M0 18 L0 -8" stroke="#c4dea0" strokeOpacity={0.6} strokeWidth={1} transform={`scale(${l.scale})`} />}
        </g>
      ))}
    </>
  );
}

export default function PlantArt({
  kind,
  size = 200,
  thirsty = false,
  className = "",
  label,
}: {
  kind: PlantArtKind;
  size?: number;
  thirsty?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{
        filter: `drop-shadow(0 14px 18px rgb(31 51 32 / .35))${thirsty ? " saturate(.55) brightness(1.05)" : ""}`,
        transition: "filter .4s, transform .4s",
        transform: thirsty ? "scale(.94)" : undefined,
      }}
    >
      {kind === "succulent" ? <Succulent /> : kind === "vine" ? <Vine /> : <Monstera />}
    </svg>
  );
}

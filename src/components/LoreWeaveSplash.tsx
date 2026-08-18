import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
   LoreWeave mark — SVG path data
   viewBox origin: "translate(0,411) scale(0.1,-0.1)"
   on a 450×411 canvas
───────────────────────────────────────────── */
const MARK_PATH =
  "M1868 3766 c-53 -11 -100 -24 -103 -28 -4 -4 10 -21 31 -39 72 -61 154 -153 214 -241 55 -79 148 -254 180 -338 7 -19 17 -39 21 -44 14 -16 53 136 53 210 1 65 -3 79 -47 167 -51 104 -139 227 -209 293 l-43 41 -97 -21z M2673 3698 c-138 -147 -271 -430 -308 -661 -8 -51 -15 -159 -15 -242 l-1 -150 -56 65 c-316 364 -680 586 -1100 671 -100 20 -103 20 -126 2 -54 -43 -157 -137 -157 -144 0 -4 26 -11 58 -14 519 -60 972 -337 1299 -793 274 -383 442 -867 443 -1277 0 -112 -11 -123 -49 -48 -56 112 -175 277 -261 364 -185 187 -375 269 -624 269 -146 0 -251 -23 -373 -80 -161 -75 -294 -193 -388 -345 -47 -74 -105 -216 -105 -254 0 -18 129 -141 147 -141 5 0 15 28 21 63 7 36 33 106 63 167 45 92 64 117 143 195 127 127 239 183 411 206 201 26 405 -50 566 -212 214 -214 359 -565 359 -866 l0 -73 265 0 265 0 0 198 c0 305 29 500 100 679 73 181 154 293 391 538 183 189 244 268 278 361 62 166 36 343 -69 456 -173 189 -451 197 -630 18 -91 -91 -130 -193 -130 -340 0 -131 -18 -247 -50 -322 -25 -60 -186 -307 -201 -308 -3 0 -16 35 -29 78 -13 42 -61 170 -106 283 -141 350 -177 505 -177 749 1 325 103 594 313 823 29 32 51 59 49 61 -11 8 -156 56 -170 56 -8 0 -29 -15 -46 -32z m958 -1156 c130 -68 154 -230 57 -377 -18 -27 -116 -136 -218 -241 -217 -224 -291 -323 -400 -536 -44 -86 -85 -160 -90 -163 -16 -10 -33 46 -33 110 0 168 134 388 418 683 81 84 145 155 143 157 -4 4 -204 -51 -218 -60 -10 -6 -1 222 12 277 32 146 195 220 329 150z M3375 3286 c-149 -24 -264 -74 -390 -169 -120 -91 -215 -230 -250 -364 -21 -80 -19 -204 5 -299 20 -78 103 -264 119 -264 4 0 1 33 -6 73 -18 87 -11 264 12 351 40 144 117 266 225 350 135 105 261 147 442 148 l108 0 -19 26 c-19 28 -156 163 -163 161 -1 -1 -39 -7 -83 -13z M675 2831 c-45 -5 -52 -10 -72 -46 -12 -22 -32 -66 -43 -99 l-20 -59 53 7 c214 29 319 33 457 16 79 -10 283 -55 304 -68 5 -3 -43 -16 -106 -28 -257 -52 -499 -160 -710 -316 l-80 -60 7 -106 c4 -59 9 -109 11 -111 1 -2 37 26 78 62 247 215 553 346 887 379 161 15 263 2 334 -46 55 -36 195 -163 195 -176 0 -4 -18 -4 -40 1 -155 35 -361 28 -517 -17 -316 -92 -607 -333 -763 -633 l-34 -65 44 -83 c51 -98 68 -117 77 -84 11 45 76 168 130 249 143 216 371 382 615 450 48 13 101 17 228 17 154 -1 171 -3 250 -29 165 -55 310 -142 443 -266 42 -39 77 -70 77 -67 0 23 -63 174 -117 278 -249 488 -720 824 -1251 894 -111 15 -338 18 -437 6z";

/**
 * LoreWeave splash / app-open animation.
 *
 * Props:
 *  - playToken: change to re-trigger animation
 *  - onDone: called when exit fade begins
 *  - holdMs: hold time after fully drawn (ms)
 *  - showCaption: show/hide "LoreWeave" wordmark
 */
export function LoreWeaveSplash({
  playToken = 0,
  onDone,
  holdMs = 900,
  showCaption = true,
}: {
  playToken?: number;
  onDone?: () => void;
  holdMs?: number;
  showCaption?: boolean;
}) {
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    setPhase("in");
    // Total draw + fill + caption settle ≈ 1500ms
    const holdStart = 1500;
    const t1 = setTimeout(() => {
      setPhase("out");
      onDone?.();
    }, holdStart + holdMs);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
      style={{
        background: "#000000",
      }}
    >
      {/* Grain overlay */}
      <svg
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-overlay"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <filter id="lwSplashNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#lwSplashNoise)" />
      </svg>

      {/* Mark container — fades out when phase=out */}
      <div
        key={playToken}
        style={{
          width: "min(52vw, 168px)",
          opacity: phase === "out" ? 0 : 1,
          transform: phase === "out" ? "scale(0.93) translateY(6px)" : "scale(1) translateY(0)",
          transition: "opacity 420ms cubic-bezier(.4,0,.6,1), transform 420ms cubic-bezier(.4,0,.6,1)",
          filter: "drop-shadow(0 0 28px rgba(255,255,255,0.15))",
        }}
      >
        <svg
          viewBox="0 0 450 411"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
          aria-label="LoreWeave"
        >
          <defs>
            <linearGradient id="lwLineGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="lwFillGrad" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>

          <g transform="translate(0,411) scale(0.1,-0.1)">
            {/* Stroke draw animation */}
            <path
              d={MARK_PATH}
              fill="none"
              stroke="url(#lwLineGrad)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 37600,
                strokeDashoffset: 37600,
                animation:
                  "lwDraw 1.05s cubic-bezier(.65,0,.35,1) forwards, lwLineFade 0.45s ease-in forwards",
                animationDelay: "0.05s, 1.05s",
              }}
            />
            {/* Fill wash-in */}
            <path
              d={MARK_PATH}
              fill="url(#lwFillGrad)"
              style={{
                opacity: 0,
                animation: "lwFillIn 0.65s ease-out forwards",
                animationDelay: "0.88s",
              }}
            />
          </g>
        </svg>

        {showCaption && (
          <div
            className="mt-5 text-center font-medium uppercase tracking-[0.24em] text-white/55"
            style={{
              fontSize: "10px",
              opacity: 0,
              letterSpacing: "0.24em",
              animation: "lwCaptionIn 0.6s ease-out forwards",
              animationDelay: "1.1s",
            }}
          >
            LoreWeave
          </div>
        )}
      </div>

      <style>{`
        @keyframes lwDraw      { to { stroke-dashoffset: 0; } }
        @keyframes lwLineFade  { to { opacity: 0; } }
        @keyframes lwFillIn    { to { opacity: 1; } }
        @keyframes lwCaptionIn { to { opacity: 1; } }
      `}</style>
    </div>
  );
}

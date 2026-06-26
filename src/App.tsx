import { useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

// Keep this version matching @mediapipe/tasks-vision in package.json
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const CSS = `
* { box-sizing: border-box; }
.ce-root {
  min-height: 100vh;
  padding: 24px;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #fff;
}
.ce-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.ce-logo {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  background: linear-gradient(135deg, #d946ef, #7c3aed);
}
.ce-title { font-size: 14px; font-weight: 700; margin: 0; }
.ce-sub { font-size: 12px; color: rgba(255,255,255,.4); margin: 0; }

.ce-grid {
  display: grid; gap: 20px; max-width: 1500px; margin: 0 auto;
  grid-template-columns: 300px 1fr 300px;
}
@media (max-width: 1100px) { .ce-grid { grid-template-columns: 1fr; } }

.ce-card {
  border: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.03);
  border-radius: 16px;
  padding: 20px;
}
.ce-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .15em; color: rgba(255,255,255,.4); margin: 0;
}
.ce-stack > * + * { margin-top: 16px; }

.ce-btn {
  width: 100%; border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.06); color: #fff;
  border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background .15s;
}
.ce-btn:hover { background: rgba(255,255,255,.1); }
.ce-btn-row { margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; }

.ce-toggle {
  width: 100%; border: none; border-radius: 16px; padding: 16px;
  font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .15em;
  cursor: pointer; transition: background .15s;
}
.ce-toggle.start { background: rgba(6,78,59,.4); color: #34d399; }
.ce-toggle.start:hover { background: rgba(6,78,59,.6); }
.ce-toggle.stop { background: rgba(69,10,10,.4); color: #f87171; }
.ce-toggle.stop:hover { background: rgba(69,10,10,.6); }

.ce-tune-head { display: flex; align-items: center; justify-content: space-between; }
.ce-pct { font-size: 12px; color: rgba(255,255,255,.5); }
.ce-hint { margin-top: 12px; font-size: 12px; font-style: italic; line-height: 1.5; color: rgba(255,255,255,.3); }

input[type="range"] {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 4px; margin-top: 16px;
  border-radius: 999px; background: rgba(255,255,255,.15); outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px; border-radius: 50%; background: #34d399; cursor: pointer;
}
input[type="range"]::-moz-range-thumb {
  width: 16px; height: 16px; border: none; border-radius: 50%; background: #34d399; cursor: pointer;
}

.ce-stage {
  position: relative; border: 1px solid rgba(255,255,255,.06);
  background: rgba(0,0,0,.4); border-radius: 16px; padding: 16px;
}
.ce-badge {
  position: absolute; top: 28px; left: 28px; z-index: 10;
  border: 1px solid rgba(234,179,8,.3); background: rgba(234,179,8,.1);
  color: #facc15; border-radius: 6px; padding: 4px 8px;
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .15em;
}
.ce-screen {
  width: 100%; max-width: 760px; aspect-ratio: 4 / 3; max-height: 70vh;
  margin: 0 auto; overflow: hidden;
  border-radius: 12px; position: relative;
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 44px),
    #08080a;
}
.ce-canvas { width: 100%; height: 100%; display: block; object-fit: contain; }
.ce-idle {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: rgba(255,255,255,.3); text-align: center; padding: 0 24px;
}
.ce-status {
  position: absolute; bottom: 12px; left: 12px;
  font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: rgba(255,255,255,.45);
}
.ce-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  text-align: center; padding: 0 32px; font-size: 15px; line-height: 1.5;
  color: rgba(255,255,255,.6); background: rgba(0,0,0,.35);
}

.ce-ring-wrap { display: flex; justify-content: center; margin-top: 16px; position: relative; }
.ce-ring-center {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  pointer-events: none;
}
.ce-ring-num { font-size: 30px; font-weight: 300; line-height: 1; }
.ce-ring-cap { font-size: 10px; text-transform: uppercase; letter-spacing: .15em; color: rgba(255,255,255,.4); margin-top: 4px; }
.ce-ring-label { text-align: center; margin-top: 12px; font-size: 14px; font-weight: 500; }

.ce-bars { margin-top: 16px; display: flex; align-items: flex-end; gap: 4px; height: 48px; }
.ce-bar { flex: 1; border-radius: 2px; min-height: 4px; transition: height .2s; }
`;

export default function App() {
  const [monitoring, setMonitoring] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [score, setScore] = useState(100);
  const [label, setLabel] = useState("Optimal Posture");
  const [color, setColor] = useState("#34d399");
  const [history, setHistory] = useState<number[]>(Array(24).fill(0));
  const [status, setStatus] = useState("Idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef(-1);
  const liveNeck = useRef(0);
  const baseline = useRef<number | null>(null);
  const smoothed = useRef(100);
  const calibrate = useRef(false);
  const sensRef = useRef(sensitivity);
  sensRef.current = sensitivity;

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function makeLandmarker(fileset: any) {
      try {
        return await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      } catch {
        return await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }
    }

    async function start() {
      try {
        setStatus("Loading model…");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const lm = await makeLandmarker(fileset);
        if (cancelled) return void lm.close();
        landmarkerRef.current = lm;

        setStatus("Requesting camera…");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return void stream.getTracks().forEach((t) => t.stop());

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setStatus("Tracking");
        loop();
      } catch (e: any) {
        console.error(e);
        if (e?.name === "NotReadableError") {
          setStatus("Camera is in use — close Discord/Zoom/Teams/other tabs, then reload");
        } else if (e?.name === "NotAllowedError") {
          setStatus("Camera blocked — allow it in the address bar, then reload");
        } else if (e?.name === "NotFoundError") {
          setStatus("No camera found on this device");
        } else {
          setStatus("Camera or model failed — check permissions + internet");
        }
      }
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lm = landmarkerRef.current;
      if (!video || !canvas || !lm) return;

      if (video.videoWidth && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      if (video.currentTime !== lastTime.current && video.videoWidth) {
        lastTime.current = video.currentTime;
        const res = lm.detectForVideo(video, performance.now());
        draw(res.landmarks?.[0] ?? null, canvas, video);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    function draw(
      pts: NormalizedLandmark[] | null,
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement
    ) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width, height } = canvas;
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1); // selfie mirror
      ctx.globalAlpha = 0.35;
      ctx.drawImage(video, 0, 0, width, height);
      ctx.globalAlpha = 1;
      if (pts && pts.length) {
        const u = new DrawingUtils(ctx);
        u.drawConnectors(pts, PoseLandmarker.POSE_CONNECTIONS, {
          color: "#34d399",
          lineWidth: 4,
        });
        u.drawLandmarks(pts, {
          color: "#a7f3d0",
          fillColor: "#10b981",
          radius: 4,
          lineWidth: 2,
        });
      }
      ctx.restore();
      try {
        if (pts && pts.length >= 13) score_(pts);
      } catch {
        /* ignore frames where geometry is incomplete */
      }
    }

    function score_(lm: NormalizedLandmark[]) {
      const le = lm[7], re = lm[8], ls = lm[11], rs = lm[12];
      const sw = Math.hypot(ls.x - rs.x, ls.y - rs.y) || 0.001;
      const neck = ((ls.y + rs.y) / 2 - (le.y + re.y) / 2) / sw;
      liveNeck.current = neck;
      if (calibrate.current) {
        baseline.current = neck;
        calibrate.current = false;
        setStatus("Baseline calibrated");
      }
      const base = baseline.current ?? 0.55;
      // Forward-neck slump is the real ergonomic signal. Ignore tiny deviations
      // (8% deadzone) and require a big drop before it saturates.
      const slump = clamp(((base - neck) / base - 0.08) / 0.5, 0, 1);
      // Head tilt & shoulder lean: generous deadzone so natural asymmetry and a
      // non-level webcam don't register as "drift", and a much gentler scale.
      const tilt = clamp((Math.abs(le.y - re.y) / sw - 0.08) / 0.5, 0, 1);
      const lean = clamp((Math.abs(ls.y - rs.y) / sw - 0.08) / 0.5, 0, 1);
      const penalty =
        (slump * 0.7 + tilt * 0.15 + lean * 0.15) * 100 * (sensRef.current / 50);
      const raw = clamp(100 - penalty, 0, 100);
      smoothed.current = smoothed.current * 0.8 + raw * 0.2;
      const s = Math.round(smoothed.current);
      let l = "Optimal Posture", c = "#34d399";
      if (s < 60) { l = "Correct Your Posture"; c = "#f87171"; }
      else if (s < 85) { l = "Minor Drift"; c = "#fbbf24"; }
      setScore(s); setLabel(l); setColor(c);
      setHistory((h) => [...h.slice(1), s]);
    }

    if (monitoring) start();
    else setStatus("Idle");

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      lastTime.current = -1;
    };
  }, [monitoring]);

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="ce-root">
      <style>{CSS}</style>

      <div className="ce-header">
        <div className="ce-logo">🧘</div>
        <div>
          <h1 className="ce-title">Creative Ergonomics</h1>
          <p className="ce-sub">Real-time pose-tracking companion</p>
        </div>
      </div>

      <div className="ce-grid">
        {/* LEFT */}
        <div className="ce-stack">
          <div className="ce-card">
            <p className="ce-label">Wellness Controls</p>
            <button
              className="ce-btn ce-btn-row"
              onClick={() => (calibrate.current = true)}
            >
              📷 Calibrate Base
            </button>
          </div>

          <div className="ce-card">
            <div className="ce-tune-head">
              <p className="ce-label">Monitor Tuning</p>
              <span className="ce-pct">{sensitivity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
            />
            <p className="ce-hint">
              Adjust how strictly the vision engine penalizes forward neck
              slumping and spinal drift.
            </p>
          </div>

          <button
            className={`ce-toggle ${monitoring ? "stop" : "start"}`}
            onClick={() => setMonitoring((m) => !m)}
          >
            {monitoring ? "Stop Monitoring" : "Start Monitoring"}
          </button>
        </div>

        {/* CENTER */}
        <div className="ce-stage">
          <div className="ce-badge">● {monitoring ? "Live Tracking" : "Idle"}</div>
          <div className="ce-screen">
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
            />
            <canvas ref={canvasRef} className="ce-canvas" />
            {!monitoring ? (
              <div className="ce-overlay">
                Press “Start Monitoring” to see your skeleton
              </div>
            ) : (
              status !== "Tracking" && <div className="ce-overlay">{status}</div>
            )}
            <div className="ce-status">{status}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="ce-stack">
          <div className="ce-card">
            <p className="ce-label" style={{ textAlign: "center" }}>
              Posture Integrity
            </p>
            <div className="ce-ring-wrap">
              <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={70} cy={70} r={R} fill="none"
                  stroke="rgba(255,255,255,.06)" strokeWidth={8} />
                <circle cx={70} cy={70} r={R} fill="none"
                  stroke={color} strokeWidth={8} strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C - C * (score / 100)}
                  style={{ transition: "stroke-dashoffset .3s, stroke .3s" }} />
              </svg>
              <div className="ce-ring-center">
                <div className="ce-ring-num">{score}</div>
                <div className="ce-ring-cap">Score</div>
              </div>
            </div>
            <p className="ce-ring-label" style={{ color }}>{label}</p>
          </div>

          <div className="ce-card">
            <p className="ce-label">Live Telemetry</p>
            <div className="ce-bars">
              {history.map((v, i) => (
                <div key={i} className="ce-bar"
                  style={{
                    height: `${Math.max(8, v)}%`,
                    backgroundColor: v < 60 ? "#f87171" : v < 85 ? "#fbbf24" : "#34d399",
                    opacity: 0.5 + (i / history.length) * 0.5,
                  }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

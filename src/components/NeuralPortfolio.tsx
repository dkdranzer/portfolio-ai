"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { profile, stages } from "@/content/profile";
import type { NeuralScene } from "@/lib/neuralScene";

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reveals text word by word, like tokens streaming from a model. */
function Stream({ text, run = true, speed = 28, className }: { text: string; run?: boolean; speed?: number; className?: string }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReduced()) { setN(words.length); return; }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(i);
      if (i >= words.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [words, run, speed]);
  const done = n >= words.length;
  return (
    <span className={className}>
      {words.slice(0, run ? n : words.length).join("")}
      {!done && run && <i className="caret" />}
      {/* keeps layout stable while streaming */}
      <span className="ghost" aria-hidden>{words.slice(run ? n : words.length).join("")}</span>
    </span>
  );
}

export default function NeuralPortfolio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [typed, setTyped] = useState("");
  const [answered, setAnswered] = useState(false);
  const [outputSeen, setOutputSeen] = useState(false);

  // prompt typing in the hero terminal
  useEffect(() => {
    const full = profile.prompt;
    if (prefersReduced()) { setTyped(full); setAnswered(true); return; }
    let i = 0;
    const start = setTimeout(function step() {
      i++;
      setTyped(full.slice(0, i));
      if (i < full.length) setTimeout(step, 55 + Math.random() * 45);
      else setTimeout(() => setAnswered(true), 350);
    }, 700);
    return () => clearTimeout(start);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = prefersReduced();
    const lenis = new Lenis({ lerp: reduce ? 1 : 0.085, smoothWheel: !reduce });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    let scene: NeuralScene | null = null;
    let cancelled = false;
    const els = stages.map((s) => document.getElementById(s.id)!);
    let anchors: number[] = [];
    const measure = () => {
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      anchors = els.map((el, i) => {
        if (i === 0) return 0;
        if (i === els.length - 1) return max;
        return Math.min(max, Math.max(0, el.offsetTop + el.offsetHeight / 2 - vh / 2));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    const onScroll = () => {
      const y = window.scrollY;
      let i = 0;
      while (i < anchors.length - 2 && y > anchors[i + 1]) i++;
      const a = anchors[i], b = anchors[i + 1];
      const k = b > a ? Math.min(1, Math.max(0, (y - a) / (b - a))) : 0;
      const p = (i + k) / (stages.length - 1);
      setProgress(p);
      const idx = k > 0.5 ? i + 1 : i;
      setActive(idx);
      if (idx === stages.length - 1) setOutputSeen(true);
      scene?.setProgress(p);
    };
    lenis.on("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    const onPointer = (e: PointerEvent) => scene?.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    window.addEventListener("pointermove", onPointer);

    const probe = document.createElement("canvas");
    if (probe.getContext("webgl2") || probe.getContext("webgl")) {
      Promise.all([import("@/lib/neuralScene"), document.fonts?.ready ?? Promise.resolve()]).then(([mod]) => {
        if (cancelled || !canvasRef.current) return;
        const low = innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;
        scene = mod.createNeuralScene(canvasRef.current, { quality: low ? "low" : "high" });
        onScroll();
        requestAnimationFrame(() => setReady(true));
      });
    } else setReady(true);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
      });
    });

    return () => {
      cancelled = true;
      ctx.revert();
      ro.disconnect();
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      scene?.dispose();
    };
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = id === "prompt" ? 0 : el.offsetTop + el.offsetHeight / 2 - innerHeight / 2;
    lenisRef.current?.scrollTo(top, { duration: 2 });
  };

  // fine-tuning: which epoch the descent has reached
  const ftLocal = Math.min(1, Math.max(0, (progress - 3.45 / 6) / (1 / 6)));
  const epochIdx = Math.min(profile.epochs.length - 1, Math.floor(ftLocal * profile.epochs.length));

  return (
    <>
      <div className="stage" aria-hidden>
        <canvas ref={canvasRef} />
        <div className="scanlines" />
        <div className="vignette" />
      </div>
      <div className={`loader ${ready ? "done" : ""}`}><span>loading weights…</span></div>

      <header className="topbar">
        <button className="logo" onClick={() => go("prompt")} aria-label="Back to top">DK</button>
        <p className="model mono">model: dinesh-kumar-g · <span>v2026.10</span></p>
        <a className="topcta" href={profile.resumeUrl} target="_blank" rel="noreferrer">Résumé ↗</a>
      </header>

      <nav className="pipeline" aria-label="Sections">
        {stages.map((s, i) => (
          <button key={s.id} className={i === active ? "on" : i < active ? "past" : ""} onClick={() => go(s.id)}>
            <span className="mono">{s.step}</span><em>{s.label}</em>
          </button>
        ))}
        <i className="pipeline-bar" style={{ transform: `scaleY(${progress})` }} />
      </nav>

      <main>
        {/* 00 · PROMPT */}
        <section id="prompt" className="sec hero">
          <div className="terminal">
            <div className="term-bar"><i /><i /><i /><span className="mono">inference — zsh</span></div>
            <p className="mono prompt-line">
              <span className="ps">dk@inference:~$</span> {typed}<i className={`caret ${answered ? "hide" : ""}`} />
            </p>
            <div className={`answer ${answered ? "in" : ""}`}>
              <h1 className="display">{profile.name}</h1>
              <p className="headline">{answered ? <Stream text={profile.headline} speed={40} /> : profile.headline}</p>
              <dl className="meta mono">
                <div><dt>role</dt><dd>{profile.role}</dd></div>
                <div><dt>location</dt><dd>{profile.location}</dd></div>
                <div><dt>status</dt><dd className="ok">open to AI engineering roles</dd></div>
              </dl>
            </div>
          </div>
          <button className="run mono" onClick={() => go("embed")}>scroll to run inference ↓</button>
        </section>

        {/* 01 · EMBEDDING + temperature */}
        <section id="embed" className="sec left">
          <About />
        </section>

        {/* 02 · NETWORK + attention */}
        <section id="network" className="sec center tall">
          <Attention />
        </section>

        {/* 03 · LEARNING (brain) */}
        <section id="data" className="sec right">
          <div className="card" data-reveal>
            <p className="kicker mono">03 · Training data</p>
            <h2 className="display">Where the weights were learned.</h2>
            <div className="edu">
              <div>
                <p className="edu-degree">{profile.education.degree}</p>
                <p className="muted">{profile.education.school} · {profile.education.period}</p>
              </div>
              <div className="gpa"><b className="display">{profile.education.score}</b><span className="mono">CGPA</span></div>
            </div>
            <table className="datasets mono">
              <thead><tr><th>dataset</th><th>contents</th></tr></thead>
              <tbody>{profile.datasets.map((d) => <tr key={d.name}><td>{d.name}</td><td>{d.size}</td></tr>)}</tbody>
            </table>
            <h4 className="mono">certifications</h4>
            <ul className="certs">{profile.certifications.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </section>

        {/* 04 · FINE-TUNING */}
        <section id="finetune" className="sec left tall">
          <div className="card wide" data-reveal>
            <p className="kicker mono">04 · Fine-tuning</p>
            <h2 className="display">Every role lowers the loss.</h2>
            <LossChart active={epochIdx} />
            <ol className="epochs">
              {profile.epochs.map((e, i) => (
                <li key={e.title} className={i === epochIdx ? "on" : i < epochIdx ? "past" : ""}>
                  <header>
                    <span className="mono">epoch {e.epoch}/{profile.epochs.length} · loss {e.loss.toFixed(2)}</span>
                    <span className="mono period">{e.period}</span>
                  </header>
                  <h3>{e.title}</h3>
                  <p className="muted">{e.org}</p>
                  <ul>{e.points.map((p) => <li key={p}>{p}</li>)}</ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 05 · CORE + hologram projects */}
        <section id="core" className="sec core">
          <div className="core-head" data-reveal>
            <p className="kicker mono">05 · Core</p>
            <h2 className="display">Projects, projected.</h2>
          </div>
          <div className="holo-grid">
            {profile.projects.map((p, i) => (
              <article key={p.id} className={`holo ${i % 2 ? "r" : "l"}`} data-reveal>
                <p className="mono tag">PROJECT_{String(i + 1).padStart(2, "0")} · {p.kind}</p>
                <h3>{p.title}</h3>
                <p>{p.blurb}</p>
                <p className="mono uses">{p.uses.map((u) => profile.skills.find((s) => s.id === u)?.name).filter(Boolean).join(" · ")}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 06 · OUTPUT */}
        <section id="output" className="sec center end">
          <div className="card output" data-reveal>
            <p className="kicker mono">06 · Output</p>
            <p className="mono prompt-line small"><span className="ps">&gt;</span> {profile.prompt}</p>
            <p className="out-text">
              <Stream run={outputSeen} speed={30} text={`${profile.name} is an AI engineer in ${profile.location.split(",")[0]} who builds multi-agent systems that hold up in production. He is open to AI engineering roles. The best way to reach him is below.`} />
            </p>
            <EmailRow />
            <div className="actions">
              <a className="btn primary" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
              <a className="btn" href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a>
              <a className="btn" href={profile.resumeUrl} target="_blank" rel="noreferrer">Résumé ↗</a>
            </div>
            <p className="foot mono">© {new Date().getFullYear()} {profile.name} · end of sequence</p>
          </div>
        </section>
      </main>
    </>
  );
}

function About() {
  const [temp, setTemp] = useState(0.6);
  const idx = temp <= 0.33 ? 0 : temp <= 0.75 ? 1 : 2;
  const bio = profile.bios[idx];
  return (
    <div className="card" data-reveal>
      <p className="kicker mono">01 · Embedding</p>
      <h2 className="display">Who I am, as a vector.</h2>
      <div className="temp">
        <label htmlFor="temperature" className="mono">temperature <b>{temp.toFixed(1)}</b></label>
        <input id="temperature" type="range" min={0} max={1} step={0.1} value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} />
        <div className="temp-scale mono"><span>factual</span><span>{bio.label}</span><span>personal</span></div>
      </div>
      <p className="bio"><Stream key={idx} text={bio.text} speed={22} /></p>
      <div className="stats">
        {profile.stats.map((s) => <div key={s.label}><b className="display">{s.value}</b><span>{s.label}</span></div>)}
      </div>
    </div>
  );
}

function Attention() {
  const [skill, setSkill] = useState("langgraph");
  const wrapRef = useRef<HTMLDivElement>(null);
  const skillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const projRefs = useRef<Record<string, HTMLElement | null>>({});
  const [paths, setPaths] = useState<{ d: string; w: number; id: string }[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // attention weights: softmax-like over projects that use the skill
  const weights = useMemo(() => {
    const raw = profile.projects.map((p) => (p.uses.includes(skill) ? 1 + (p.uses.length - p.uses.indexOf(skill)) * 0.15 : 0.05));
    const sum = raw.reduce((a, b) => a + b, 0);
    return Object.fromEntries(profile.projects.map((p, i) => [p.id, raw[i] / sum]));
  }, [skill]);

  const draw = useCallback(() => {
    const wrap = wrapRef.current, s = skillRefs.current[skill];
    if (!wrap || !s) return;
    const wr = wrap.getBoundingClientRect();
    setBox({ w: wr.width, h: wr.height });
    const sr = s.getBoundingClientRect();
    const stacked = getComputedStyle(wrap).getPropertyValue("--stacked").trim() === "1";
    const out: { d: string; w: number; id: string }[] = [];
    for (const p of profile.projects) {
      const el = projRefs.current[p.id];
      if (!el) continue;
      const pr = el.getBoundingClientRect();
      let d: string;
      if (stacked) {
        const x1 = sr.left + sr.width / 2 - wr.left, y1 = sr.bottom - wr.top;
        const x2 = pr.left + 18 - wr.left, y2 = pr.top + pr.height / 2 - wr.top;
        d = `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2 - 40},${y2} ${x2},${y2}`;
      } else {
        const col = s.parentElement!.getBoundingClientRect();
        const x1 = col.right + 6 - wr.left, y1 = sr.top + sr.height / 2 - wr.top;
        const x2 = pr.left - wr.left, y2 = pr.top + pr.height / 2 - wr.top;
        const mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      }
      out.push({ d, w: weights[p.id], id: p.id });
    }
    setPaths(out);
  }, [skill, weights]);

  useLayoutEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", draw);
    return () => { ro.disconnect(); window.removeEventListener("resize", draw); };
  }, [draw]);

  return (
    <div className="card attention" data-reveal>
      <p className="kicker mono">02 · Attention</p>
      <h2 className="display">Hover a skill. Watch where it attends.</h2>
      <div className="attn" ref={wrapRef}>
        <svg className="attn-lines" width={box.w} height={box.h} aria-hidden>
          <defs>
            <linearGradient id="attnGrad" x1="0" x2="1">
              <stop offset="0" stopColor="var(--cyan)" />
              <stop offset="1" stopColor="var(--amber)" />
            </linearGradient>
          </defs>
          {paths.map((p) => (
            <path key={p.id + skill} d={p.d} stroke="url(#attnGrad)" strokeWidth={0.6 + p.w * 9} strokeOpacity={0.12 + p.w * 2.2} fill="none" className="attn-path" />
          ))}
        </svg>
        <div className="attn-skills" role="list">
          {profile.skills.map((s) => (
            <button
              key={s.id}
              ref={(el) => { skillRefs.current[s.id] = el; }}
              className={s.id === skill ? "on" : ""}
              style={{ ["--w" as string]: s.w }}
              onMouseEnter={() => setSkill(s.id)}
              onFocus={() => setSkill(s.id)}
              onClick={() => setSkill(s.id)}
              aria-pressed={s.id === skill}
            >
              {s.name}
            </button>
          ))}
        </div>
        <ul className="attn-projects">
          {profile.projects.map((p) => {
            const w = weights[p.id];
            const hit = p.uses.includes(skill);
            return (
              <li key={p.id} ref={(el) => { projRefs.current[p.id] = el; }} className={hit ? "hit" : ""}>
                <span className="mono attn-w">{w.toFixed(2)}</span>
                <span className="attn-title">{p.title}</span>
                <i className="attn-bar" style={{ width: `${Math.round(w * 100)}%` }} />
              </li>
            );
          })}
        </ul>
      </div>
      <dl className="toolkit">
        {profile.toolkit.map((t) => (
          <div key={t.group}><dt className="mono">{t.group}</dt><dd>{t.items}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function LossChart({ active }: { active: number }) {
  const W = 520, H = 170, pad = 30;
  const pts = profile.epochs.map((e, i) => ({
    x: pad + (i / (profile.epochs.length - 1)) * (W - pad * 2),
    y: pad / 2 + (1 - e.loss) * 0 + e.loss * (H - pad * 1.5),
  }));
  // smooth curve through the points
  const d = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(" ");
  return (
    <div className="loss">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Loss falls from 0.92 to 0.17 across four epochs">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={pad / 2 + g * (H - pad * 1.5)} y2={pad / 2 + g * (H - pad * 1.5)} className="grid" />
        ))}
        <path d={`${d} L${pts[pts.length - 1].x},${H - pad / 2} L${pts[0].x},${H - pad / 2} Z`} className="area" />
        <path d={d} className="curve" />
        {pts.map((p, i) => (
          <g key={i} className={i === active ? "pt on" : i < active ? "pt past" : "pt"}>
            <circle cx={p.x} cy={p.y} r={i === active ? 7 : 4.5} />
            <text x={p.x} y={H - 4} textAnchor="middle">e{i + 1}</text>
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="val">{profile.epochs[i].loss.toFixed(2)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function EmailRow() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(profile.email); }
    catch {
      const el = document.getElementById("out-email");
      if (el) { const r = document.createRange(); r.selectNodeContents(el); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="email-row">
      <a id="out-email" className="email mono" href={`mailto:${profile.email}`}>{profile.email}</a>
      <button type="button" className="copy mono" onClick={copy}>{copied ? "copied" : "copy"}</button>
    </div>
  );
}

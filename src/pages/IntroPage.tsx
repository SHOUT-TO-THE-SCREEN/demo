import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import ExperienceCanvas from "../components/canvas/ExperienceCanvas";
import "./IntroPage.css";

gsap.registerPlugin(ScrollTrigger);

export default function IntroPage() {
  const nav = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // ===== Typewriter =====
  const FULL_TITLE = "소리를\n화면 위의 감각으로";
  const [typedTitle, setTypedTitle] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  const quotes = useMemo(
    () => [
      "소리는 사라지지만, 흔적은 남는다.",
      "보이는 것은 이해를 가속한다.",
      "Less UI. More experience.",
    ],
    [],
  );

  useEffect(() => {
    // Reduce motion 고려: OS 설정이 reduce면 즉시 전체 출력
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setTypedTitle(FULL_TITLE);
      setTypingDone(true);
      return;
    }

    let i = 0;
    setTypedTitle("");
    setTypingDone(false);

    const tick = () => {
      i += 1;
      setTypedTitle(FULL_TITLE.slice(0, i));
      if (i >= FULL_TITLE.length) {
        setTypingDone(true);
        clearInterval(timer);
      }
    };

    const timer = window.setInterval(tick, 48);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // ===== Strong cinematic section reveal =====
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(".cineSection"),
    );

    sections.forEach((sec) => {
      const shouldAnimate = sec.hasAttribute("data-reveal");
      if (!shouldAnimate) return;

      // 섹션 전체 대신 container를 움직이면 텍스트/카드가 한 덩어리로 "컷"처럼 올라옴
      const panel = (sec.querySelector(".container") as HTMLElement) || sec;

      // 섹션 안의 카드들(steps, miniCard 등)은 살짝 늦게 따라오게 하면 더 시네마틱
      const children = Array.from(
        panel.querySelectorAll<HTMLElement>(".tiltCard, .stepCard, .miniCard"),
      );

      // 1) 패널: 아래에서 크게 치고 올라오면서 살짝 튕김
      gsap.fromTo(
        panel,
        {
          opacity: 0,
          y: 140,
          scale: 0.965,
          rotateX: 6, // 아주 약한 “장면 기울기”
          transformPerspective: 900,
          transformOrigin: "50% 80%",
          filter: "blur(18px)",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          filter: "blur(0px)",
          duration: 1.25,
          ease: "back.out(1.25)",
          scrollTrigger: {
            trigger: sec,
            start: "top 88%", // 더 아래에서 시작 → “치고 올라오는” 체감 증가
            end: "top 55%",
            toggleActions: "play none none reverse",
          },
        },
      );

      // 2) 카드/요소: 패널보다 약간 늦게 올라오며 정렬(시퀀스감)
      if (children.length) {
        gsap.fromTo(
          children,
          { opacity: 0, y: 26, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.75,
            ease: "power3.out",
            stagger: 0.06,
            scrollTrigger: {
              trigger: sec,
              start: "top 78%",
              toggleActions: "play none none reverse",
            },
          },
        );
      }
    });

    // ===== Hero sequential reveal (except typed title, which types itself) =====
    const hero = root.querySelector("[data-hero]") as HTMLElement | null;
    if (hero) {
      const tl = gsap.timeline();
      const eyebrow = hero.querySelector('[data-typo="eyebrow"]');
      const lead = hero.querySelector('[data-typo="lead"]');
      const cta = hero.querySelector('[data-typo="cta"]');
      const meta = hero.querySelector('[data-typo="meta"]');

      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 10, filter: "blur(10px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "power2.out",
        },
      )
        .fromTo(
          lead,
          { opacity: 0, y: 12, filter: "blur(12px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.85,
            ease: "power2.out",
          },
          "-=0.35",
        )
        .fromTo(
          cta,
          { opacity: 0, y: 10, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.7,
            ease: "power2.out",
          },
          "-=0.45",
        )
        .fromTo(
          meta,
          { opacity: 0, y: 8, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.65,
            ease: "power2.out",
          },
          "-=0.4",
        );
    }

    // ===== Gradient blobs parallax =====
    const blobs = root.querySelectorAll(".gradBlob");
    blobs.forEach((b, idx) => {
      gsap.to(b, {
        y: idx % 2 === 0 ? 220 : -180,
        x: idx % 2 === 0 ? -140 : 160,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });
    });

    // ===== Hero glow breathing =====
    const heroGlow = root.querySelector(".heroGlow");
    if (heroGlow) {
      gsap.to(heroGlow, {
        opacity: 0.55,
        duration: 2.8,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    }

    // ===== Mouse position -> global gradient response =====
    const onMove = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const px = `${Math.max(0, Math.min(1, x)) * 100}%`;
      const py = `${Math.max(0, Math.min(1, y)) * 100}%`;
      root.style.setProperty("--px", px);
      root.style.setProperty("--py", py);
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // ===== Subtle 3D tilt + specular highlight for cards =====
    const tiltCards = Array.from(
      root.querySelectorAll<HTMLElement>(".tiltCard"),
    );
    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));

    const attachTilt = (el: HTMLElement) => {
      const handleMove = (ev: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const relX = (ev.clientX - r.left) / r.width; // 0..1
        const relY = (ev.clientY - r.top) / r.height; // 0..1

        // 아주 약하게: 최대 4deg
        const ry = clamp((relX - 0.5) * 8, -4, 4);
        const rx = clamp(-(relY - 0.5) * 8, -4, 4);

        el.style.setProperty("--rx", `${rx}deg`);
        el.style.setProperty("--ry", `${ry}deg`);
        el.style.setProperty("--mx", `${relX * 100}%`);
        el.style.setProperty("--my", `${relY * 100}%`);
        el.classList.add("isTilting");
      };

      const handleLeave = () => {
        el.classList.remove("isTilting");
        el.style.setProperty("--rx", `0deg`);
        el.style.setProperty("--ry", `0deg`);
        el.style.setProperty("--mx", `50%`);
        el.style.setProperty("--my", `35%`);
      };

      el.addEventListener("mousemove", handleMove, { passive: true });
      el.addEventListener("mouseleave", handleLeave, { passive: true });

      // cleanup references
      (el as any).__tiltMove = handleMove;
      (el as any).__tiltLeave = handleLeave;
    };

    tiltCards.forEach(attachTilt);

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      window.removeEventListener("mousemove", onMove);

      tiltCards.forEach((el) => {
        const mv = (el as any).__tiltMove as
          | ((e: MouseEvent) => void)
          | undefined;
        const lv = (el as any).__tiltLeave as (() => void) | undefined;
        if (mv) el.removeEventListener("mousemove", mv);
        if (lv) el.removeEventListener("mouseleave", lv);
      });
    };
  }, []);

  // 줄바꿈 렌더링(타이핑에 \n 포함)
  const titleLines = typedTitle.split("\n");

  return (
    <div ref={rootRef} className="introCine">
      <div className="introCine__bg">
        <ExperienceCanvas />
      </div>

      <div className="introCine__gradients" aria-hidden>
        <div className="gradBlob blobA" />
        <div className="gradBlob blobB" />
        <div className="gradBlob blobC" />
      </div>

      <div className="introCine__film" aria-hidden>
        <div className="filmVignette" />
        <div className="filmGrain" />
        <div className="filmSweep" />
      </div>

      <main className="introCine__content">
        {/* HERO */}
        <section className="cineSection hero" data-hero>
          <div className="heroGlow" aria-hidden />
          <div className="container">
            <div className="hero__eyebrow" data-typo="eyebrow">
              AUDIO × WEBGL · DESKTOP-FIRST · LOCAL-ONLY
            </div>

            <h1
              className="hero__title hero__titleTyped"
              aria-label="소리를 화면 위의 감각으로"
            >
              <span className="typedBlock">
                <span className="typedLine">{titleLines[0] ?? ""}</span>
                <span className="typedLine">{titleLines[1] ?? ""}</span>
                <span className={`typedCaret ${typingDone ? "isOff" : ""}`} />
              </span>
            </h1>

            <p className="hero__lead" data-typo="lead">
              로그인 없이, 브라우저 로컬에서만 저장되는 오디오 시각화 실험실.
              <br />
              TouchDesigner 감성을 웹에서 재해석합니다.
            </p>

            <div className="hero__cta" data-typo="cta">
              <button className="btnPrimary" onClick={() => nav("/visualizer")}>
                Start Visualizing
              </button>
              <button
                className="btnGhost"
                onClick={() =>
                  document
                    .querySelector("#how")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                How it works
              </button>
            </div>

            <div className="hero__meta" data-typo="meta">
              <span>• Local save</span>
              <span>• Mic/File</span>
              <span>• Cinematic UI</span>
            </div>
          </div>
        </section>

        <div className="cineDivider" aria-hidden />

        {/* PURPOSE */}
        <section className="cineSection" data-reveal>
          <div className="container grid2">
            <h2 className="h2">Purpose</h2>
            <div className="body">
              <p>
                이 웹사이트의 목적은 <b>소리의 구조를 ‘형태’로 경험</b>하게
                만드는 것입니다. 파형이 아니라, 움직임·질감·리듬을 통해 “이해
                가능한 감각”으로 바꿉니다.
              </p>
              <ul className="bullets">
                <li>오디오 입력(마이크/파일)을 시각적 오브젝트로 변환</li>
                <li>파라미터 조절로 장면의 성격을 설계</li>
                <li>설정은 브라우저 로컬에 저장(비로그인)</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="cineDivider" aria-hidden />

        {/* HOW TO */}
        <section id="how" className="cineSection" data-reveal>
          <div className="container">
            <h2 className="h2">How to use</h2>

            {/* 타임라인/시퀀스 */}
            <div className="stepsTimeline">
              <div className="steps">
                <div className="stepCard tiltCard">
                  <div className="stepNum">01</div>
                  <div className="stepTitle">Input</div>
                  <div className="stepDesc">
                    Mic 권한을 허용하거나 오디오 파일을 업로드합니다.
                  </div>
                </div>

                <div className="stepCard tiltCard">
                  <div className="stepNum">02</div>
                  <div className="stepTitle">Shape</div>
                  <div className="stepDesc">
                    스펙트럼/에너지에 반응하는 오브젝트를 관찰합니다.
                  </div>
                </div>

                <div className="stepCard tiltCard">
                  <div className="stepNum">03</div>
                  <div className="stepTitle">Save</div>
                  <div className="stepDesc">
                    프리셋/세팅은 로컬에 저장됩니다(로그인 불필요).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="cineDivider" aria-hidden />

        {/* USE CASES */}
        <section className="cineSection" data-reveal>
          <div className="container grid2">
            <h2 className="h2">Use cases</h2>
            <div className="cards">
              <div className="miniCard tiltCard">
                <div className="miniTitle">Portfolio</div>
                <div className="miniDesc">
                  시네마틱 인터랙션 + WebGL 기반 작업물로 제출
                </div>
              </div>
              <div className="miniCard tiltCard">
                <div className="miniTitle">Exhibition</div>
                <div className="miniDesc">
                  전시/부스에서 마이크 입력으로 즉석 체험
                </div>
              </div>
              <div className="miniCard tiltCard">
                <div className="miniTitle">Live</div>
                <div className="miniDesc">
                  음악 재생과 동기화된 시각 퍼포먼스
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="cineDivider" aria-hidden />

        {/* QUOTE */}
        <section className="cineSection quote" data-reveal>
          <div className="container quoteBox tiltCard">
            <div className="quoteMark">“</div>
            <div className="quoteText">{quotes[0]}</div>
            <div className="quoteSub">{quotes[2]}</div>

            <div className="quoteCta">
              <button className="btnPrimary" onClick={() => nav("/visualizer")}>
                Start now
              </button>
            </div>
          </div>
        </section>

        <div className="cineDivider" aria-hidden />

        {/* FOOTER */}
        <footer className="cineFooter" data-reveal>
          <div className="container footerRow">
            <div className="footLeft">
              Local-only · Desktop-first · No login
            </div>
            <div className="footRight">© Audio Visualizer</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

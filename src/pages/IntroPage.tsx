import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import ExperienceCanvas from "../components/canvas/ExperienceCanvas";
import "./IntroPage.css";

gsap.registerPlugin(ScrollTrigger);

export default function IntroPage() {
  const nav = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const quotes = useMemo(
    () => [
      "소리는 사라지지만, 흔적은 남는다.",
      "보이는 것은 이해를 가속한다.",
      "Less UI. More experience.",
    ],
    []
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // 섹션 등장(시네마틱: 부드러운 페이드 + 살짝 올라옴)
    const targets = root.querySelectorAll("[data-reveal]");
    targets.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 18, filter: "blur(10px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 78%",
          },
        }
      );
    });

    // Hero 카피는 즉시 등장
    // Hero 타이포: 순차 리빌 (gallery-like)
const hero = root.querySelector("[data-hero]") as HTMLElement | null;
if (hero) {
  const tl = gsap.timeline();

  const eyebrow = hero.querySelector('[data-typo="eyebrow"]');
  const title   = hero.querySelector('[data-typo="title"]');
  const lead    = hero.querySelector('[data-typo="lead"]');
  const cta     = hero.querySelector('[data-typo="cta"]');
  const meta    = hero.querySelector('[data-typo="meta"]');

  tl.fromTo(
    eyebrow,
    { opacity: 0, y: 10, filter: "blur(10px)" },
    { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out" }
  )
    .fromTo(
      title,
      { opacity: 0, y: 14, filter: "blur(14px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.95, ease: "power2.out" },
      "-=0.2"
    )
    .fromTo(
      lead,
      { opacity: 0, y: 12, filter: "blur(10px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.85, ease: "power2.out" },
      "-=0.55"
    )
    .fromTo(
      cta,
      { opacity: 0, y: 10, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out" },
      "-=0.45"
    )
    .fromTo(
      meta,
      { opacity: 0, y: 8, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.65, ease: "power2.out" },
      "-=0.4"
    );
}


    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div ref={rootRef} className="introCine">
      {/* Back layer: WebGL (은은하게만) */}
      <div className="introCine__bg">
        <ExperienceCanvas />
      </div>
      <div className="introCine__logoBg" aria-hidden></div>
      {/* Film look (DOM overlay) */}
      <div className="introCine__film" aria-hidden>
  <div className="filmVignette" />
  <div className="filmGrain" />
  <div className="filmSweep" />
</div>

      {/* Content */}
      <main className="introCine__content">
        {/* HERO */}
        <section className="cineSection hero" data-hero>
          <div className="container">
            <div className="hero__eyebrow" data-typo="eyebrow">
              AUDIO × WEBGL · DESKTOP-FIRST · LOCAL-ONLY
            </div>

            <h1 className="hero__title" data-typo="title">
              소리를
              <br />
              화면 위의 감각으로
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

        {/* HOW TO */}
        <section id="how" className="cineSection" data-reveal>
          <div className="container">
            <h2 className="h2">How to use</h2>
            <div className="steps">
              <div className="stepCard">
                <div className="stepNum">01</div>
                <div className="stepTitle">Input</div>
                <div className="stepDesc">
                  Mic 권한을 허용하거나 오디오 파일을 업로드합니다.
                </div>
              </div>
              <div className="stepCard">
                <div className="stepNum">02</div>
                <div className="stepTitle">Shape</div>
                <div className="stepDesc">
                  스펙트럼/에너지에 반응하는 오브젝트를 관찰합니다.
                </div>
              </div>
              <div className="stepCard">
                <div className="stepNum">03</div>
                <div className="stepTitle">Save</div>
                <div className="stepDesc">
                  프리셋/세팅은 로컬에 저장됩니다(로그인 불필요).
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="cineSection" data-reveal>
          <div className="container grid2">
            <h2 className="h2">Use cases</h2>
            <div className="cards">
              <div className="miniCard">
                <div className="miniTitle">Portfolio</div>
                <div className="miniDesc">
                  시네마틱 인터랙션 + WebGL 기반 작업물로 제출
                </div>
              </div>
              <div className="miniCard">
                <div className="miniTitle">Exhibition</div>
                <div className="miniDesc">
                  전시/부스에서 마이크 입력으로 즉석 체험
                </div>
              </div>
              <div className="miniCard">
                <div className="miniTitle">Live</div>
                <div className="miniDesc">
                  음악 재생과 동기화된 시각 퍼포먼스
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className="cineSection quote" data-reveal>
          <div className="container quoteBox">
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

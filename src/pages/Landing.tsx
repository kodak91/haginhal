import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

interface Props {
  onStart: () => void;
}

/* ── Scroll reveal ─────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: 'translateY(28px)',
        transition: `opacity 0.65s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.65s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── App card demo ─────────────────────────────────────────────── */
function DemoCard() {
  return (
    <div style={{ border: '2px solid #1A1A1A', borderRadius: 16, background: 'white', overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
      {/* progress bar */}
      <div style={{ height: 4, background: '#F2F2F2' }}>
        <div style={{ height: '100%', width: '33%', background: '#46E08A', transition: 'width 1s ease' }} />
      </div>
      <div style={{ padding: '16px 18px 6px' }}>
        <span style={{ fontSize: 11, color: '#9A9A9A' }}>밖 · 오후 · 90분 · 보통</span>
      </div>
      <div style={{ padding: '0 18px 12px' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>오늘 외출 준비하기</h3>
        <p style={{ fontSize: 12, color: '#9A9A9A', margin: 0 }}>1/3 단계 완료</p>
      </div>
      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { text: '빨래 세탁기에 예약 돌리기', done: true, min: 2 },
          { text: '장바구니 챙기기', done: false, min: 5 },
          { text: '도서관 반납할 책 꺼내기', done: false, min: 3 },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `2px solid ${s.done ? '#1A1A1A' : '#D0D0D0'}`,
              background: s.done ? '#1A1A1A' : 'transparent',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.done && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{
              flex: 1, fontSize: 13, fontWeight: 500,
              color: s.done ? '#9A9A9A' : '#1A1A1A',
              textDecoration: s.done ? 'line-through' : 'none',
            }}>{s.text}</span>
            <span style={{ fontSize: 11, color: '#C0C0C0', flexShrink: 0 }}>{s.min}분</span>
          </div>
        ))}
      </div>
      {/* footer */}
      <div style={{ borderTop: '1px solid #F2F2F2', padding: '12px 18px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: '#1A1A1A', borderRadius: 999, padding: '10px 0', textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>완료</div>
        <div style={{ width: 44, height: 44, border: '2px solid #1A1A1A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="#1A1A1A"><polygon points="3,1 11,6 3,11"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ── Feature card ─────────────────────────────────────────────── */
function FeatureCard({ tag, title, body, screenshot, screenshotAlt }: {
  tag: string;
  title: string;
  body: string;
  screenshot?: string;
  screenshotAlt?: string;
}) {
  return (
    <div style={{
      border: '2px solid #1A1A1A',
      borderRadius: 20,
      background: 'white',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '24px 22px', borderBottom: screenshot ? '2px solid #F2F2F2' : 'none' }}>
        <span style={{
          display: 'inline-block', background: '#46E08A', color: '#1A1A1A',
          fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', marginBottom: 12,
        }}>{tag}</span>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#5A5A5A', margin: 0, lineHeight: 1.75 }}>{body}</p>
      </div>
      {screenshot && (
        <div style={{ background: '#F2F2F2', display: 'flex', justifyContent: 'center', padding: '24px 24px 0', overflow: 'hidden' }}>
          <img
            src={screenshot}
            alt={screenshotAlt}
            style={{
              width: 200,
              borderRadius: '16px 16px 0 0',
              border: '2px solid #1A1A1A',
              borderBottom: 'none',
              display: 'block',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Stat row (needs own component for hook rules) ─────────────── */
function StatRow({ num, label, delay, border }: {
  num: string;
  label: string;
  delay: number;
  border: boolean;
}) {
  return (
    <Reveal delay={delay}>
      <div style={{
        borderBottom: border ? '1px solid #2A2A2A' : 'none',
        padding: '28px 0',
      }}>
        <p style={{ fontSize: 'clamp(48px, 14vw, 72px)', fontWeight: 900, color: '#46E08A', margin: '0 0 4px', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {num}
        </p>
        <p style={{ fontSize: 14, color: '#6A6A6A', margin: 0, fontWeight: 500 }}>{label}</p>
      </div>
    </Reveal>
  );
}

/* ── Main ──────────────────────────────────────────────────────── */
export function Landing({ onStart }: Props) {
  return (
    <div style={{ fontFamily: "'Pretendard', sans-serif", background: '#F2F2F2', overflowX: 'hidden' }}>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section style={{ background: '#1A1A1A', minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '28px 24px 0', position: 'relative', overflow: 'hidden' }}>

        {/* nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/haginhal_logo.png" alt="하긴할거야" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span style={{ color: '#6A6A6A', fontSize: 13, fontWeight: 600 }}>하긴할거야진짜로</span>
        </div>

        {/* headline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 40, paddingBottom: 20 }}>
          <p style={{
            fontSize: 'clamp(56px, 16vw, 88px)', fontWeight: 900, color: 'white',
            lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 4px',
            animation: 'heroIn 0.8s cubic-bezier(.16,1,.3,1) both',
          }}>
            하긴할거야.
          </p>
          <p style={{
            fontSize: 'clamp(56px, 16vw, 88px)', fontWeight: 900, color: '#46E08A',
            lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 36px 6px',
            animation: 'heroIn 0.8s cubic-bezier(.16,1,.3,1) 0.12s both',
          }}>
            진짜로.
          </p>

          <p style={{
            color: '#5A5A5A', fontSize: 13, lineHeight: 1.8, maxWidth: 300,
            fontStyle: 'italic', marginBottom: 36, wordBreak: 'keep-all',
            animation: 'heroIn 0.8s cubic-bezier(.16,1,.3,1) 0.28s both',
          }}>
            아니 내가 안하려고 그랬던 게 아니라. 이거 먼저 하고 싶어서 그래. 그러다가 나중에 안한다고? 아니 한다니까? 관리가 왜 필요해. 나 알아서 잘하고 있다니까. 그런 거 귀찮아서 안써. 진짜로.
          </p>

          <button
            onClick={onStart}
            style={{
              alignSelf: 'flex-start',
              background: '#46E08A', color: '#1A1A1A',
              border: 'none', borderRadius: 999,
              padding: '15px 32px', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
              animation: 'heroIn 0.8s cubic-bezier(.16,1,.3,1) 0.42s both',
            }}
          >
            시작해보기 →
          </button>
        </div>

        {/* phone mockup */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          animation: 'heroIn 1s cubic-bezier(.16,1,.3,1) 0.55s both',
        }}>
          <div style={{
            width: 210,
            border: '2px solid #2A2A2A',
            borderRadius: '28px 28px 0 0',
            borderBottom: 'none',
            overflow: 'hidden',
            boxShadow: '0 -24px 60px rgba(70,224,138,0.12)',
            WebkitMask: 'linear-gradient(to bottom, black 55%, transparent 100%)',
            mask: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          }}>
            <img
              src="/app_screenshot/KakaoTalk_20260531_130354844_04.jpg"
              alt="앱 화면"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* ── PAIN ────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 22px 56px' }}>

        <Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 48 }}>
            {[
              '어디 나갈 때 꼭 놓고 가는 물건이 있다.',
              '뭐 사려고 왔는데 뭘 살지 까먹었다.',
              '중요한 일은 있었는데 당장 하기 싫어 미뤘다.',
              '투두앱도 7개 깔아봤다. 쓰기가 귀찮다.',
            ].map((text, i) => (
              <div key={i} style={{
                border: '2px solid #1A1A1A', borderRadius: 14, background: 'white',
                padding: '14px 18px', fontSize: 15, fontWeight: 600, color: '#1A1A1A',
                letterSpacing: '-0.01em',
              }}>
                {text}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 6, letterSpacing: '-0.02em' }}>
            그런 분들 있죠?
          </p>
          <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.7, marginBottom: 36, wordBreak: 'keep-all' }}>
            덜렁덜렁한 나를 누가 관리라도 해줬으면 좋겠는데<br />
            일일이 작성하고 분류하긴 귀찮아.
          </p>
        </Reveal>

        {/* speech bubble → card */}
        <Reveal delay={150}>
          <div style={{ marginBottom: 16 }}>
            {/* speech bubble */}
            <div style={{
              border: '2px solid #1A1A1A', borderRadius: '20px 20px 20px 4px',
              background: 'white', padding: '16px 18px', marginBottom: 12,
              fontSize: 14, color: '#1A1A1A', lineHeight: 1.7, wordBreak: 'keep-all',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, background: '#46E08A', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Mic size={14} strokeWidth={2} color="#1A1A1A" />
                </div>
                <span style={{ fontSize: 11, color: '#9A9A9A', fontWeight: 500 }}>듣는 중 — 손 떼면 완료</span>
              </div>
              <em style={{ fontStyle: 'normal', color: '#3A3A3A' }}>
                "오늘 나가기전에 빨래 예약해놓고 장바구니 챙겨서 장본 다음에 도서관 가서 책 반납하고 약국 갔다가 집 와서 잔업 좀 해야지"
              </em>
            </div>

            {/* arrow */}
            <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 22, color: '#46E08A' }}>↓</div>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9A9A9A', margin: '0 0 12px' }}>AI가 정리한 할 일</p>

            <DemoCard />
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ marginTop: 20, padding: '16px 18px', background: '#1A1A1A', borderRadius: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>✦</span>
            <p style={{ color: '#9A9A9A', fontSize: 13, lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>
              마음에 안 드는 부분도{' '}
              <span style={{ color: '#46E08A', fontWeight: 700 }}>음성으로 말만 하면</span>{' '}
              고칠 수 있어요.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── DIVIDER ─────────────────────────────────────────────── */}
      <div style={{ height: 2, background: '#1A1A1A', margin: '0 22px' }} />

      {/* ── WHY: 3 FEATURES ─────────────────────────────────────── */}
      <section style={{ padding: '64px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Reveal>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#9A9A9A', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
            왜 이렇게 만들었을까요
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em', margin: '0 0 24px', lineHeight: 1.2 }}>
            ADHD 재질의<br />동반자를 위해서요.
          </h2>
        </Reveal>

        <Reveal>
          <FeatureCard
            tag="지금 할 거 딱 하나"
            title="목록이 많으면 의욕이 사라져요"
            body="목록이 여러 개 있고 순서가 복잡해 보이면 시작도 전에 지쳐요. 그래서 지금 해야 하는 거 딱 하나만 보여줘요. 나머지는 안 보여요."
            screenshot="/app_screenshot/KakaoTalk_20260531_130354844_02.jpg"
            screenshotAlt="퀘스트 카드"
          />
        </Reveal>

        <Reveal delay={80}>
          <FeatureCard
            tag="아주 쉬운 첫 단계"
            title="'시작'이 제일 어려우니까요"
            body="ADHD는 작업에 시작하기 어렵고 집중 상태에 들기 힘들어요. 그래서 세부 할 일의 첫 번째는 항상 '책 펴기', '파일 열기' 처럼 2분 안에 할 수 있는 것으로 만들어요."
            screenshot="/app_screenshot/KakaoTalk_20260531_130354844_01.jpg"
            screenshotAlt="세부 목록"
          />
        </Reveal>

        <Reveal delay={160}>
          <FeatureCard
            tag="그냥 말하면 끝"
            title="꼼꼼히 입력할 시간이 어딨어요"
            body="관리해야 한다는 걸 알아도 지키기 힘든 게 ADHD예요. 그래서 음성으로 말만 하게 만들었어요. 두서없이 말해도 찰떡같이 알아듣고 할 일을 짜줘요."
          />
        </Reveal>
      </section>

      {/* ── STATS ───────────────────────────────────────────────── */}
      <section style={{ background: '#1A1A1A', padding: '64px 22px' }}>

        <Reveal>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#46E08A', letterSpacing: '0.08em', marginBottom: 40, textTransform: 'uppercase' }}>
            심플하지 않으면 죽겠다
          </p>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <StatRow num="3초" label="말하는 데 걸리는 시간" delay={0} border />
          <StatRow num="0번" label="타이핑이 필요한 순간" delay={100} border />
          <StatRow num="1개" label="지금 화면에 보이는 할 일" delay={200} border={false} />
        </div>

        <Reveal delay={300}>
          <div style={{ marginTop: 52, borderTop: '1px solid #2A2A2A', paddingTop: 40 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.35, marginBottom: 8 }}>
              앱이 열 개 있어 봐요.<br />
              우리가 어디 움직이는가.
            </p>
            <p style={{ fontSize: 14, color: '#6A6A6A', lineHeight: 1.7, marginBottom: 0 }}>
              정리는 쉽게.<br />
              당신은 보이는 일만 하세요.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section style={{ padding: '72px 22px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

        <Reveal>
          {/* Mic button visual */}
          <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 32, margin: '0 auto 32px' }}>
            <div style={{
              position: 'absolute', inset: -12, borderRadius: '50%',
              background: 'rgba(70,224,138,0.15)',
              animation: 'micPulse 2s ease-in-out infinite',
            }} />
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: '#46E08A', border: '2px solid #1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <Mic size={34} strokeWidth={1.5} color="#1A1A1A" />
            </div>
          </div>

          <p style={{ fontSize: 28, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1.25, margin: '0 0 8px' }}>
            하긴할거잖아요?
          </p>
          <p style={{ fontSize: 16, color: '#9A9A9A', margin: '0 0 36px', fontWeight: 500 }}>
            알아요.
          </p>

          <button
            onClick={onStart}
            style={{
              background: '#1A1A1A', color: 'white',
              border: '2px solid #1A1A1A', borderRadius: 999,
              padding: '18px 40px', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '-0.01em', width: '100%', maxWidth: 320,
            }}
          >
            beta 시작해보기 — 무료
          </button>

          <p style={{ fontSize: 12, color: '#C0C0C0', marginTop: 16 }}>
            Google 계정으로 3초 만에 시작
          </p>
        </Reveal>
      </section>

      {/* ── KEYFRAMES ───────────────────────────────────────────── */}
      <style>{`
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes micPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

import { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Loader2, ExternalLink } from 'lucide-react';

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /Instagram|KAKAOTALK|Line\/|FBAN|FBAV|Twitter|NaverSearch|DaumMobileApp|wv\)/.test(ua);
}

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inApp = isInAppBrowser();

  const handleGoogleLogin = async () => {
    if (inApp) return;
    setLoading(true);
    setError('');
    try {
      // 팝업 우선 시도 (Safari ITP 우회)
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      // 팝업 차단되거나 지원 안 되는 환경이면 리다이렉트로 폴백
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          // fall through to error display
        }
      }
      const msg = e instanceof Error ? e.message : '로그인에 실패했어요';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F2F2F2] flex flex-col items-center justify-center px-8">
      {/* Logo area */}
      <div className="mb-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#46E08A] border-2 border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-tight mb-2">
          하긴할거야<br />진짜로
        </h1>
        <p className="text-[14px] text-[#9A9A9A] leading-relaxed">
          지금 이것 하나만.<br />음성으로 등록하고, 하나씩 해치워요.
        </p>
      </div>

      {/* Login area */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {inApp ? (
          <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-5 text-center">
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">
              브라우저에서 열어주세요
            </p>
            <p className="text-[13px] text-[#9A9A9A] leading-relaxed mb-4">
              구글 로그인은 인앱 브라우저를<br />지원하지 않아요.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F2F2F2] rounded-full">
                <ExternalLink size={14} strokeWidth={1.5} className="text-[#9A9A9A]" />
                <span className="text-[13px] text-[#9A9A9A]">
                  주소창에서 <b className="text-[#1A1A1A]">haginhal.vercel.app</b> 직접 입력
                </span>
              </div>
              <p className="text-[12px] text-[#9A9A9A]">또는 우측 하단 ··· → 외부 브라우저로 열기</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="
              w-full flex items-center justify-center gap-3
              bg-[#1A1A1A] text-white
              rounded-full py-4 px-6
              text-[15px] font-semibold
              border-2 border-[#1A1A1A]
              disabled:opacity-50
              active:scale-[0.98] transition-transform
            "
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>{loading ? '로그인 중…' : '구글로 시작하기'}</span>
          </button>
        )}

        {error && (
          <p className="text-[13px] text-red-500 text-center">{error}</p>
        )}
      </div>

      <p className="mt-12 text-[12px] text-[#9A9A9A] text-center">
        로그인하면 할일이 안전하게 저장돼요
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#fff"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.805.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#fff"
        opacity=".8"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#fff"
        opacity=".6"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#fff"
        opacity=".7"
      />
    </svg>
  );
}

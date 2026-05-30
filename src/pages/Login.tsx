import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '로그인에 실패했어요';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F5F0E8] flex flex-col items-center justify-center px-8">
      {/* Logo area */}
      <div className="mb-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#C8B89A] border-[1.5px] border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-tight mb-2">
          하긴할거야<br />진짜로
        </h1>
        <p className="text-[14px] text-[#9A9A9A] leading-relaxed">
          지금 이것 하나만.<br />음성으로 등록하고, 하나씩 해치워요.
        </p>
      </div>

      {/* Login button */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="
            w-full flex items-center justify-center gap-3
            bg-[#1A1A1A] text-white
            rounded-full py-4 px-6
            text-[15px] font-semibold
            border-[1.5px] border-[#1A1A1A]
            disabled:opacity-50 transition-opacity
            active:scale-[0.98] transition-transform
          "
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span>구글로 시작하기</span>
        </button>

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

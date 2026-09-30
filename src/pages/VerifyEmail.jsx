import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Mail } from 'lucide-react';
import { useTranslation } from '../config/useTranslation';

export default function VerifyEmail() {
  const { currentUser, isEmailVerified, refreshVerification } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isEmailVerified) {
      navigate('/dashboard');
    }
  }, [isEmailVerified, navigate]);

  const handleResend = async () => {
    try {
      setError('');
      setLoading(true);
      await sendEmailVerification(currentUser);
      setMessage(t('emailSentSuccess', 'Verification email sent! Please check your inbox.'));
    } catch (err) {
      setError(t('emailResendFail', 'Failed to resend the email. Trying too often?'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refreshVerification();
      if (auth.currentUser.emailVerified) {
        navigate('/dashboard');
      } else {
        setError(t('emailNotVerifiedYet', 'Email is still not verified. Please check your inbox.'));
      }
    } catch (err) {
      setError('Error refreshing status.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-86px)]">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[45%] bg-[#1e3a8a] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Grid */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px'}}
        ></div>
        
        {/* Logo */}
        <div className="relative z-10 flex items-start gap-3">
          <div className="border border-white/30 p-1.5 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-xl text-white tracking-tight leading-none mb-0.5">UrbanEye</span>
            <span className="text-[9px] font-bold text-[#FF9933] tracking-[0.2em]">{t('homeSubtitle', 'CIVIC INTELLIGENCE')}</span>
          </div>
        </div>

        {/* Central Graphic */}
        <div className="relative z-10 my-auto pr-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 mb-8">
            <Mail className="h-8 w-8 text-[#FF9933]" />
          </div>
          <h2 className="text-3xl font-serif text-white leading-snug font-medium">Verify your identity to access the civic portal.</h2>
          <div className="flex items-center gap-3 mt-8">
            <div className="h-px w-8 bg-[#138808]"></div>
            <span className="text-sm text-gray-300 font-medium">Identity Verification Required</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="relative z-10 bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 mt-12 w-full max-w-[320px]">
          <p className="text-sm font-bold text-white tracking-wide">Strict Verification Protocol</p>
          <p className="text-xs text-gray-400 mt-1.5 font-medium tracking-wide leading-relaxed">Only verified citizens can participate in tracking infrastructure and civic progress parameters.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative">
        <div className="max-w-sm w-full mx-auto">
          <h2 className="text-4xl font-serif text-[#1e3a8a] font-bold mb-2 tracking-tight">{t('securityCheck', 'Security Check')}</h2>
          <p className="text-gray-500 text-sm mb-10 font-medium tracking-wide">
            {t('verifyEmailSent', "We've dispatched an electronic verification link to")} <span className="font-bold text-gray-900 border-b border-gray-300">{currentUser.email}</span>. {t('clickLinkToComplete', 'Click the link to complete registration.')}
          </p>

          {message && (
            <div className="bg-green-50 border-l-4 border-[#138808] p-3 rounded-r-md mb-6">
              <p className="text-xs font-semibold text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md mb-6">
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 rounded-lg shadow-md text-sm font-semibold text-white bg-[#1e3a8a] hover:bg-blue-900 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {t('confirmAuthorization', 'Confirm Authorization →')}
            </button>
            
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 rounded-lg shadow-sm text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all disabled:opacity-50 border border-gray-200"
            >
              {t('resendAuthorityLink', 'Resend Authority Link')}
            </button>
          </div>

          <div className="mt-8 relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 uppercase tracking-widest font-bold">OR</span></div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-center text-sm font-bold text-[#1e3a8a] hover:underline"
          >
            {t('abortSession', 'Abort and End Session')}
          </button>
        </div>
      </div>
    </div>
  );
}

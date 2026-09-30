import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import api from '../services/api';
import { useTranslation } from '../config/useTranslation';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (name.trim()) {
        await updateProfile(userCredential.user, { displayName: name.trim() });
      }

      await api.post('/api/users/register', {
        name: name.trim(),
      });

      await sendEmailVerification(userCredential.user);
      navigate('/verify-email');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Feature List */}
        <div className="relative z-10 my-auto space-y-7 text-sm text-gray-300 font-medium">
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-[#FF9933] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="tracking-wide">Report issues with GPS-verified photo evidence</span>
          </div>
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-[#FF9933] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="tracking-wide">Community upvoting surfaces what matters most</span>
          </div>
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-[#FF9933] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="tracking-wide">AI priority scoring drives faster resolution</span>
          </div>
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-[#FF9933] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="tracking-wide">Official updates delivered directly to you</span>
          </div>
        </div>

        {/* Disclaimer Block */}
        <div className="relative z-10 bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 mt-12 w-full max-w-[320px]">
          <p className="text-xs text-gray-400 mb-1.5 font-medium tracking-wide">Free forever for citizens.</p>
          <p className="text-sm font-bold text-white tracking-wide">No hidden fees. No data selling.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative">
        <div className="max-w-sm w-full mx-auto">
          <h2 className="text-4xl font-serif text-[#1e3a8a] font-bold mb-2 tracking-tight">{t('createAccount', 'Create account')}</h2>
          <p className="text-gray-500 text-sm mb-10 font-medium tracking-wide">{t('joinCivicCommunity', 'Join your civic community today — free forever.')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
                <p className="text-xs font-semibold text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('fullName', 'Full Name')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-200 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all placeholder:text-gray-400 font-medium" 
                  placeholder="Prathamesh Kumar" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('emailAddress', 'Email Address')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-200 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all placeholder:text-gray-400 font-medium" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('password', 'Password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-200 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all placeholder:text-gray-400 font-medium tracking-widest" 
                  placeholder="Min. 6 characters" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('confirmPassword', 'Confirm Password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-200 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all placeholder:text-gray-400 font-medium tracking-widest" 
                  placeholder="Repeat your password" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-900 transition-all mt-6 disabled:opacity-50 shadow-md active:scale-[0.98]"
            >
              {loading ? t('creatingAccount', 'Creating Account...') : t('createAccountBtn', 'Create Account →')}
            </button>
          </form>

          <div className="mt-8 relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 uppercase tracking-widest font-bold">OR</span></div>
          </div>

          <p className="text-center text-sm text-gray-600 font-medium mb-12">
            {t('alreadyHaveAccount', 'Already have an account?')} <Link to="/login" className="font-bold text-[#1e3a8a] hover:underline">{t('signInHere', 'Sign in here')}</Link>
          </p>

          <p className="text-center text-[10px] text-gray-400 leading-relaxed font-medium">
            {t('termsNotice', 'By creating an account you agree to our Terms of Service and Privacy Policy.')}
          </p>
        </div>
      </div>
    </div>
  );
}

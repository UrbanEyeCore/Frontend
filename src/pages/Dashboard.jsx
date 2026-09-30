import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Database, Fingerprint, Mail, UserCircle2, Target } from 'lucide-react';
import { useTranslation } from '../config/useTranslation';
import AdminLeaderboard from '../components/AdminLeaderboard';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [testResponse, setTestResponse] = useState(null);
  const [testError, setTestError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myCommunities, setMyCommunities] = useState([]);
  const [profileError, setProfileError] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get('/api/users/me');
        setProfile(res.data);

        try {
          const commRes = await api.get('/api/communities');
          if (res.data?.communityIds) {
            setMyCommunities(commRes.data.filter(c => res.data.communityIds.includes(c.id)));
          }
        } catch (e) {
          console.error("Failed to load joined communities");
        }

        if (res.data?.role === 'ADMIN') {
          navigate('/admin');
        }
      } catch (err) {
        setProfileError(err?.response?.data?.error || err.message || 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const handleTestBackend = async () => {
    setLoadingTest(true);
    setTestResponse(null);
    setTestError(null);
    try {
      const res = await api.get('/api/public/firestore-test');
      setTestResponse(JSON.stringify(res.data, null, 2));
    } catch (err) {
      setTestError(err?.response?.data?.error || err.message || 'Failed to connect to backend.');
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-86px)] pb-12">
      {/* Deep Navy Header Banner */}
      <div className="bg-[#1e3a8a] py-12 px-4 sm:px-6 lg:px-8 border-b-4 border-[#FF9933]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-white tracking-tight">{t('citizenDashboard', 'Citizen Dashboard')}</h2>
            <p className="mt-2 text-blue-200 font-medium tracking-wide">{t('dashboardSubtitle', 'Manage your central profile and connected district communities.')}</p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-4">
            {profile?.role === 'ADMIN' && (
              <Link to="/admin" className="inline-flex items-center rounded-lg bg-[#138808] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-800 transition-colors">
                {t('accessAdmin', 'Access Admin Portal')}
              </Link>
            )}
            <Link to="/communities" className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#1e3a8a] shadow-md hover:bg-gray-100 transition-colors">
              {t('exploreComms', 'Explore Communities')} &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Identity + Jurisdictions */}
          <div className="lg:col-span-7 space-y-8">
            {/* Identity Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="border-b border-gray-100 bg-white px-8 py-5 flex items-center gap-3">
                <div className="p-2 bg-[#1e3a8a] rounded-lg shadow-sm">
                  <Fingerprint className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#1e3a8a]">{t('officialIdentityFile', 'Official Identity File')}</h3>
              </div>

              <div className="px-8 py-8">
                {loadingProfile && <p className="text-sm text-gray-500 font-medium mb-4">{t('retrievingRecords', 'Retrieving official records...')}</p>}
                {profileError && <p className="text-sm text-red-600 font-medium mb-4">{profileError}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <UserCircle2 className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('registeredName', 'Registered Name')}</label>
                      <p className="text-sm text-gray-900 font-bold">{profile?.name || currentUser?.displayName || 'Citizen'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <Mail className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('emailClassification', 'Email Classification')}</label>
                      <p className="text-sm text-gray-900 font-bold mb-1.5">{profile?.email || currentUser?.email}</p>
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-green-100 text-green-800 border border-green-200">
                        {t('signatureVerified', 'Signature Verified')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <Fingerprint className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('nationalUid', 'National UID')}</label>
                      <p className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded inline-block border border-gray-200 shadow-sm">{profile?.id || currentUser?.uid}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <UserCircle2 className="h-5 w-5 text-[#FF9933] mt-0.5 flex-shrink-0" />
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('clearanceLevel', 'Clearance Level')}</label>
                      <p className="text-sm font-bold text-[#1e3a8a]">{profile?.role || 'CITIZEN'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Joined Communities Area */}
            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="border-b border-gray-100 bg-white px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#FF9933] rounded-lg shadow-sm">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#1e3a8a]">{t('activeJurisdictions', 'Active Jurisdictions')}</h3>
                </div>
              </div>

              <div className="p-0">
                {loadingProfile ? (
                  <div className="p-8 text-center text-sm font-medium text-gray-500 uppercase tracking-widest">{t('searchingRecords', 'Searching Records...')}</div>
                ) : myCommunities.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {myCommunities.map(community => (
                      <li key={community.id} className="hover:bg-gray-50 transition-colors">
                        <Link to={`/community/${community.id}`} className="block px-8 py-5">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className="text-lg font-bold text-[#1e3a8a] truncate mb-1">
                                {t(community.name?.toLowerCase(), community.name)}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold uppercase tracking-widest text-gray-500">
                                  {community.location ? t(community.location.toLowerCase(), community.location) : t('india', 'India')}
                                </span>
                                <span className="text-gray-300">&bull;</span>
                                <span className="text-[#FF9933] font-bold uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{community.category}</span>
                              </div>
                            </div>
                            <div>
                              <span className="inline-flex items-center px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-white bg-[#1e3a8a] hover:bg-blue-900 shadow-sm uppercase tracking-wider transition-colors">
                                {t('enterPortal', 'Enter Portal')}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Target className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{t('noActiveJurisdictions', 'No Active Jurisdictions')}</p>
                    <p className="text-xs text-gray-500 mb-6">{t('noActiveJurisdictionsSub', 'You have not joined any civic communities yet.')}</p>
                    <Link to="/communities" className="text-xs font-bold uppercase tracking-widest text-[#FF9933] hover:text-orange-600 border-b border-[#FF9933] pb-0.5">
                      {t('browseNationalIndex', 'Browse National Index')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Community Admin Leaderboard */}
          <div className="lg:col-span-5 sticky top-6">
            <AdminLeaderboard compact={true} />
          </div>

        </div>
      </div>
    </div>
  );
}

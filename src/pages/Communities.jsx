import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTranslation } from '../config/useTranslation';

const categoryColors = {
  ROADS: 'bg-yellow-100 text-yellow-800',
  ROAD: 'bg-yellow-100 text-yellow-800',
  CLEANLINESS: 'bg-green-100 text-green-800',
  GARBAGE: 'bg-green-100 text-green-800',
  ELECTRICITY: 'bg-orange-100 text-orange-800',
  WATER: 'bg-blue-100 text-blue-800',
  POLLUTION: 'bg-gray-100 text-gray-800',
  GOVERNANCE: 'bg-indigo-100 text-indigo-800',
  CIVIC: 'bg-teal-100 text-teal-800',
  TRAFFIC: 'bg-red-100 text-red-800',
  GENERAL: 'bg-blue-100 text-blue-800',
};

const FallbackCommunities = [
  { id: '1', name: 'Mumbai Watch', category: 'ROADS', location: 'Mumbai', memberCount: 1243, description: 'Tracking road conditions, potholes, and infrastructure updates across Mumbai.' },
  { id: '2', name: 'Clean Bangalore Initiative', category: 'CLEANLINESS', location: 'Bangalore', memberCount: 892, description: 'Community-driven cleanliness drives and waste management discussions.' },
  { id: '3', name: 'Chennai Power Watch', category: 'ELECTRICITY', location: 'Chennai', memberCount: 734, description: 'Reporting power outages, transformer issues, and electricity infrastructure status.' }
];

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchCommunities();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/users/me');
      setProfile(res.data);
    } catch (error) {
      console.error("Error fetching profile", error);
    }
  };

  const fetchCommunities = async () => {
    try {
      const response = await api.get('/api/communities');
      setCommunities(response.data || []);
    } catch (error) {
      console.error("Error fetching communities", error);
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (id, e) => {
    e.stopPropagation();
    try {
      if (profile?.communityIds?.includes(id)) {
         navigate(`/community/${id}`);
         return;
      }
      await api.post(`/api/users/join/${id}`);
      fetchProfile();
      fetchCommunities();
    } catch (error) {
      console.error("Error joining community", error);
    }
  };

  const handleLeave = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/api/users/leave/${id}`);
      fetchProfile();
      fetchCommunities();
    } catch (error) {
      console.error("Error leaving community", error);
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-86px)] pb-16">
      {/* Header Banner */}
      <div className="bg-[#1e3a8a] py-10 px-4 sm:px-6 lg:px-8 border-b-4 border-[#FF9933] shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">{t('exploreDistrictComms', 'Civic Communities')}</h1>
          <p className="text-blue-200 text-sm font-medium">{t('exploreDistrictCommsSub', 'Join local district forums, raise issues, and coordinate official action.')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Search Bar */}
        <div className="mb-8 relative z-10 max-w-2xl bg-white p-2 rounded-xl shadow-md border border-gray-100 flex items-center">
          <div className="pl-4 pr-2 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[#1e3a8a]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full py-2.5 px-3 border-none focus:ring-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none"
            placeholder={t('searchCommunity', 'Search communities by name, category, or district...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm font-medium text-gray-500">{t('searchingRecords', 'Retrieving official records...')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((community) => (
              <div 
                key={community.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#1e3a8a] p-6 flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group" 
                onClick={() => navigate(`/community/${community.id}`)}
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex-1">
                    <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 group-hover:text-[#1e3a8a] transition-colors">
                      {t(community.name?.toLowerCase(), community.name)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${(categoryColors[community.category?.toUpperCase()] || categoryColors[community.category])?.replace('bg-', 'border-').replace('text-', 'text-') || 'border-teal-200 text-teal-700 bg-teal-50'}`}>
                        {community.category}
                      </span>
                      <span className="text-gray-500 text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                        <svg className="w-3 h-3 text-[#FF9933]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                        {community.location ? t(community.location.toLowerCase(), community.location) : t('india', 'India')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-6 flex-grow leading-relaxed font-medium relative z-10 border-t border-dashed border-gray-200 pt-4">
                  {community.description || 'Official civic community discussion forum.'}
                </p>
                
                <div className="mt-auto relative z-10 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-gray-400 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                    {community.memberCount || 0} {t('citizens', 'Citizens')}
                  </span>

                  <div>
                    {profile?.role === 'ADMIN' ? (
                      profile?.communityIds?.includes(community.id) ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/community/${community.id}`); }}
                          className="py-1.5 px-4 rounded-md shadow-sm text-xs font-bold text-white bg-[#138808] hover:bg-green-800 uppercase tracking-wider transition-colors"
                        >
                          {t('manage', 'Manage')}
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/community/${community.id}`); }}
                          className="py-1.5 px-4 rounded-md text-xs font-bold text-gray-500 hover:text-[#1e3a8a] bg-gray-100 hover:bg-gray-200 uppercase tracking-wider transition-colors border border-gray-200"
                        >
                          {t('viewOnly', 'View Only')}
                        </button>
                      )
                    ) : (
                      profile?.communityIds?.includes(community.id) ? (
                        <div className="flex gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); navigate(`/community/${community.id}`); }}
                             className="py-1.5 px-4 rounded-md shadow-sm text-xs font-bold text-white bg-[#1e3a8a] hover:bg-blue-900 uppercase tracking-wider transition-colors"
                           >
                             {t('enter', 'Enter')}
                           </button>
                           <button 
                             onClick={(e) => handleLeave(community.id, e)}
                             className="py-1.5 px-3 rounded-md text-xs font-bold text-gray-500 hover:text-red-700 bg-white hover:bg-red-50 uppercase tracking-wider transition-colors border border-gray-200"
                           >
                             {t('exit', 'Exit')}
                           </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => handleJoin(community.id, e)}
                          className="py-1.5 px-4 rounded-md shadow-sm text-xs font-bold text-white bg-[#FF9933] hover:bg-orange-600 uppercase tracking-wider transition-colors"
                        >
                          {t('joinForum', 'Join Forum')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

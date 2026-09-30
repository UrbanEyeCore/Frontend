import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import DashboardMap from '../components/DashboardMap';
import { useTranslation } from '../config/useTranslation';
import TranslatedText from '../components/TranslatedText';

const BACKEND = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Converts a stored imageUrl value into a browser-fetchable absolute URL.
 *  Handles: full http URLs, data URIs, raw base64 strings, /uploads/... paths. */
function resolveImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  
  // If it's a raw base64 string without header
  if (trimmed.startsWith('/9j/') || trimmed.startsWith('iVBORw0KGgo') || trimmed.startsWith('R0lGOD')) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  return BACKEND + path;
}

export default function Community() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('Issues');
  const [community, setCommunity] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [localNews, setLocalNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const [activeFilter, setActiveFilter] = useState('latest');
  const [selectedCategory, setSelectedCategory] = useState('All categories');

  const [expandedComments, setExpandedComments] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [commentInput, setCommentInput] = useState({});

  const displayIssues = React.useMemo(() => {
    let arr = issues.filter(i => !i.isUpdate && !i.isDuplicate && !i.parentIssueId);

    if (selectedCategory !== 'All categories') {
      arr = arr.filter(i => (i.category || 'GENERAL').toUpperCase() === selectedCategory.toUpperCase());
    }

    if (activeFilter === 'queued') {
      arr = arr.filter(i => (i.status || 'NEW') === 'NEW');
    } else if (activeFilter === 'complete') {
      arr = arr.filter(i => i.status === 'RESOLVED');
    }

    arr = [...arr];
    if (activeFilter === 'mostLiked') {
      arr.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    } else {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return arr;
  }, [issues, activeFilter, selectedCategory]);

  useEffect(() => {
    fetchCommunityData();
    fetchProfile();
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setUserLocation(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }, [id]);

  useEffect(() => {
    if (community?.location) {
      setLoadingNews(true);
      const rssUrl = encodeURIComponent(`https://news.google.com/rss/search?q=${community.location}+civic+news&hl=en-IN&gl=IN&ceid=IN:en`);
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`)
        .then(res => {
          if (!res.ok) throw new Error(`rss2json ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.status === 'ok' && data.items) {
            setLocalNews(data.items.slice(0, 4));
          }
        })
        .catch(() => { /* rss2json rate-limited or unavailable – news section stays hidden */ })
        .finally(() => setLoadingNews(false));
    }
  }, [community?.location]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/users/me');
      setProfile(res.data);
    } catch (e) { }
  };

  const handleJoin = async () => {
    try {
      await api.post(`/api/users/join/${id}`);
      fetchProfile();
      fetchCommunityData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    try {
      await api.post(`/api/users/leave/${id}`);
      fetchProfile();
      fetchCommunityData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const commRes = await api.get(`/api/communities/${id}`);
      setCommunity(commRes.data);

      const res = await api.get(`/api/issues/community/${id}`);
      setIssues(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (issueId) => {
    try {
      await api.post(`/api/issues/${issueId}/upvote`);
      fetchCommunityData(); // Refresh counts seamlessly
    } catch (e) {
      console.error(e);
    }
  };

  const toggleComments = async (issueId) => {
    const isExpanded = expandedComments[issueId];
    if (!isExpanded && !commentsMap[issueId]) {
      try {
        const res = await api.get(`/api/issues/${issueId}/comments`);
        setCommentsMap(prev => ({ ...prev, [issueId]: res.data }));
      } catch (e) {
        console.error(e);
        if (e?.response?.data?.message) alert("GET Comments Error: " + e.response.data.message);
      }
    }
    setExpandedComments(prev => ({ ...prev, [issueId]: !isExpanded }));
  };

  const handlePostComment = async (issueId) => {
    const text = commentInput[issueId];
    if (!text || text.trim() === '') return;
    try {
      await api.post(`/api/issues/${issueId}/comments`, { text, userName: profile?.username || 'Citizen' });
      setCommentInput(prev => ({ ...prev, [issueId]: '' }));
      const res = await api.get(`/api/issues/${issueId}/comments`);
      setCommentsMap(prev => ({ ...prev, [issueId]: res.data }));
    } catch (e) {
      console.error(e);
      if (e?.response?.data?.message) alert("POST Comment Error: " + e.response.data.message);
    }
  };

  const handlePostUpdate = () => {
    navigate(`/community/${id}/report?isUpdate=true`);
  };
  return (
    <div className="bg-gray-50 min-h-[calc(100vh-86px)] pb-16">
      {/* Dynamic Native Header */}
      {community && (
        <div className="bg-[#1e3a8a] py-10 px-4 sm:px-6 lg:px-8 border-b-4 border-[#FF9933] shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-xl border border-white/20 flex items-center justify-center text-3xl shadow-inner">🚧</div>
              <div>
                <button onClick={() => navigate('/communities')} className="text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center mb-1.5 transition-colors">
                  {t('returnToIndex', '← Return to National Index')}
                </button>
                <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-tight">
                  {t(community.name?.toLowerCase(), community.name)}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/90">
                  <span className="bg-[#FF9933] text-white px-2.5 py-1 rounded shadow-sm border border-orange-400">{community.category}</span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#138808]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg> 
                    {community.location ? t(community.location.toLowerCase(), community.location) : t('india', 'India')}
                  </span>
                  <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-blue-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg> {community.memberCount} {t('citizensVerified', 'Citizens Verified')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 md:mt-0">
              {profile?.role !== 'ADMIN' && (
                profile?.communityIds?.includes(community.id) ? (
                  <button onClick={handleLeave} className="px-5 py-2.5 border-2 border-white/30 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition-colors uppercase tracking-wider">
                    {t('exitJurisdiction', 'Exit Jurisdiction')}
                  </button>
                ) : (
                  <button onClick={handleJoin} className="px-5 py-2.5 shadow-md rounded-lg text-sm font-bold text-[#1e3a8a] bg-white hover:bg-gray-100 transition-colors uppercase tracking-wider">
                    {t('joinJurisdiction', 'Join Jurisdiction')}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1">

            {/* Tabs & Action */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-2">
              <div className="flex gap-6">
                <button
                  className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'Issues' ? 'border-b-2 border-[#FF9933] text-[#1e3a8a]' : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'}`}
                  onClick={() => setActiveTab('Issues')}
                >
                  {t('citizenReports', 'Citizen Reports')}
                </button>
                <button
                  className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'Updates' ? 'border-b-2 border-[#FF9933] text-[#1e3a8a]' : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'}`}
                  onClick={() => setActiveTab('Updates')}
                >
                  {t('officialDirectives', 'Official Directives')}
                </button>
              </div>

              <div className="transform -translate-y-2">
                {activeTab === 'Issues' && profile?.role !== 'ADMIN' && (
                  <Link to={`/community/${id}/report`} className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow hover:bg-blue-900 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg> {t('fileReport', 'File Report')}
                  </Link>
                )}
                {activeTab === 'Updates' && profile?.role === 'ADMIN' && (
                  <button onClick={handlePostUpdate} className="bg-[#138808] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow hover:bg-green-800 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> {t('publishDirective', 'Publish Directive')}
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            {activeTab === 'Issues' && (
              <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                {['latest', 'mostLiked', 'queued', 'complete'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${activeFilter === filter ? 'bg-[#1e3a8a] border-transparent text-white' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 shadow-sm'}`}
                  >
                    {filter === 'mostLiked' ? 'Most Liked' : filter}
                  </button>
                ))}
                
                <div className="ml-auto w-full md:w-auto mt-2 md:mt-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full md:w-48 border border-gray-200 rounded-lg px-4 py-2 text-[10px] font-bold text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none uppercase tracking-widest cursor-pointer appearance-none"
                    style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                  >
                    <option value="All categories">All Categories</option>
                    <option value="GARBAGE">Garbage</option>
                    <option value="WATER">Water</option>
                    <option value="TRAFFIC">Traffic</option>
                    <option value="ROAD">Road</option>
                    <option value="AIR QUALITY">Air Quality</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>
            )}

            {/* Live Map Render Layer */}
            <DashboardMap 
              issues={activeTab === 'Issues' ? displayIssues : issues.filter(i => i.isUpdate)} 
              userLocation={userLocation} 
            />

            {/* Feed */}
            <div className="space-y-6 mt-2">
              {loading && <p className="text-center py-10 font-medium text-gray-500 text-sm tracking-wide uppercase">{t('searchingRecords', 'Searching Official Records...')}</p>}

              {/* Real Updates Tab logic */}
              {activeTab === 'Updates' && issues.filter(i => i.isUpdate).map(update => (
                <TranslatedText key={update.id} title={update.title} description={update.description}>
                  {(translated, translating) => (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#138808] p-6 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold shadow-inner text-xs">AD</div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                              Government Command
                              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </h4>
                            <span className="text-xs font-medium text-gray-500">{new Date(update.createdAt).toLocaleDateString()} &middot; Official Broadcast</span>
                          </div>
                        </div>
                        {update.isUpdate && <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] px-2 py-1.5 rounded font-bold uppercase tracking-widest">Directive</span>}
                      </div>
                      <h4 className={`font-bold mb-2 font-serif text-xl text-[#1e3a8a] leading-snug ${translating ? 'opacity-50' : ''}`}>{translated.title}</h4>
                      <p className={`text-gray-700 text-sm mb-4 leading-relaxed font-medium ${translating ? 'opacity-50' : ''}`}>{translated.description}</p>
                      {update.imageUrl && (
                        <img src={resolveImageUrl(update.imageUrl)} alt="Official Update" className="w-full h-auto max-h-[600px] object-contain bg-gray-100 rounded-lg mb-2 shadow-sm border border-gray-200" />
                      )}
                    </div>
                  )}
                </TranslatedText>
              ))}
              {activeTab === 'Updates' && issues.filter(i => i.isUpdate).length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 font-medium text-sm tracking-wide uppercase">{t('noDirectives', 'No official directives broadcasted yet.')}</div>
              )}

              {/* Real Issues Mapping */}
              {activeTab === 'Issues' && displayIssues.length === 0 && !loading && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500 font-medium text-sm tracking-wide uppercase">
                  {t('noIssues', 'No issues found matching criteria.')}
                </div>
              )}

              {activeTab === 'Issues' && displayIssues.map(issue => (
                <TranslatedText key={issue.id} title={issue.title} description={issue.description}>
                  {(translated, translating) => (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#FF9933] p-6 relative overflow-hidden group">
                      <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center font-bold text-gray-400 text-xs shadow-inner">U</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{issue.reportedBy || 'Citizen'}</h4>
                          <span className="text-xs font-medium text-gray-500">{new Date(issue.createdAt).toLocaleDateString()} &middot; {t('fieldReport', 'Field Report')}</span>
                        </div>
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-block bg-orange-50 text-[#FF9933] border border-orange-200 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest">{issue.category || 'GENERAL'}</span>
                        <span className={`inline-block border text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest ${issue.severity === 'HIGH' ? 'bg-red-50 text-red-600 border-red-200' : issue.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>Severity: {issue.severity || 'LOW'}</span>
                        <h3 className={`font-bold text-xl font-serif text-[#1e3a8a] leading-snug w-full mt-2 ${translating ? 'opacity-50' : ''}`}>{translated.title}</h3>
                      </div>
                      <p className={`text-gray-700 text-sm mb-5 leading-relaxed font-medium ${translating ? 'opacity-50' : ''}`}>{translated.description}</p>

                      {issue.imageUrl && (
                        <img src={resolveImageUrl(issue.imageUrl)} alt="Issue" className="w-full h-auto max-h-[600px] object-contain bg-gray-100 rounded-lg mb-5 shadow-sm border border-gray-200" />
                      )}

                      {/* Status Indicator Progression */}
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 my-4 pt-3 border-t border-gray-100">
                        <div className={`px-3 py-1 rounded text-[9px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'NEW' ? 'bg-orange-50 border border-orange-200 text-[#FF9933]' : 'bg-gray-50 text-gray-400 border-transparent border'}`}>{t('queued', 'Queued')}</div>
                        <div className={`px-3 py-1 rounded text-[9px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'UNDER_REVIEW' ? 'bg-blue-50 border border-blue-200 text-blue-600' : 'bg-gray-50 text-gray-400 border-gray-200 border'}`}>{t('assessment', 'Assessment')}</div>
                        <div className={`px-3 py-1 rounded text-[9px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'IN_PROGRESS' ? 'bg-blue-50 border border-blue-200 text-blue-600' : 'bg-gray-50 text-gray-400 border-gray-200 border'}`}>{t('dispatched', 'Dispatched')}</div>
                        <div className={`px-3 py-1 rounded text-[9px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'RESOLVED' ? 'bg-green-50 border border-green-200 text-[#138808]' : 'bg-gray-50 text-gray-400 border-gray-200 border'}`}>{t('complete', 'Complete')}</div>
                      </div>

                      <div className="flex items-center gap-6 mt-6 border-t border-gray-100 pt-4">
                        <button onClick={() => handleUpvote(issue.id)} className="flex items-center gap-2 text-gray-500 hover:text-[#1e3a8a] transition-colors group/btn">
                          <svg className="w-5 h-5 group-hover/btn:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                          <span className="text-xs font-bold uppercase tracking-widest">{issue.upvoteCount || 0} {t('endorsements', 'Endorsements')}</span>
                        </button>
                        <button onClick={() => toggleComments(issue.id)} className="flex items-center gap-2 text-gray-500 hover:text-[#1e3a8a] transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          <span className="text-xs font-bold uppercase tracking-widest">{t('remarks', 'Remarks')}</span>
                        </button>
                      </div>

                      {expandedComments[issue.id] && (
                        <div className="mt-5 bg-gray-50 p-5 rounded-xl border border-gray-200">
                          <div className="flex gap-3 mb-5">
                            <input type="text" className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none" placeholder={t('appendRemark', 'Append official remark...')}
                              value={commentInput[issue.id] || ''} onChange={(e) => setCommentInput(prev => ({ ...prev, [issue.id]: e.target.value }))} />
                            <button onClick={() => handlePostComment(issue.id)} className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow hover:bg-blue-900 uppercase tracking-widest transition-colors">{t('append', 'Append')}</button>
                          </div>
                          <div className="space-y-4">
                            {(commentsMap[issue.id] || []).length === 0 ? (
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-center py-2">{t('noRemarks', 'No remarks appended to this file.')}</p>
                            ) : (
                              (commentsMap[issue.id] || []).map(comment => (
                                <div key={comment.id} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                  <span className="font-bold text-[10px] uppercase tracking-widest text-[#1e3a8a]">{comment.userName || 'Citizen'}</span>
                                  <p className="text-sm font-medium text-gray-800 mt-1 leading-relaxed">{comment.text}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TranslatedText>
              ))}

            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                📰 {t('localCivicNews', 'Local Civic News')}
              </h2>
              <p className="text-xs text-gray-500 mb-4">{t('latestUpdatesNews', 'Latest updates from verified sources')}</p>

              <div className="space-y-4">
                {loadingNews ? (
                  <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase py-4">Intercepting frequencies...</p>
                ) : localNews.length > 0 ? (
                  localNews.map((news, idx) => (
                    <a key={idx} href={news.link} target="_blank" rel="noopener noreferrer" className="block border-b border-gray-100 pb-3 last:border-0 hover:bg-gray-50 transition-colors p-2 -mx-2 rounded group">
                      <span className="text-[#FF9933] text-[9px] font-bold uppercase tracking-widest group-hover:text-orange-600 transition-colors">News Output</span>
                      <h4 className="font-bold text-sm text-[#1e3a8a] mt-1 leading-snug line-clamp-2">{news.title}</h4>
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-2">
                        <span>{new Date(news.pubDate).toLocaleDateString()}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">No verified broadcasts found.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

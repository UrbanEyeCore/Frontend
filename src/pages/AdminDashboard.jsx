import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../config/useTranslation';
import TranslatedText from '../components/TranslatedText';
import AdminLeaderboard from '../components/AdminLeaderboard';
import { Trophy, Award, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [issues, setIssues] = useState([]);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Issues');
  const [activeIssue, setActiveIssue] = useState(null); // For manage modal
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [expandedDuplicates, setExpandedDuplicates] = useState({});
  const [allCommunities, setAllCommunities] = useState([]);
  const [parentIssues, setParentIssues] = useState({});
  const [myStats, setMyStats] = useState(null);

  // Resolution & Directive Elevation Modal State
  const [resolveModal, setResolveModal] = useState({ open: false, issue: null, andElevate: false });
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const [resolutionPhotoPreview, setResolutionPhotoPreview] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  useEffect(() => {
    fetchAdminData();
    fetchMyPerformance();
  }, [currentUser]);

  const fetchMyPerformance = async () => {
    try {
      const res = await api.get('/api/leaderboard/admin/me');
      setMyStats(res.data);
    } catch (e) {
      if (currentUser?.uid) {
        try {
          const res2 = await api.get(`/api/leaderboard/admin/${currentUser.uid}`);
          setMyStats(res2.data);
        } catch (err) {
          console.error("Failed to load admin stats", err);
        }
      }
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const userRes = await api.get('/api/users/me');
      const currentUid = currentUser?.uid || userRes.data?.id;
      const assignedIds = userRes.data?.communityIds || [];

      const commRes = await api.get('/api/communities');
      const allComms = commRes.data || [];
      setAllCommunities(allComms);

      // 1. Highest Priority: Match by direct admin ownership (adminId matches current admin's UID)
      let myCommunity = allComms.find(c => c.adminId && String(c.adminId).trim() === String(currentUid).trim());

      // 2. Second Priority: Check assignedIds, preferring custom/non-default jurisdictions
      if (!myCommunity && assignedIds.length > 0) {
        const nonDefaultId = assignedIds.find(id => String(id) !== '1');
        const targetId = nonDefaultId || assignedIds[0];
        myCommunity = allComms.find(c => String(c.id) === String(targetId));
      }

      // 3. Fallback if no matching community
      if (!myCommunity && allComms.length > 0) {
        myCommunity = allComms[0];
      }

      if (myCommunity) {
        setCommunity(myCommunity);
        const issuesRes = await api.get(`/api/issues/community/${myCommunity.id}`);
        setIssues(issuesRes.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const neededParentIds = issues
      .filter(i => i.parentIssueId && !issues.some(p => p.id === i.parentIssueId))
      .map(i => i.parentIssueId);

    const missingIds = neededParentIds.filter(pid => !parentIssues[pid]);

    if (missingIds.length > 0) {
      missingIds.forEach(async (pid) => {
        try {
          const res = await api.get(`/api/issues/${pid}`);
          setParentIssues(prev => ({ ...prev, [pid]: res.data }));
        } catch (err) {
          console.error(`Failed to fetch parent issue ${pid}:`, err);
        }
      });
    }
  }, [issues]);

  const openResolveModal = (issue, andElevate = false) => {
    setActiveIssue(null);
    setResolutionPhoto(null);
    setResolutionPhotoPreview(null);
    setResolutionNote('');
    setResolveModal({ open: true, issue, andElevate });
  };

  const closeResolveModal = () => {
    setResolveModal({ open: false, issue: null, andElevate: false });
    setResolutionPhoto(null);
    setResolutionPhotoPreview(null);
    setResolutionNote('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("File is too large. Maximum allowed size is 15MB.");
        return;
      }
      setResolutionPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setResolutionPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitResolution = async (e) => {
    if (e) e.preventDefault();
    if (!resolveModal.issue) return;
    if (!resolutionPhoto) {
      alert(t('resolutionPhotoMandatoryAlert', "Resolution photo is required before this issue can be resolved or elevated to an Official Directive."));
      return;
    }

    setSubmittingResolution(true);
    try {
      const formData = new FormData();
      formData.append('resolutionPhoto', resolutionPhoto);
      if (resolutionNote && resolutionNote.trim()) {
        formData.append('resolutionNote', resolutionNote.trim());
      }

      const endpoint = resolveModal.andElevate
        ? `/api/admin/issues/${resolveModal.issue.id}/resolve-and-elevate`
        : `/api/admin/issues/${resolveModal.issue.id}/resolve`;

      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(res.data?.message || (resolveModal.andElevate ? "Issue resolved and elevated to Official Directive!" : "Issue marked as RESOLVED with resolution evidence!"));
      closeResolveModal();
      fetchAdminData();
      fetchMyPerformance();
    } catch (err) {
      console.error(err);
      alert("Failed to submit resolution: " + (err.response?.data?.error || err.response?.data?.message || err.message));
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleElevateDirective = async (issue) => {
    if (!issue) return;
    setActiveIssue(null);

    // If issue is not resolved or lacks resolution photo, prompt modal
    if (issue.status !== 'RESOLVED' || !issue.resolutionPhotoUrl) {
      openResolveModal(issue, true);
      return;
    }

    if (issue.isDirective || issue.isUpdate) {
      alert(t('alreadyElevatedAlert', "This issue has already been elevated to an Official Directive."));
      return;
    }

    try {
      const res = await api.post(`/api/admin/issues/${issue.id}/directive`);
      alert(res.data?.message || t('elevationSuccess', "Issue elevated to Official Directive successfully!"));
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert("Failed to elevate directive: " + (err.response?.data?.error || err.response?.data?.message || err.message));
    }
  };

  const handleUpdateStatus = async (issueId, status) => {
    if (status === 'RESOLVED') {
      const target = issues.find(i => i.id === issueId);
      if (target) {
        openResolveModal(target, false);
        return;
      }
    }
    try {
      await api.put(`/api/admin/issues/${issueId}/status?status=${status}`);
      setActiveIssue(null);
      fetchAdminData(); // refresh
      fetchMyPerformance(); // refresh performance & leaderboard points
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleMarkUpdate = async (issueId) => {
    const target = issues.find(i => i.id === issueId);
    if (target) {
      handleElevateDirective(target);
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm(t('confirmDeleteIssue', "Are you sure you want to delete this issue?"))) return;
    try {
      await api.delete(`/api/admin/issues/${issueId}`);
      setActiveIssue(null);
      fetchAdminData();
    } catch (err) {
      alert("Failed to delete issue");
    }
  };

  const handleBanUser = async (targetUserId) => {
    if (!community) return;
    if (!window.confirm(t('confirmBanUser', "Ban this user permanently from the community?"))) return;
    try {
      await api.post(`/api/admin/ban/${targetUserId}/community/${community.id}`);
      alert("User banned successfully.");
      setActiveIssue(null);
    } catch (err) {
      alert("Failed to ban user");
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
      await api.post(`/api/issues/${issueId}/comments`, { text, userName: 'Admin' });
      setCommentInput(prev => ({ ...prev, [issueId]: '' }));
      const res = await api.get(`/api/issues/${issueId}/comments`);
      setCommentsMap(prev => ({ ...prev, [issueId]: res.data }));
    } catch (e) {
      console.error(e);
      if (e?.response?.data?.message) alert("POST Comment Error: " + e.response.data.message);
    }
  };

  const toggleDuplicates = (issueId) => {
    setExpandedDuplicates(prev => ({ ...prev, [issueId]: !prev[issueId] }));
  };

  const handleDuplicateAction = async (issueId, action) => {
    try {
      await api.put(`/api/admin/issues/${issueId}/duplicate-action?action=${action}`);
      alert(`Duplicate status updated successfully.`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert("Failed to update duplicate status: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredIssues = activeTab === 'Issues'
    ? issues.filter(i => {
        if (i.isUpdate) return false;
        
        if (i.parentIssueId) {
          // If the parent is in the same community, it is already rendered under that parent.
          const parentInList = issues.some(p => p.id === i.parentIssueId);
          if (parentInList) return false;
          
          // Cross-community duplicate: only show in main queue if pending review.
          return i.duplicateReviewStatus === 'PENDING';
        }
        
        return true;
      })
    : issues.filter(i => i.isUpdate);

  const handleExport = () => {
    if (!filteredIssues || filteredIssues.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = ["ID", "Title", "Category", "Address", "Status", "Reported By", "Date"];
    const csvRows = [headers.join(",")];

    filteredIssues.forEach(issue => {
      const row = [
        issue.id,
        `"${(issue.title || 'Untitled').replace(/"/g, '""')}"`,
        issue.category || 'General',
        `"${(issue.address || '').replace(/"/g, '""')}"`,
        issue.status,
        issue.reportedBy || 'Unknown',
        new Date(issue.createdAt).toLocaleDateString()
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `community_${community?.id || 'export'}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Map API status values to translation keys
  const statusLabels = {
    UNDER_REVIEW: t('underReview', 'Under Review'),
    IN_PROGRESS: t('inProgress', 'In Progress'),
    RESOLVED: t('resolved2', 'Resolved'),
  };

  const stats = {
    total: filteredIssues.length,
    pending: filteredIssues.filter(i => i.status === 'NEW').length,
    inProgress: filteredIssues.filter(i => i.status === 'IN_PROGRESS').length,
    resolved: filteredIssues.filter(i => i.status === 'RESOLVED').length,
  };

  return (
    <div className="min-h-[calc(100vh-86px)] bg-[#f3f6fc] flex flex-col pt-10">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <div className="w-full md:w-64">
          <div className="bg-white rounded-xl shadow-sm p-5 w-full border border-gray-100 border-t-4 border-t-[#1e3a8a]">
            <h3 className="font-serif font-bold text-[#1e3a8a] text-lg mb-4 px-2 tracking-tight">{t('adminControls', 'Admin Controls')}</h3>
            <ul className="space-y-1">
              <li><button onClick={() => setActiveTab('Issues')} className={`w-full text-left px-3 py-2 text-sm font-bold tracking-wide uppercase rounded-lg transition-colors ${activeTab === 'Issues' ? 'bg-[#ebf0fe] text-[#1e3a8a]' : 'text-gray-600 hover:bg-gray-50'}`}>{t('issueQueue', 'Issue Queue')}</button></li>
              <li><button onClick={() => setActiveTab('Updates')} className={`w-full text-left px-3 py-2 text-sm font-bold tracking-wide uppercase rounded-lg transition-colors ${activeTab === 'Updates' ? 'bg-orange-50 text-[#FF9933]' : 'text-gray-600 hover:bg-gray-50'}`}>{t('updatesOnIssue', 'Updates on Issue')}</button></li>
              <li>
                <button onClick={() => setActiveTab('Leaderboard')} className={`w-full text-left px-3 py-2 text-sm font-bold tracking-wide uppercase rounded-lg transition-colors flex items-center justify-between ${activeTab === 'Leaderboard' ? 'bg-amber-50 text-[#1e3a8a] border-l-4 border-[#FF9933] font-extrabold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{t('adminLeaderboard', 'Leaderboard & Rank')}</span>
                  <Trophy className="w-4 h-4 text-amber-500" />
                </button>
              </li>
            </ul>

            {/* Admin Mini Rank Badge */}
            {myStats && (
              <div className="mt-5 p-3.5 bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-xl shadow-sm border border-blue-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {t('yourStanding', 'Your Rank')}
                  </span>
                  <span className="text-xs font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/40">
                    #{myStats.rank || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-xl font-bold font-serif">{myStats.totalScore != null ? myStats.totalScore.toFixed(1) : '0.0'} <span className="text-xs font-normal text-blue-200">pts</span></span>
                  <span className="text-[11px] text-blue-300 font-medium">{myStats.issuesResolved || 0} {t('resolved2', 'Resolved')}</span>
                </div>
              </div>
            )}

            {community && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">{t('community2', 'Jurisdiction')}</label>
                <div className="w-full bg-blue-50/70 border border-blue-100 text-xs font-bold text-[#1e3a8a] rounded-lg px-3 py-2.5 flex items-center justify-between shadow-xs">
                  <span className="truncate">{t(community.name?.toLowerCase(), community.name)}</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {community.location || 'India'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 pb-10">

          {activeTab === 'Leaderboard' ? (
            <div>
              {/* Leaderboard View: Performance Summary Cards */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-[#1e3a8a]">
                      {t('adminPerformance', 'Administrator Performance & Ranking')}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('adminPerformanceDesc', 'Performance scores are computed strictly on resolution speed: 5.0 pts base minus 0.2 pts per day taken.')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('currentRank', 'Current Rank')}</span>
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-serif font-black text-[#1e3a8a]">
                        #{myStats?.rank || '-'}
                      </span>
                      <span className="text-xs font-bold text-gray-500">{myStats?.community || ''}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#1e3a8a]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('totalPoints', 'Total Score')}</span>
                      <Award className="w-5 h-5 text-[#1e3a8a]" />
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-serif font-black text-[#1e3a8a]">
                        {myStats?.totalScore != null ? myStats.totalScore.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-xs font-bold text-gray-400 ml-1">pts</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#138808]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('issuesResolved', 'Issues Resolved')}</span>
                      <CheckCircle2 className="w-5 h-5 text-[#138808]" />
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-serif font-black text-[#138808]">
                        {myStats?.issuesResolved || 0}
                      </span>
                      <span className="text-xs font-bold text-gray-400 ml-1">{t('civicComplaints', 'complaints')}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#FF9933]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('avgResolution', 'Avg Resolution')}</span>
                      <Clock className="w-5 h-5 text-[#FF9933]" />
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-serif font-black text-[#FF9933]">
                        {myStats?.averageResolutionDays != null ? myStats.averageResolutionDays.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-xs font-bold text-gray-400 ml-1">{t('days', 'days')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Leaderboard Table */}
              <AdminLeaderboard currentAdminId={currentUser?.uid} />
            </div>
          ) : (
            <>
              {/* Header Banner */}
              <div className="relative overflow-hidden bg-[#1e3a8a] rounded-xl p-8 mb-6 shadow-md text-white border-b-4 border-[#FF9933]">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#FF9933] mb-2 block border border-[#FF9933] px-2 py-0.5 inline-block rounded">
                      {community?.name ? `${t(community.name?.toLowerCase(), community.name)} · ` : ''}{t('officialJurisdictionDashboard', 'Official Jurisdiction Dashboard')}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold leading-tight mt-2">
                      {t('civicOperations', 'Civic operations')} <br className="hidden md:block" />
                      {t('andIssueResolution', 'and issue resolution')}
                    </h1>
                  </div>
                  <div className="flex flex-col gap-3 mt-6 md:mt-0 w-full md:w-auto">
                    <button onClick={() => navigate(`/community/${community?.id}`)} className="text-xs font-bold uppercase tracking-widest bg-white text-[#1e3a8a] px-6 py-3 rounded-lg shadow-md hover:bg-gray-100 transition-colors w-full">
                      {t('viewLivePortal', 'View Live Portal →')}
                    </button>
                    <button onClick={handleExport} className="text-xs font-bold uppercase tracking-widest bg-[#138808] text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-800 transition-colors w-full flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      {t('exportDataLog', 'Export Data Log')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#1e3a8a] flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif font-bold text-[#1e3a8a]">{stats.total}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">{t('totalReports', 'Total Reports')}</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#FF9933] flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif font-bold text-[#FF9933]">{stats.pending}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">{t('pendingTriage', 'Pending Triage')}</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-400 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif font-bold text-blue-600">{stats.inProgress}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">{t('activeFieldwork', 'Active Fieldwork')}</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#138808] flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif font-bold text-[#138808]">{stats.resolved}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">{t('closedResolved', 'Closed/Resolved')}</span>
                </div>
              </div>

          {/* List */}
          {loading ? <p className="text-center py-10 font-bold text-sm tracking-widest uppercase text-gray-500">{t('retrievingOfficialLogs', 'Retrieving official logs...')}</p> : (
            <div className="space-y-4">
              {filteredIssues.map(issue => (
                <TranslatedText key={issue.id} title={issue.title} description={issue.description}>
                  {(translated, translating) => (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex flex-col md:flex-row justify-between md:items-start mb-4">
                        <div>
                          <h3 className={`font-serif font-bold text-[#1e3a8a] text-xl ${translating ? 'opacity-50' : ''}`}>
                            {translated.title || 'Untitled Issue'}{' '}
                            {issue.isUpdate && (
                              <span className="ml-2 text-[9px] bg-yellow-100 border border-yellow-300 text-yellow-800 px-2 py-0.5 rounded tracking-widest uppercase font-bold">
                                {t('directive', 'Directive')}
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-500 text-sm mt-1.5 font-medium flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#FF9933]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            {issue.address || 'GPS Unresolved'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {t('reported', 'REPORTED')}: {new Date(issue.createdAt).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              GPS: {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border ${issue.severity === 'HIGH' ? 'bg-red-50 text-red-600 border-red-200' : issue.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                              {t('severity', 'SEVERITY')}: {issue.severity || 'LOW'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-3 md:mt-0 bg-gray-50 px-3 py-1.5 rounded border border-gray-200 align-self-start">{issue.category || 'General'}</span>
                      </div>

                      <p className={`text-gray-700 text-sm mb-4 leading-relaxed font-medium mt-4 ${translating ? 'opacity-50' : ''}`}>{translated.description}</p>

                      {issue.imageUrl && (
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{t('originalReportEvidence', 'Original Report Evidence')}</span>
                          <img src={resolveImageUrl(issue.imageUrl)} alt="Original Evidence" className="w-full h-auto max-h-[300px] object-contain bg-gray-100 rounded-lg shadow-sm border border-gray-200" />
                        </div>
                      )}

                      {/* Verified Resolution Evidence Display */}
                      {issue.resolutionPhotoUrl && (
                        <div className="mb-4 p-4 bg-emerald-50/80 rounded-xl border-2 border-emerald-200 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                                {t('resolutionEvidenceAttached', 'Verified Resolution Evidence')}
                              </span>
                            </div>
                            {issue.isDirective && (
                              <span className="bg-emerald-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-widest">
                                {t('directive', 'Official Directive')}
                              </span>
                            )}
                          </div>
                          {issue.resolutionNote && (
                            <p className="text-xs text-emerald-900 font-medium mb-3 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                              <span className="font-bold">{t('resolutionNote', 'Note')}:</span> {issue.resolutionNote}
                            </p>
                          )}
                          <img
                            src={resolveImageUrl(issue.resolutionPhotoUrl)}
                            alt="Resolution Evidence"
                            className="w-full h-auto max-h-[300px] object-contain rounded-lg border border-emerald-300 bg-white shadow-xs"
                          />
                        </div>
                      )}

                      {/* Duplicate Complaints Section */}
                      {(() => {
                        const dups = issues.filter(i => i.parentIssueId === issue.id);
                        if (dups.length === 0) return null;

                        const totalSupporters = (issue.upvoteCount || 0) + dups.length + 1;
                        const latestReported = (() => {
                          let latest = new Date(issue.createdAt);
                          dups.forEach(d => {
                            const dDate = new Date(d.createdAt);
                            if (dDate > latest) latest = dDate;
                          });
                          return latest.toLocaleString();
                        })();

                        return (
                          <div className="mt-4 p-5 bg-[#f8fafc] rounded-xl border border-gray-200 mb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-200/60">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-orange-100 text-[#FF9933] border border-orange-200 px-2.5 py-1 rounded-full">
                                  {t('reportedByCitizens', 'Reported by')} {dups.length + 1} {t('citizens2', 'citizens')}
                                </span>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-100 text-[#1e3a8a] border border-blue-200 px-2.5 py-1 rounded-full">
                                  {t('totalSupporters', 'Total Supporters')}: {totalSupporters}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                {t('first', 'First')}: {new Date(issue.createdAt).toLocaleString()} | {t('latest', 'Latest')}: {latestReported}
                              </div>
                            </div>

                            <button 
                              onClick={() => toggleDuplicates(issue.id)} 
                              className="flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:underline uppercase tracking-widest outline-none"
                            >
                              <svg className={`w-4 h-4 transition-transform ${expandedDuplicates[issue.id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                              {expandedDuplicates[issue.id] ? t('hideDuplicates', 'Hide') : t('viewDuplicates', 'View')} {dups.length} {t('linkedDuplicates', 'Linked duplicate complaints')}
                            </button>

                            {expandedDuplicates[issue.id] && (
                              <div className="mt-4 space-y-4 pt-3 border-t border-dashed border-gray-200">
                                {dups.map(dup => (
                                  <div key={dup.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-left">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {t('reported', 'Reported')}: {new Date(dup.createdAt).toLocaleString()} | Reporter: {dup.reportedBy?.substring(0, 8) || 'Unknown'}...
                                      </div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded">
                                        {t('aiMatch', 'AI Match')}: {dup.duplicateConfidence}%
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm font-medium leading-relaxed mb-4 bg-[#fafafa] p-3 rounded-lg border border-gray-100">{dup.description}</p>
                                    {dup.imageUrl && (
                                      <img src={resolveImageUrl(dup.imageUrl)} alt="Evidence" className="w-full h-auto max-h-[200px] object-contain bg-gray-50 rounded-lg border border-gray-200 mb-4" />
                                    )}
                                    
                                    <div className="flex gap-2.5">
                                      {dup.duplicateReviewStatus !== 'CONFIRMED' && (
                                        <button 
                                          onClick={() => handleDuplicateAction(dup.id, 'CONFIRM')} 
                                          className="px-4 py-2 bg-[#138808] hover:bg-green-800 text-white rounded-lg text-[10px] uppercase tracking-wider font-bold shadow-sm transition-colors"
                                        >
                                          {t('confirmDuplicate', 'Confirm Duplicate')}
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => handleDuplicateAction(dup.id, 'CONVERT')} 
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] uppercase tracking-wider font-bold border border-gray-300 transition-colors"
                                      >
                                        {t('convertToSeparate', 'Convert to Separate')}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Cross-Community Parent Details Section */}
                      {issue.parentIssueId && !issues.some(p => p.id === issue.parentIssueId) && (
                        <div className="mt-4 p-5 bg-amber-50/50 rounded-xl border border-amber-200 mb-4 text-left">
                          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-amber-200/60">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                              {t('aiFlaggedDuplicate', 'AI Flagged Cross-Community Duplicate')} ({issue.duplicateConfidence || 0}% {t('confidence', 'Confidence')})
                            </span>
                          </div>
                          
                          {parentIssues[issue.parentIssueId] ? (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('masterIssue', 'Master Issue (Other Jurisdiction):')}</p>
                              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-[#1e3a8a] text-sm">{parentIssues[issue.parentIssueId].title}</h4>
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded">
                                    {t('community2', 'Community')}: {(() => {
                                      const pComm = allCommunities.find(c => String(c.id) === String(parentIssues[issue.parentIssueId].communityId));
                                      return pComm ? t(pComm.name?.toLowerCase(), pComm.name) : parentIssues[issue.parentIssueId].communityId;
                                    })()}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-xs font-medium leading-relaxed mb-3">{parentIssues[issue.parentIssueId].description}</p>
                                {parentIssues[issue.parentIssueId].imageUrl && (
                                  <img src={resolveImageUrl(parentIssues[issue.parentIssueId].imageUrl)} alt="Master Evidence" className="w-full h-auto max-h-[150px] object-contain bg-gray-50 rounded-lg border border-gray-200 mb-2" />
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-gray-500 animate-pulse uppercase tracking-wider">{t('retrievingMasterIssue', 'Retrieving master issue details from other jurisdiction...')}</p>
                          )}

                          <div className="flex gap-2.5 mt-4 pt-3 border-t border-dashed border-amber-200">
                            {issue.duplicateReviewStatus !== 'CONFIRMED' && (
                              <button 
                                onClick={() => handleDuplicateAction(issue.id, 'CONFIRM')} 
                                className="px-4 py-2 bg-[#138808] hover:bg-green-800 text-white rounded-lg text-[10px] uppercase tracking-wider font-bold shadow-sm transition-colors"
                              >
                                {t('confirmDuplicate', 'Confirm Duplicate')}
                              </button>
                            )}
                            <button 
                              onClick={() => handleDuplicateAction(issue.id, 'CONVERT')} 
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] uppercase tracking-wider font-bold border border-gray-300 transition-colors"
                            >
                              {t('convertToSeparate', 'Convert to Separate')}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-6 pt-4 border-t border-gray-100">
                        <div className={`px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'NEW' ? 'bg-orange-50 border border-orange-200 text-[#FF9933]' : 'bg-gray-50 text-gray-400 border border-transparent'}`}>{t('queued', 'Queued')}</div>
                        <div className={`px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'UNDER_REVIEW' ? 'bg-blue-50 border border-blue-200 text-blue-600' : 'bg-gray-50 text-gray-400 border-gray-200 border'}`}>{t('assessment', 'Assessment')}</div>
                        <div className={`px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'IN_PROGRESS' ? 'bg-blue-50 border border-blue-200 text-blue-600' : 'bg-gray-50 text-gray-400 border-gray-200 border'}`}>{t('dispatched', 'Dispatched')}</div>
                        <div className={`px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold cursor-default ${issue.status === 'RESOLVED' ? 'bg-green-50 border border-green-200 text-[#138808]' : 'bg-gray-50 text-gray-400 border-gray-200 border'}`}>{t('complete', 'Complete')}</div>

                        <button onClick={() => toggleComments(issue.id)} className="flex items-center gap-2 text-gray-500 hover:text-[#1e3a8a] transition-colors ml-2 md:ml-4">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          <span className="text-xs font-bold uppercase tracking-widest">{t('remarks', 'Remarks')}</span>
                        </button>

                        <div className="ml-auto relative">
                          <button
                            onClick={() => setActiveIssue(activeIssue === issue.id ? null : issue.id)}
                            className="bg-[#1e3a8a] hover:bg-blue-900 flex items-center gap-2 text-white text-[10px] uppercase tracking-widest font-bold px-5 py-2.5 rounded shadow-sm transition-colors"
                          >
                            {t('action', 'Action')} <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </button>

                          {/* Dropdown Menu */}
                          {activeIssue === issue.id && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-left">
                              <div className="py-2">
                                <span className="block px-4 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100 mb-1">{t('setResolutionPhase', 'Set Resolution Phase')}</span>
                                {['UNDER_REVIEW', 'IN_PROGRESS'].map(s => (
                                  <button key={s} onClick={() => handleUpdateStatus(issue.id, s)} className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 text-gray-800 transition-colors uppercase">
                                    {t('assignStatus', 'Assign')} {statusLabels[s] || s.replace('_', ' ')}
                                  </button>
                                ))}
                                <button onClick={() => openResolveModal(issue, false)} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-green-50 text-[#138808] transition-colors uppercase flex items-center gap-1.5">
                                  <span>✓</span> {t('resolveWithProof', 'Resolve with Evidence')}
                                </button>

                                <div className="border-t border-gray-100 my-1"></div>
                                <span className="block px-4 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100 mb-1">{t('administrativeOrders', 'Administrative Orders')}</span>
                                
                                {!issue.isDirective && !issue.isUpdate ? (
                                  issue.status === 'RESOLVED' && issue.resolutionPhotoUrl ? (
                                    <button onClick={() => handleElevateDirective(issue)} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-blue-50 text-[#1e3a8a] transition-colors uppercase tracking-wide">
                                      📢 {t('elevateToDirective', 'Elevate to Directive')}
                                    </button>
                                  ) : (
                                    <button onClick={() => openResolveModal(issue, true)} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-blue-50 text-[#1e3a8a] transition-colors uppercase tracking-wide">
                                      📢 {t('resolveAndElevate', 'Resolve & Elevate to Directive')}
                                    </button>
                                  )
                                ) : (
                                  <span className="block px-4 py-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 uppercase tracking-wide">
                                    ✓ {t('directiveActive', 'Directive Active')}
                                  </span>
                                )}

                                <button onClick={() => handleDelete(issue.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-red-50 text-red-600 transition-colors uppercase tracking-wide">{t('expungeRecord', 'Expunge Record')}</button>
                                <button onClick={() => handleBanUser(issue.reportedBy)} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-red-50 text-red-600 transition-colors uppercase tracking-wide">{t('revokeCitizenAccess', 'Revoke Citizen Access')}</button>
                              </div>
                            </div>
                          )}
                        </div>
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
              {filteredIssues.length === 0 && <p className="text-gray-500 text-center bg-white p-8 rounded-xl border border-dashed border-gray-300 font-medium text-sm tracking-wide uppercase">{t('noIssues', 'No issues found matching criteria.')}</p>}
            </div>
          )}
        </>
      )}

      {/* Resolve & Upload Evidence Modal */}
      {resolveModal.open && resolveModal.issue && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-t-8 border-[#138808] max-w-lg w-full overflow-hidden transform transition-all animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1e3a8a] font-serif">
                      {resolveModal.andElevate ? t('resolveAndElevateTitle', 'Resolve & Elevate to Directive') : t('resolveWithProofTitle', 'Resolve Issue & Upload Evidence')}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {t('resolutionProofMandatory', 'Mandatory resolution evidence must be provided.')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeResolveModal}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Issue summary */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 text-xs">
                <span className="font-bold text-gray-700 block truncate">{resolveModal.issue.title}</span>
                <span className="text-gray-500">{resolveModal.issue.category} &middot; {resolveModal.issue.address || 'Location Verified'}</span>
              </div>

              <form onSubmit={handleSubmitResolution} className="space-y-4">
                {/* File Upload Region */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
                    {t('resolutionPhotoRequired', 'Resolution Evidence Photo (Mandatory)')} *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-4 text-center bg-gray-50 transition-colors">
                    {resolutionPhotoPreview ? (
                      <div className="space-y-2">
                        <img
                          src={resolutionPhotoPreview}
                          alt="Resolution Preview"
                          className="w-full h-44 object-contain rounded-lg bg-white border border-gray-200"
                        />
                        <label className="inline-block cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xs">
                          {t('changePhoto', 'Change Photo')}
                          <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <svg className="w-10 h-10 text-emerald-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider block">
                          {t('uploadResolutionEvidence', 'Upload Resolution Photo')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1 block">
                          JPEG, PNG, WEBP up to 15MB
                        </span>
                        <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" required />
                      </label>
                    )}
                  </div>
                </div>

                {/* Resolution Remarks */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
                    {t('resolutionRemarks', 'Official Resolution Note / Remarks (Optional)')}
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="E.g., Pothole filled and road surface restored. Inspected by civic team."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg p-3 text-xs font-medium focus:ring-2 focus:ring-[#138808] focus:border-[#138808] outline-none resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeResolveModal}
                    disabled={submittingResolution}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResolution || !resolutionPhoto}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-md transition-colors ${
                      !resolutionPhoto || submittingResolution ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#138808] hover:bg-green-800'
                    }`}
                  >
                    {submittingResolution ? t('submitting', 'Submitting...') : resolveModal.andElevate ? t('resolveAndPublishDirective', 'Resolve & Publish Directive') : t('confirmResolution', 'Confirm Resolution')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}

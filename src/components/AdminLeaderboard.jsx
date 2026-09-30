import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from '../config/useTranslation';
import { Trophy, Award, Clock, CheckCircle2, ChevronRight, X, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export default function AdminLeaderboard({ 
  currentAdminId = null, 
  compact = false, 
  title = null, 
  subtitle = null,
  limit = null 
}) {
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [adminDetails, setAdminDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/leaderboard/admins');
      setLeaderboard(res.data || []);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAdminDetails = async (adminId) => {
    setSelectedAdminId(adminId);
    setLoadingDetails(true);
    setAdminDetails(null);
    try {
      const res = await api.get(`/api/leaderboard/admin/${adminId}`);
      setAdminDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch admin details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (entry.adminName && entry.adminName.toLowerCase().includes(q)) ||
      (entry.community && entry.community.toLowerCase().includes(q)) ||
      (entry.communityLocation && entry.communityLocation.toLowerCase().includes(q))
    );
  });

  const displayList = limit ? filteredLeaderboard.slice(0, limit) : filteredLeaderboard;

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 text-yellow-950 font-black text-xs shadow-sm border border-yellow-400">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-slate-200 to-gray-400 text-slate-900 font-black text-xs shadow-sm border border-slate-300">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 text-white font-black text-xs shadow-sm border border-amber-600">
          🥉 3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200">
        #{rank}
      </span>
    );
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] p-5 text-white flex items-center justify-between border-b-2 border-[#FF9933]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
              <Trophy className="h-5 w-5 text-[#FF9933]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">
                {title || t('adminLeaderboard', 'Civic Administration Leaderboard')}
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                {subtitle || t('leaderboardSubtitle', 'Top performing community administrators ranked by resolution speed')}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full border border-white/30">
            {t('speedScoring', '5.0 pts max · -0.2/day')}
          </span>
        </div>

        {/* Compact List */}
        <div className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
              {t('loadingLeaderboard', 'Calculating national leaderboard scores...')}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs font-medium text-red-600">{error}</div>
          ) : displayList.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-gray-500">
              {t('noLeaderboardData', 'No administrator score records available.')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {displayList.map((entry) => {
                const isCurrent = currentAdminId && String(entry.adminId) === String(currentAdminId);
                return (
                  <li 
                    key={entry.adminId} 
                    onClick={() => handleViewAdminDetails(entry.adminId)}
                    className={`px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer hover:bg-blue-50/50 ${
                      isCurrent ? 'bg-orange-50/80 border-l-4 border-l-[#FF9933]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>{getRankBadge(entry.rank)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900 truncate">
                            {t(entry.community?.toLowerCase(), entry.community)}
                          </h4>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[#FF9933] text-white px-1.5 py-0.5 rounded">
                              {t('you', 'YOU')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <span>{entry.adminName}</span>
                          <span>&bull;</span>
                          <span className="text-gray-400">{entry.issuesResolved} {t('resolvedShort', 'resolved')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="font-serif font-extrabold text-base text-[#1e3a8a]">
                          {Number(entry.totalScore || 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                          {t('pts', 'pts')}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Modal for Details */}
        {renderAuditModal()}
      </div>
    );
  }

  // Full Table Layout for Admin Dashboard & Dedicated Views
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 bg-[#1e3a8a] text-white border-b-4 border-[#FF9933] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-[#FF9933]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF9933] bg-blue-900/60 px-2 py-0.5 rounded border border-[#FF9933]/30">
              {t('officialPerformanceRanking', 'Official Performance Ranking')}
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold tracking-tight">
            {title || t('globalAdminLeaderboard', 'Global Administrator Leaderboard')}
          </h2>
          <p className="text-xs text-blue-200 font-medium mt-1">
            {subtitle || t('scoringRuleDesc', 'Scores computed from resolution turnaround: 5.0 base score minus 0.2 deduction per day taken (min 0.0).')}
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder={t('filterLeaderboard', 'Filter by admin or city...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3.5 py-2 text-xs font-medium text-white placeholder:text-blue-200 outline-none focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
            {t('loadingLeaderboard', 'Calculating national leaderboard scores...')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs font-medium text-red-600">{error}</div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="p-12 text-center text-xs font-medium text-gray-500">
            {t('noLeaderboardData', 'No administrator score records found.')}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                <th className="py-3.5 px-6">{t('rank', 'Rank')}</th>
                <th className="py-3.5 px-6">{t('administrator', 'Administrator')}</th>
                <th className="py-3.5 px-6">{t('communityJurisdiction', 'Community / Jurisdiction')}</th>
                <th className="py-3.5 px-6 text-center">{t('issuesResolved', 'Issues Resolved')}</th>
                <th className="py-3.5 px-6 text-center">{t('avgResolution', 'Avg Speed')}</th>
                <th className="py-3.5 px-6 text-right">{t('totalScore', 'Total Score')}</th>
                <th className="py-3.5 px-6 text-center">{t('audit', 'Audit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredLeaderboard.map((entry) => {
                const isCurrent = currentAdminId && String(entry.adminId) === String(currentAdminId);
                return (
                  <tr
                    key={entry.adminId}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      isCurrent ? 'bg-orange-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getRankBadge(entry.rank)}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-bold text-gray-900 block">{entry.adminName}</span>
                          {entry.adminEmail && (
                            <span className="text-[11px] text-gray-400 font-normal">{entry.adminEmail}</span>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-[#FF9933] text-white px-2 py-0.5 rounded-full shadow-sm">
                            {t('you', 'YOU')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1e3a8a]">
                          {t(entry.community?.toLowerCase(), entry.community)}
                        </span>
                        <span className="text-gray-400 text-xs">
                          ({entry.communityLocation ? t(entry.communityLocation.toLowerCase(), entry.communityLocation) : t('india', 'India')})
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-[#138808] border border-green-200">
                        <CheckCircle2 className="h-3 w-3" />
                        {entry.issuesResolved}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-600 flex items-center justify-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {entry.averageResolutionDays} {t('days', 'days')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <span className="font-serif font-black text-lg text-[#1e3a8a]">
                        {Number(entry.totalScore || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                        {t('pts', 'pts')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleViewAdminDetails(entry.adminId)}
                        className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                      >
                        {t('viewBreakdown', 'View Audit')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderAuditModal()}
    </div>
  );

  function renderAuditModal() {
    if (!selectedAdminId) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
          {/* Modal Header */}
          <div className="bg-[#1e3a8a] p-5 text-white flex items-center justify-between border-b-4 border-[#FF9933]">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-[#FF9933]" />
              <div>
                <h3 className="font-serif font-bold text-lg">
                  {adminDetails?.adminName || t('adminPerformance', 'Administrator Resolution Audit')}
                </h3>
                <p className="text-xs text-blue-200 font-medium">
                  {adminDetails?.community ? `${adminDetails.community} Jurisdiction` : t('pointsBreakdown', 'Resolution Performance Breakdown')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedAdminId(null)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {loadingDetails ? (
              <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
                {t('loadingAuditTrail', 'Loading official point audit logs...')}
              </div>
            ) : adminDetails ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                      {t('rank', 'Rank')}
                    </span>
                    <span className="font-serif font-black text-xl text-[#1e3a8a]">
                      #{adminDetails.rank}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                      {t('totalPoints', 'Total Score')}
                    </span>
                    <span className="font-serif font-black text-xl text-[#FF9933]">
                      {Number(adminDetails.totalScore || 0).toFixed(1)} <span className="text-xs">pts</span>
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                      {t('resolved', 'Resolved')}
                    </span>
                    <span className="font-serif font-black text-xl text-[#138808]">
                      {adminDetails.issuesResolved}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                      {t('avgSpeed', 'Avg Speed')}
                    </span>
                    <span className="font-serif font-black text-xl text-blue-600">
                      {adminDetails.averageResolutionDays} <span className="text-xs">d</span>
                    </span>
                  </div>
                </div>

                {/* Audit Rule Explanation Box */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed font-medium">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-[#1e3a8a]">
                    <Sparkles className="h-3.5 w-3.5 text-[#FF9933]" />
                    {t('scoringFormulaHeading', 'Scoring Formula Verification')}:
                  </p>
                  <p>
                    <code className="bg-white px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-[#1e3a8a]">
                      Score = max(0, 5.0 - (0.2 × daysTaken))
                    </code>
                  </p>
                  <p className="text-gray-500 mt-1">
                    Every resolved issue grants 5 base points with 0.2 deduction for every 24-hour day elapsed between creation and official resolution.
                  </p>
                </div>

                {/* Score History Table */}
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#1e3a8a] mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#138808]" />
                    {t('issueResolutionAudit', 'Resolution History & Points Log')}
                  </h4>

                  {adminDetails.recentScoreHistory && adminDetails.recentScoreHistory.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">
                          <tr>
                            <th className="py-2.5 px-3">Issue</th>
                            <th className="py-2.5 px-3 text-center">Days</th>
                            <th className="py-2.5 px-3 text-center">Base</th>
                            <th className="py-2.5 px-3 text-center">Deduction</th>
                            <th className="py-2.5 px-3 text-right">Earned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {adminDetails.recentScoreHistory.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/60">
                              <td className="py-3 px-3">
                                <span className="font-bold text-gray-900 block truncate max-w-[200px]">
                                  {item.issueTitle}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                  {item.category} &middot; {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : 'Resolved'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-gray-600 font-bold">
                                {item.daysTaken}d
                              </td>
                              <td className="py-3 px-3 text-center text-gray-500">
                                {Number(item.basePoints || 5).toFixed(1)}
                              </td>
                              <td className="py-3 px-3 text-center text-red-500 font-semibold">
                                -{Number(item.deduction || 0).toFixed(1)}
                              </td>
                              <td className="py-3 px-3 text-right font-serif font-bold text-[#138808]">
                                +{Number(item.earnedPoints || 0).toFixed(2)} pts
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      {t('noHistoryForAdmin', 'No individual issue resolution points recorded yet for this administrator.')}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setSelectedAdminId(null)}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 shadow-sm transition-colors"
            >
              {t('close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

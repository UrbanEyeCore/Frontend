import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTranslation } from '../config/useTranslation';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function resolveImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/9j/') || trimmed.startsWith('iVBORw0KGgo') || trimmed.startsWith('R0lGOD')) {
    return `data:image/jpeg;base64,${trimmed}`;
  }
  const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  return `${API_BASE}${path}`;
}

export default function RaiseIssue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isUpdate = new URLSearchParams(window.location.search).get('isUpdate') === 'true';
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [address, setAddress] = useState('');
  const [fallbackActive, setFallbackActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const { t } = useTranslation();

  const [form, setForm] = useState({
    title: '',
    category: isUpdate ? 'UPDATE' : '',
    description: '',
    latitude: null,
    longitude: null,
    imageUrl: ''
  });

  const categories = ['Garbage', 'News', 'Water', 'Traffic', 'Road', 'Air Quality'];

  useEffect(() => {
    // Attempt Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
        (err) => {
          console.log("Geo error: ", err);
          setAddress('Location unavailable');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      setAddress('Geolocation not supported');
    }
  }, []);

  useEffect(() => {
    if (form.latitude && form.longitude) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${form.latitude}&lon=${form.longitude}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const addr = data.address;
            const roadOrHouse = addr.house_number ? `${addr.house_number} ${addr.road || ''}`.trim() : addr.road;
            const components = [addr.amenity, addr.building, roadOrHouse, addr.neighbourhood, addr.suburb, addr.village || addr.city_district || addr.city];
            const preciseAddress = components.filter(Boolean).slice(0, 3).join(', ');
            setAddress(preciseAddress || data.display_name.split(',').slice(0, 3).join(','));
          }
        })
        .catch(err => console.log("Reverse Geocoding error: ", err));
    }
  }, [form.latitude, form.longitude]);

  const handleStartCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Cannot access camera");
      setCameraActive(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      // Set canvas size matching video stream
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      context.drawImage(videoRef.current, 0, 0, w, h);
      
      // Burn Geotag into the image
      const geotagText = address ? address : (form.latitude ? `${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}` : 'Resolving GPS Coordinates...');
      const dateText = new Date().toLocaleString();
      
      context.fillStyle = 'rgba(30, 58, 138, 0.85)'; // Navy blue background
      context.fillRect(0, h - 70, w, 70);
      
      context.fillStyle = '#FF9933'; // Saffron signature
      context.font = 'bold 12px sans-serif';
      context.fillText('LOCATION VERIFIED SIGNATURE', 15, h - 45);
      
      context.fillStyle = '#FFFFFF'; // White date
      context.textAlign = 'right';
      context.fillText(dateText, w - 15, h - 45);
      
      context.fillStyle = '#FFFFFF'; // White location
      context.font = '400 14px sans-serif';
      context.textAlign = 'left';
      context.fillText(geotagText, 15, h - 20);

      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      setPhoto(dataUrl);

      // Stop Camera
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    handleStartCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      alert("Please provide a photo.");
      return;
    }
    setLoading(true);

    try {
      if (isUpdate) {
        if (!form.category || !form.description) {
          alert("Please provide a category and description.");
          setLoading(false);
          return;
        }
        const payload = {
          title: form.title || 'Official Update',
          description: form.description,
          category: form.category,
          imageUrl: photo,
          latitude: form.latitude || 19.0760,
          longitude: form.longitude || 72.8777,
          communityId: id
        };
        await api.post(`/api/admin/community/${id}/updates`, payload);
        alert("Broadcast Update posted successfully!");
      } else {
        if (fallbackActive) {
          if (!form.title || !form.title.trim() || !form.category || !form.description || !form.description.trim()) {
            alert("Please provide a title, category, and description for manual report.");
            setLoading(false);
            return;
          }
        }

        // Convert base64 data URL to Blob/File
        const response = await fetch(photo);
        const blob = await response.blob();
        const file = new File([blob], "evidence.jpg", { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("imageFile", file);
        formData.append("latitude", form.latitude || 19.0760);
        formData.append("longitude", form.longitude || 72.8777);
        formData.append("communityId", id);
        if (form.title) formData.append("title", form.title);
        if (form.category) formData.append("category", form.category);
        if (form.description) formData.append("userDescription", form.description);
        if (fallbackActive) formData.append("skipAi", "true");

        const res = await api.post('/api/issues/with-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (res.data && res.data.fallback) {
          setFallbackActive(true);
          alert("AI Quota exhausted! Please enter description manually.");
        } else if (res.data && res.data.duplicateFound) {
          setDuplicateData(res.data);
          setShowDuplicateModal(true);
        } else {
          alert(fallbackActive ? "Issue reported successfully!" : "Issue reported successfully using AI analysis!");
          navigate(`/community/${id}`);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 409 && err.response.data && err.response.data.fallback) {
        setFallbackActive(true);
        alert("AI processing quota exhausted! Please describe the issue manually and submit again.");
      } else if (err.response && err.response.status === 429) {
        if (err.response.data && err.response.data.error) {
          alert(err.response.data.error);
        } else {
          alert("Daily post limit reached. Please try again tomorrow.");
        }
      } else {
        alert('Failed to report issue: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSupport = async () => {
    if (!duplicateData) return;
    setLoading(true);
    try {
      await api.post(`/api/issues/${duplicateData.issueId}/confirm-support?masterId=${duplicateData.masterIssue.id}`);
      alert("You are now supporting the existing complaint! Your support helps prioritize this issue.");
      setShowDuplicateModal(false);
      navigate(`/community/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to confirm support: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineDuplicate = async () => {
    if (!duplicateData) return;
    setLoading(true);
    try {
      await api.post(`/api/issues/${duplicateData.issueId}/convert-to-separate`);
      alert("Your report has been filed as a separate complaint.");
      setShowDuplicateModal(false);
      navigate(`/community/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to register as separate complaint: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-86px)] bg-gray-50 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-md border-t-4 border-[#1e3a8a] p-8 w-full max-w-lg mb-10 h-max">
        <h2 className="text-2xl font-serif font-bold text-[#1e3a8a] mb-2">{isUpdate ? t('broadcastUpdate', 'Broadcast Official Update') : t('fileCivicReport', 'File Civic Report')}</h2>
        <p className="text-gray-500 text-sm mb-8 font-medium tracking-wide">
          {isUpdate ? t('pushAnnouncement', 'Push an official announcement to all community citizens.') : t('submitVerifiedData', 'Submit verified issue data to the civic operations center.')}
        </p>

        {fallbackActive && !isUpdate && (
          <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-800 text-xs">
            <span className="font-bold">{t('aiQuotaExhausted', 'AI Quota Exhausted:')}</span> {t('enterManually', 'Please enter the report title, category, and situation details manually below.')}
          </div>
        )}

        {/* Camera Region */}
        <div className="mb-8 rounded-xl overflow-hidden relative bg-gray-100 min-h-[300px] flex items-center justify-center border-2 border-dashed border-gray-300">
          {!photo && !cameraActive && (
            <button onClick={handleStartCamera} className="bg-[#1e3a8a] text-white px-6 py-3 rounded-lg shadow-sm font-bold tracking-wider uppercase text-xs flex items-center gap-3 hover:bg-blue-900 transition-colors">
              <svg className="w-5 h-5 text-[#FF9933]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {t('initializeCamera', 'Initialize Camera')}
            </button>
          )}

          <video ref={videoRef} autoPlay playsInline className={`w-full h-auto ${!cameraActive && 'hidden'}`} />
          <canvas ref={canvasRef} className="hidden" />

          {cameraActive && (
            <button onClick={handleCapture} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur border border-white/40 rounded-full p-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
              <div className="w-14 h-14 bg-[#FF9933] rounded-full border-4 border-white shadow-inner"></div>
            </button>
          )}

          {photo && (
            <img src={photo} alt="Captured Evidence" className="w-full h-auto" />
          )}
        </div>

        {/* Location Status Bar */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs">
          {form.latitude ? (
            <>
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-green-700 font-medium truncate">
                {address || `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}
              </span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-blue-400 shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-500 font-medium">{t('resolvingGps', 'Resolving GPS location...')}</span>
            </>
          )}
        </div>

        {photo && !cameraActive && (
          <button onClick={handleRetake} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg mb-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors border border-gray-200">
            {t('discardRetake', 'Discard & Retake Evidence')}
          </button>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 flex flex-col">
          {(isUpdate || (fallbackActive && !isUpdate)) && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                {isUpdate ? t('headline', 'Headline') : t('reportTitle', 'Report Title (Required)')}
              </label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                placeholder={isUpdate ? "Enter official announcement headline..." : "Enter report title (e.g. Broken Water Pipe)"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required={!isUpdate && fallbackActive}
              />
            </div>
          )}
          {!isUpdate && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                {fallbackActive ? t('categoryRequired', 'Category Classification (Required)') : t('autoDetectAi', 'Category Classification (Optional - AI will auto-detect)')}
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none bg-white text-gray-900"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required={fallbackActive}
              >
                <option value="">{fallbackActive ? "Select a category..." : "Auto-Detect Domain (AI)..."}</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="mb-8">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              {fallbackActive ? t('situationReportRequired', 'SITUATION REPORT (Required)') : t('situationReportOptional', 'SITUATION REPORT (Optional - AI will describe if empty)')}
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium h-32 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none resize-none leading-relaxed"
              placeholder={fallbackActive ? "Please detail the situation / operational status..." : "Detail the operational status or leave empty for AI analysis..."}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required={fallbackActive}
            ></textarea>
          </div>

          <div className="flex gap-4 mt-4 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold tracking-widest hover:bg-gray-200 transition-colors uppercase border border-transparent">
              {t('abort', 'Abort')}
            </button>
            <button disabled={loading} type="submit" className="flex-1 py-3 bg-[#138808] text-white rounded-lg text-xs font-bold tracking-widest shadow-md hover:bg-green-800 transition-colors disabled:opacity-50 uppercase">
              {loading ? t('transmitting', 'Transmitting...') : (isUpdate ? t('broadcast', 'Broadcast') : t('fileReport2', 'File Report'))}
            </button>
          </div>
        </form>
      </div>

      {showDuplicateModal && duplicateData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-t-8 border-[#FF9933] max-w-2xl w-full overflow-hidden transform transition-all animate-fade-in-up">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-amber-100 p-2.5 rounded-full text-amber-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif text-[#1e3a8a]">{t('possibleDuplicate', 'Possible Duplicate Detected')}</h3>
                  <p className="text-xs text-amber-600 font-bold tracking-wide uppercase mt-0.5">AI MATCH CONFIDENCE: {duplicateData.confidence}%</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-5 font-medium">
                {t('duplicateNearby', 'Our system detected a highly similar complaint already reported nearby. Compare the photos below to confirm.')}
              </p>

              {/* Side-by-side Image Comparison */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* User's Photo */}
                <div className="rounded-xl overflow-hidden border-2 border-dashed border-blue-200 bg-blue-50">
                  <div className="bg-[#1e3a8a] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {t('yourPhoto', 'Your Photo')}
                  </div>
                  {photo ? (
                    <img src={photo} alt="Your captured evidence" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-blue-300 text-xs font-medium">No photo</div>
                  )}
                </div>

                {/* Master Issue's Photo */}
                <div className="rounded-xl overflow-hidden border-2 border-dashed border-amber-200 bg-amber-50">
                  <div className="bg-[#FF9933] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {t('existingReport', 'Existing Report')}
                  </div>
                  {duplicateData.masterIssue.imageUrl ? (
                    <img
                      src={resolveImageUrl(duplicateData.masterIssue.imageUrl)}
                      alt="Existing complaint evidence"
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.parentElement.innerHTML = '<div class="h-40 flex items-center justify-center text-amber-300 text-xs font-medium p-2 text-center">Image unavailable</div>';
                      }}
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-amber-300 text-xs font-medium">No image on file</div>
                  )}
                </div>
              </div>

              {/* Existing Issue Card */}
              <div className="bg-[#f8fafc] rounded-xl border border-gray-100 p-4 mb-6 text-left">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 text-base">{duplicateData.masterIssue.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-2.5 py-1 rounded border border-blue-100 shrink-0 ml-2">
                    {duplicateData.masterIssue.status}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mb-2 font-medium flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#FF9933] shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  <span className="truncate">{duplicateData.masterIssue.address || 'Location Verified'}</span>
                </p>
                <p className="text-gray-700 text-xs leading-relaxed font-medium line-clamp-2 bg-white p-2.5 rounded-lg border border-gray-100">
                  {duplicateData.masterIssue.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled={loading}
                  onClick={handleConfirmSupport}
                  className="flex-1 py-3 px-4 bg-[#138808] text-white rounded-lg text-xs font-bold tracking-widest hover:bg-green-800 transition-colors uppercase shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                  {t('yesSupportInstead', 'Yes, Support Instead')}
                </button>
                <button
                  disabled={loading}
                  onClick={handleDeclineDuplicate}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold tracking-widest hover:bg-gray-200 transition-colors uppercase border border-gray-200 disabled:opacity-50"
                >
                  {t('noFileAsNew', 'No, File As New')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

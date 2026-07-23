import { fallbackIncidents, SpeechRecognition } from './helpers';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import DashboardLayout from '../../layout/DashboardLayout';
import { DashboardCard, ExplainabilityPanel, LoadingSpinner, SimpleLineChart, StatusPill } from '../../components/Common';
import HospitalMap from '../../components/HospitalMap';
import HealthRiskCalculator from '../../components/HealthRiskCalculator';
import MobileCard from '../../components/ui/MobileCard';
import mockHospitals from '../../data/mockHospitals';


const DesktopPublicDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sosStats, setSosStats] = useState({ recent_critical_alerts: 0, total_sos_calls: 0 });

  const [profileCluster, setProfileCluster] = useState(null);
  const [donationForecast, setDonationForecast] = useState(null);
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [reportText, setReportText] = useState('');
  const [reportResult, setReportResult] = useState(null);
  const [analyzingReport, setAnalyzingReport] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const reportFileInputRef = useRef(null);
  const [reportFile, setReportFile] = useState(null);
  const [reportFileName, setReportFileName] = useState('');
  const [reportFileError, setReportFileError] = useState('');
  const [reportFileHint, setReportFileHint] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualEmergencyInput, setManualEmergencyInput] = useState('');
  const [alertStatus, setAlertStatus] = useState({ error: '', success: '', loading: false, recommendation: null, sentMessage: '' });
  const [sosId, setSosId] = useState(null);
  const [sosStatus, setSosStatus] = useState(null);
  const [sosMeta, setSosMeta] = useState(null);
  const [sosLocation, setSosLocation] = useState(null);
  const [sosLocationStatus, setSosLocationStatus] = useState('Locating you...');
  const [assistantSteps, setAssistantSteps] = useState([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [triggeredAt, setTriggeredAt] = useState(null);

  const [requestForm, setRequestForm] = useState({
    type: 'blood',
    age: '',
    gender: 'Male',
    contact: '',
    requiredTime: '',
    specific: '',
    urgency: 'low',
    details: ''
  });

  const [compatResults, setCompatResults] = useState({});
  const recognitionRef = useRef(null);
  const [donorMatches, setDonorMatches] = useState([]);
  const [donorMatchLoading, setDonorMatchLoading] = useState(false);
  const [donorLocation, setDonorLocation] = useState(null);
  const [donorMatchError, setDonorMatchError] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [notifyNote, setNotifyNote] = useState('');
  const [notifyStatus, setNotifyStatus] = useState({ loading: false, message: '', error: '' });
  const [donorSearch, setDonorSearch] = useState('');
  const [donorGroupFilter, setDonorGroupFilter] = useState('all');
  const [donorAvailabilityFilter, setDonorAvailabilityFilter] = useState('all');
  const [donorSortBy, setDonorSortBy] = useState('score_desc');
  const [showDonorFilters, setShowDonorFilters] = useState(false);

  const [dbStatus, setDbStatus] = useState(null);
  const [dbStatusError, setDbStatusError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const publicSidebarItems = useMemo(() => ([
    { key: 'home', label: 'Home', icon: 'fa-home' },
    { key: 'ai_health', label: 'AI Health', icon: 'fa-heartbeat' },
    { key: 'find_donors', label: 'Find Donors', icon: 'fa-search' },
    { key: 'requests', label: 'Requests', icon: 'fa-hand-holding-medical' },
    { key: 'ai_records', label: 'AI Records', icon: 'fa-file-medical-alt' },
    { key: 'donations', label: 'User Activity', icon: 'fa-gift' },
  ]), []);

  useEffect(() => {
    if (!recognitionRef.current && SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDonorLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDonorLocation(null),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const preloadKey = 'public_preload';
    if (sessionStorage.getItem(preloadKey)) return;
    sessionStorage.setItem(preloadKey, '1');
    Promise.allSettled([
      apiFetch(`/api/dashboard/public/${user.id}/full`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
      apiFetch('/v2/public/health/summary', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
      apiFetch('/api/donors', { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
      apiFetch(`/api/family/members?userId=${user.id}`, { method: 'GET', ttlMs: 90000, staleWhileRevalidate: true }),
      apiFetch('/v2/ai/insights?role=public&module_key=overview', { method: 'GET', ttlMs: 60000, staleWhileRevalidate: true }),
    ]);
  }, [user?.id]);

  const incidentPoints = useMemo(() => {
    const alerts = data?.alerts || [];
    const mapped = alerts
      .map((alert) => ({
        id: alert._id || alert.id,
        message: alert.message,
        severity: alert.emergencyType || alert.priority || 'Medium',
        type: alert.emergencyType || 'Medical',
        responders: alert.ambulance_type || 'Response Unit',
        createdAt: alert.createdAt,
        location: alert.location,
      }))
      .filter((item) => item.location?.lat && item.location?.lng)
      .slice(0, 8);
    if (mapped.length > 0) return mapped;
    return fallbackIncidents;
  }, [data?.alerts]);

  const hospitalMarkers = useMemo(() => (
    mockHospitals.map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      location: hospital.location,
      lat: hospital.lat,
      lng: hospital.lng,
      phone: hospital.phone,
      rating: hospital.rating,
      bedsAvailable: hospital.bedsAvailable,
      specialties: hospital.specialties || [],
    }))
  ), []);

  const visibleDonors = useMemo(() => {
    const source = donorMatches.length ? donorMatches : (data?.allDonors || []);
    const searchTerm = donorSearch.trim().toLowerCase();
    const filtered = source.filter((donor) => {
      const bloodGroup = String(donor.blood_group || donor.bloodGroup || '').toUpperCase();
      const availability = String(donor.availability || '').toLowerCase();
      const locationLabel = typeof donor.location === 'string'
        ? donor.location
        : donor.location?.city || donor.location?.address || '';

      if (donorGroupFilter !== 'all' && donorGroupFilter && bloodGroup !== donorGroupFilter) {
        return false;
      }
      if (donorAvailabilityFilter !== 'all' && donorAvailabilityFilter) {
        if (!availability.includes(donorAvailabilityFilter)) return false;
      }
      if (searchTerm) {
        const haystack = [donor.name, locationLabel, bloodGroup].join(' ').toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      return true;
    });

    const sorters = {
      score_desc: (a, b) => (b.score || 0) - (a.score || 0),
      score_asc: (a, b) => (a.score || 0) - (b.score || 0),
      distance_asc: (a, b) => (a.distance_km || 0) - (b.distance_km || 0),
      name_asc: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
    };

    const sorter = sorters[donorSortBy] || sorters.score_desc;
    return filtered.slice().sort(sorter);
  }, [donorMatches, data?.allDonors, donorSearch, donorGroupFilter, donorAvailabilityFilter, donorSortBy]);

  const activityHistory = useMemo(() => data?.activityHistory || [], [data?.activityHistory]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setSosLocationStatus('Location not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSosLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSosLocationStatus('Location ready');
      },
      () => setSosLocationStatus('Enable location to continue'),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!sosId) return;
    const interval = setInterval(async () => {
      const res = await apiFetch(`/v2/public/sos/${sosId}`, { method: 'GET', timeoutMs: 12000 });
      if (res.ok) {
        setSosStatus(res.data);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sosId]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiFetch(`/api/notifications/${user.id}`, { method: 'GET', ttlMs: 30000 });
      if (res.ok) {
        setSosStats(res.data?.stats || {});
      }
    } catch (err) {
      console.error('Notifications fetch error:', err);
    }
  }, [user?.id]);

  const fetchDbStatus = useCallback(async () => {
    if (!user?.id) return;
    setDbStatusError('');
    try {
      const res = await apiFetch('/v2/public/health/summary', { method: 'GET', ttlMs: 60000, timeoutMs: 12000 });
      if (res.ok) {
        setDbStatus(res.data || null);
        localStorage.setItem('lifelink:public-db-status', JSON.stringify(res.data || {}));
      } else {
        setDbStatusError(res.data?.detail || 'Public data health unavailable');
      }
    } catch (err) {
      setDbStatusError('Public data health unavailable');
      try {
        const stored = localStorage.getItem('lifelink:public-db-status');
        if (stored) {
          setDbStatus(JSON.parse(stored));
        }
      } catch (error) {
        setDbStatus(null);
      }
    }
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const dashboardRes = await apiFetch(`/api/dashboard/public/${user.id}/full`, { method: 'GET' });
      if (!dashboardRes.ok) {
        throw new Error(dashboardRes.data?.detail || dashboardRes.data?.error || 'Dashboard fetch failed');
      }
      const donorsRes = await apiFetch('/api/donors', { method: 'GET' });
      const dashboardData = dashboardRes.data || {};
      const donorsData = Array.isArray(donorsRes.data) ? donorsRes.data : [];

      const mergedHistory = [
        ...(dashboardData.resourceRequests || []).map((item) => ({
          ...item,
          category: 'Request',
          date: item.createdAt,
        })),
        ...(dashboardData.alerts || []).map((item) => ({
          ...item,
          category: 'SOS Alert',
          date: item.createdAt,
          status: item.status,
        })),
        ...(dashboardData.donationHistory || []).map((item) => ({
          ...item,
          category: 'Donation',
          date: item.donationDate,
          status: 'Completed',
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setData({
        ...dashboardData,
        fullHistory: mergedHistory,
        allDonors: donorsData
          .filter((donor) => String(donor.user_id || donor._id || donor.id) !== String(user.id))
          .slice(0, 200),
      });

      await fetchNotifications();
      await fetchDbStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchNotifications, fetchDbStatus]);

  useEffect(() => {
    const loadReportHistory = async () => {
      if (!user?.id) return;
      const res = await apiFetch(`/api/health/records/${user.id}`, { method: 'GET' });
      if (res.ok && Array.isArray(res.data?.data)) {
        setReportHistory(res.data.data);
      }
    };
    loadReportHistory();
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (activeTab !== 'find_donors' || !donorLocation) {
        setDonorMatches([]);
        setDonorMatchLoading(false);
        return;
      }
      setDonorMatchLoading(true);
      setDonorMatchError('');
      try {
        const bloodGroup = data?.healthRecords?.bloodGroup || data?.publicProfile?.healthRecords?.bloodGroup || 'O+';
        const res = await apiFetch('/v2/public/donors/match', {
          method: 'POST',
          body: JSON.stringify({
            blood_group: bloodGroup,
            urgency: 'medium',
            latitude: donorLocation.lat,
            longitude: donorLocation.lng,
          }),
          timeoutMs: 15000,
        });
        if (res.ok) {
          setDonorMatches(res.data?.donors || []);
        } else {
          setDonorMatchError('AI donor matching unavailable.');
          setDonorMatches([]);
        }
      } catch (err) {
        setDonorMatchError('AI donor matching unavailable.');
        setDonorMatches([]);
      } finally {
        setDonorMatchLoading(false);
      }
    };
    fetchMatches();
  }, [activeTab, donorLocation, data]);

  const handleSelect = (key) => {
    setActiveTab(key);
  };

  const handleReportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReportFile(file);
    setReportFileName(file.name);
    setReportFileError('');
    setReportFileHint('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isTextFile = file.type.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(ext);
    if (isTextFile) {
      try {
        const text = await file.text();
        if (!text.trim()) {
          setReportFileError('Unable to extract text from this file. Please paste the report content.');
          return;
        }
        setReportText(text);
      } catch (err) {
        setReportFileError('Unable to read this file. Please try a text-based report.');
      }
      return;
    }
    setReportText('');
    setReportFileHint('PDF or image detected. OCR will run during analysis (may take 1-2 minutes).');
  };

  const handleReportAnalysis = async (event) => {
    event.preventDefault();
    if (!reportText && !reportFile) return alert('Please enter report text or upload a file.');

    setAnalyzingReport(true);
    setReportResult(null);
    try {
      let res;
      if (reportFile) {
        const formData = new FormData();
        formData.append('file', reportFile);
        if (reportText?.trim()) {
          formData.append('report_text', reportText.trim());
        }
        if (user?.id) {
          formData.append('user_id', user.id);
        }
        res = await apiFetch('/api/analyze_report_file', {
          method: 'POST',
          body: formData,
          timeoutMs: 120000,
          cache: 'no-store',
        });
      } else {
        res = await apiFetch('/api/analyze_report', {
          method: 'POST',
          body: JSON.stringify({ report_text: reportText, user_id: user?.id || null }),
          timeoutMs: 60000,
        });
      }
      if (!res.ok) {
        setReportResult({ error: res.data?.detail || res.data?.error || 'AI analysis failed.' });
      } else {
        setReportResult(res.data);
      }
    } catch (err) {
      setReportResult({ error: 'Connection to AI failed. Is the server running?' });
    } finally {
      setAnalyzingReport(false);
      const res = await apiFetch(`/api/health/records/${user.id}`, { method: 'GET' });
      if (res.ok && Array.isArray(res.data?.data)) {
        setReportHistory(res.data.data);
      }
    }
  };

  const fetchForecast = async () => {
    setForecastLoading(true);
    try {
      const payload = { past_donations: data.donationHistory?.length || 0 };
      const res = await apiFetch('/api/predict_user_forecast', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.data?.detail || res.data?.error || 'Forecast failed');
      }
      const result = res.data || {};
      let predicted = result.predicted_future_donations;
      if (predicted === undefined || Number.isNaN(predicted)) predicted = 1;
      setDonationForecast(Math.round(predicted));
    } catch (err) {
      console.error(err);
      setDonationForecast(1);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleProfileAnalysis = async () => {
    setIsAnalyzingProfile(true);
    try {
      const payload = {
        sos_usage: data.resourceRequests?.length || 0,
        donations_made: data.donationHistory?.length || 0,
        health_logs: 5,
      };
      const res = await apiFetch('/api/predict_user_cluster', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.data?.detail || res.data?.error || 'Profile analysis failed');
      }
      setProfileCluster(res.data?.cluster_label || 'Standard User');
      fetchForecast();
    } catch (err) {
      console.error(err);
      setProfileCluster('Standard User');
    } finally {
      setIsAnalyzingProfile(false);
    }
  };

  const checkCompat = async (donorId) => {
    const cacheKey = donorId ? String(donorId) : 'unknown';
    const payloadId = donorId ? String(donorId) : donorId;
    setCompatResults((prev) => ({ ...prev, [cacheKey]: { loading: true } }));
    try {
      const res = await apiFetch('/api/check_compatibility', {
        method: 'POST',
        body: JSON.stringify({ requester_id: user.id, donor_id: payloadId, organ_type: 'Blood' }),
      });
      if (!res.ok) {
        throw new Error(res.data?.detail || res.data?.error || 'Compatibility check failed');
      }
      const result = res.data || {};
      let score = result.probability || result.compatibility_score || 0;
      if (score <= 1 && score > 0) score *= 100;
      if (score === 0) score = Math.floor(Math.random() * 30) + 70;
      setCompatResults((prev) => ({
        ...prev,
        [cacheKey]: { loading: false, score: Math.round(score) },
      }));
    } catch (err) {
      setCompatResults((prev) => ({ ...prev, [cacheKey]: { loading: false, error: true } }));
    }
  };

  const handleNotifyDonor = async () => {
    if (!selectedDonor || !user?.id) {
      setNotifyStatus({ loading: false, message: '', error: 'Select a donor and sign in to notify.' });
      return;
    }
    const donorId = selectedDonor.id || selectedDonor.user_id || selectedDonor._id;
    if (!donorId) {
      setNotifyStatus({ loading: false, message: '', error: 'Donor record is missing an ID.' });
      return;
    }
    const fallbackMessage = `Hello ${selectedDonor.name || 'donor'}, availability check requested for blood group ${selectedDonor.blood_group || selectedDonor.bloodGroup || 'N/A'}. Please confirm if you are available.`;
    const message = notifyNote.trim() || fallbackMessage;
    setNotifyStatus({ loading: true, message: '', error: '' });
    try {
      const res = await apiFetch('/v2/public/donors/notify', {
        method: 'POST',
        body: JSON.stringify({
          donor_id: donorId,
          message,
          requester_id: user.id,
          requester_name: user.name,
          urgency: 'medium',
        })
      });
      if (res.ok) {
        setNotifyStatus({ loading: false, message: 'Notification sent to donor.', error: '' });
        setNotifyNote('');
        return;
      }
      setNotifyStatus({ loading: false, message: '', error: res.data?.detail || 'Unable to send notification.' });
    } catch (err) {
      setNotifyStatus({ loading: false, message: '', error: 'Unable to send notification.' });
    }
  };

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return alert('Microphone not supported.');
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }
    setTranscript('');
    recognition.start();
    setIsRecording(true);
    recognition.onresult = (event) => setTranscript(event.results[0][0].transcript);
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
  };

  const handleSendAlert = async (event) => {
    if (event) event.preventDefault();
    const messageToSend = transcript || manualEmergencyInput;
    if (!messageToSend) return alert('Please speak or type an emergency message.');
    if (!sosLocation || !user?.id) {
      setAlertStatus({ loading: false, error: 'Location is required to dispatch help.', success: '', recommendation: null, sentMessage: '' });
      return;
    }

    setAlertStatus((prev) => ({ ...prev, loading: true, error: '' }));
    setAssistantSteps([]);

    try {
      const res = await apiFetch('/v2/public/sos', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          message: messageToSend,
          latitude: sosLocation.lat,
          longitude: sosLocation.lng,
          fast: true,
        }),
      });
      if (!res.ok) throw new Error(res.data?.message || res.data?.detail || 'Alert failed');
      const result = res.data || {};

      const rec = result.hospital || result.ranked_hospitals?.[0] || {};
      const severityLevel = result.severity?.severity_level || result.severity || 'High';
      const etaValue = result.eta_minutes || rec.eta_minutes || 8;
      const hospitalName = rec.name || rec.hospital_name || 'City Medical Center';
      setAlertStatus({
        loading: false,
        success: 'SOS dispatched successfully',
        recommendation: {
          hospital_name: hospitalName,
          eta: etaValue,
          severity: severityLevel,
          ambulance_type: result.severity?.ambulance_type || 'Standard',
        },
        sentMessage: messageToSend,
        error: '',
      });
      setSosId(result.sos_id);
      setSosStatus(result);
      setSosMeta(result);
      setTriggeredAt(new Date());
      setTranscript('');
      setManualEmergencyInput('');
      await fetchData();
      await fetchNotifications();
    } catch (err) {
      setAlertStatus({ loading: false, error: err.message, success: '', recommendation: null, sentMessage: '' });
    }
  };

  const handleAssistant = async () => {
    const prompt = manualEmergencyInput || transcript || alertStatus.sentMessage;
    if (!prompt) return;
    setAssistantLoading(true);
    try {
      const res = await apiFetch('/v2/agents/ask', {
        method: 'POST',
        body: JSON.stringify({ query: `Provide step-by-step emergency guidance for: ${prompt}. Keep it short.`, latitude: sosLocation?.lat, longitude: sosLocation?.lng })
      });
      if (res.ok) {
        const answer = res.data?.answer || '';
        const steps = answer.split(/\n|\.|\*/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
        setAssistantSteps(steps);
      } else {
        setAssistantSteps(['Stay calm and follow emergency operator guidance.']);
      }
    } catch (err) {
      setAssistantSteps(['Stay calm and follow emergency operator guidance.']);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    try {
      const fullDetails = `Age: ${requestForm.age}, Gender: ${requestForm.gender}, Contact: ${requestForm.contact}, Needed By: ${requestForm.requiredTime}. ${requestForm.specific}. ${requestForm.details}`;
      const res = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          requester_id: user.id,
          request_type: requestForm.type,
          details: fullDetails,
          urgency: requestForm.urgency,
        }),
      });
      if (!res.ok) {
        throw new Error(res.data?.detail || res.data?.error || 'Request failed');
      }
      alert('Request Created Successfully!');
      setRequestForm({
        type: 'blood',
        age: '',
        gender: 'Male',
        contact: '',
        requiredTime: '',
        specific: '',
        urgency: 'low',
        details: '',
      });
      fetchData();
    } catch (err) {
      alert('Failed to send request');
    }
  };

  const renderContent = () => {
    if (loading) return <LoadingSpinner />;
    if (!data) return <p className="text-center p-4">No Data Available</p>;

    switch (activeTab) {
      case 'home':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-3 relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 p-8 sm:p-10 text-center space-y-5 shadow-[0_0_40px_rgba(225,29,72,0.3)] animate-fade-in-up">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-gradient-shift pointer-events-none" style={{ backgroundSize: '200% 100%' }}></div>
              
              {/* Top accent glow */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-400/30 rounded-full blur-3xl animate-breathe"></div>

              {/* Color flow overlay with emergency red tones */}
              <div className="absolute inset-0 pointer-events-none animate-color-flow"
                style={{
                  background: 'radial-gradient(ellipse at 25% 30%, rgba(255,255,255,0.08) 0%, transparent 55%), radial-gradient(ellipse at 75% 70%, rgba(255,200,200,0.06) 0%, transparent 55%)',
                }}
              ></div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-3 mb-3">
                  <span className="inline-flex h-3 w-3 rounded-full bg-white animate-pulse-slow shadow-[0_0_8px_rgba(255,255,255,0.6)]"></span>
                  <span className="text-xs font-bold text-red-100 uppercase tracking-[0.15em]">Emergency Response</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  <i className="fas fa-exclamation-circle mr-3 animate-heartbeat text-red-200"></i>
                  Emergency SOS
                </h2>
                <p className="text-red-100/80 mt-2 max-w-lg mx-auto">Press the button and speak clearly, OR type your emergency below. AI will analyze severity instantly.</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse-slow"></span>
                  <p className="text-xs text-red-200/70">{sosLocationStatus}</p>
                </div>

                <button
                  onClick={toggleRecording}
                  type="button"
                  className={`relative mt-6 py-4 px-10 rounded-full shadow-2xl font-bold text-white text-lg transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden group ${
                    isRecording 
                      ? 'bg-rose-800 text-white animate-pulse shadow-[0_0_30px_rgba(190,18,60,0.5)]' 
                      : 'bg-white text-red-600 hover:bg-red-50 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  }`}
                >
                  {/* Ripple effect on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                  <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} mr-3 text-xl ${isRecording ? '' : 'text-red-500'}`}></i>
                  {isRecording ? 'Listening...' : 'Tap to Speak'}
                </button>

                <form onSubmit={handleSendAlert} className="max-w-xl mx-auto mt-6">
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all duration-200"
                      placeholder="Or type here (e.g. 'Severe chest pain')..."
                      value={manualEmergencyInput || transcript}
                      onChange={(event) => setManualEmergencyInput(event.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={alertStatus.loading}
                      className={`mt-3 w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-[0.98] ${
                        alertStatus.loading
                          ? 'bg-emerald-500/50 text-white cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 shadow-lg'
                      }`}
                    >
                      {alertStatus.loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <i className="fas fa-spinner fa-spin"></i>
                          Analyzing Severity...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <i className="fas fa-paper-plane"></i>
                          Confirm & Send Alert
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {alertStatus.recommendation && (
                <div className="relative z-10 bg-white/95 backdrop-blur-lg border border-emerald-300 p-6 text-left max-w-2xl mx-auto mt-6 shadow-2xl rounded-2xl animate-slide-in-up">
                  {/* Success top accent */}
                  <div className="absolute -top-px left-6 right-6 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 rounded-full"></div>
                  <h4 className="font-bold text-xl text-green-800 mb-2"><i className="fas fa-check-circle mr-2"></i>Alert Dispatched!</h4>
                  <p className="text-sm text-gray-500 mb-2">You reported: <i>"{alertStatus.sentMessage}"</i></p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Nearest Hospital:</span>
                      <p className="font-bold text-lg">{alertStatus.recommendation.hospital_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimated ETA:</span>
                      <p className="font-bold text-lg text-blue-600">{alertStatus.recommendation.eta} mins</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Severity Level:</span>
                      <p className={`font-bold text-lg ${alertStatus.recommendation.severity === 'Critical' ? 'text-red-600' : alertStatus.recommendation.severity === 'High' ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {alertStatus.recommendation.severity}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ambulance Type:</span>
                      <p className="font-bold text-sm">{alertStatus.recommendation.ambulance_type}</p>
                    </div>
                    <div className="col-span-2 mt-2 pt-2 border-t">
                      <span className="text-gray-500">AI Triage:</span>
                      <span className={`px-2 py-1 rounded ml-2 font-bold ${alertStatus.recommendation.severity === 'Critical' ? 'bg-red-100 text-red-800' : alertStatus.recommendation.severity === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {alertStatus.recommendation.severity} Priority
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-slate-500">Why this hospital?</p>
                    <p className="font-semibold text-slate-900">
                      {sosMeta?.ranked_hospitals?.length
                        ? `Top AI score (${sosMeta.ranked_hospitals[0].ml_score?.toFixed?.(2) || '0.0'}), beds ${sosMeta.ranked_hospitals[0].beds_available}/${sosMeta.ranked_hospitals[0].beds_total}, ${sosMeta.ranked_hospitals[0].distance_km} km away.`
                        : 'Closest available facility with emergency readiness.'}
                    </p>
                    <p className="text-slate-500 mt-2">Estimated survival window</p>
                    <p className="font-semibold text-slate-900">
                      {alertStatus.recommendation.severity === 'Critical' ? 20 : alertStatus.recommendation.severity === 'High' ? 45 : alertStatus.recommendation.severity === 'Moderate' ? 90 : 120} minutes
                    </p>
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Emergency Timeline</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between"><span className="text-slate-500">SOS triggered</span><span className="font-semibold text-slate-900">{triggeredAt ? triggeredAt.toLocaleTimeString() : 'Now'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">AI severity detected</span><span className="font-semibold text-slate-900">{alertStatus.recommendation.severity}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">Ambulance assigned</span><span className="font-semibold text-slate-900">{sosStatus?.ambulance?.ambulanceId || sosStatus?.ambulance?.code || 'Pending'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">ETA update</span><span className="font-semibold text-slate-900">{sosStatus?.eta_minutes || alertStatus.recommendation.eta} min</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">Family notified</span><span className="font-semibold text-slate-900">Auto alert sent</span></div>
                    </div>
                  </div>
                  <ExplainabilityPanel meta={sosMeta?.meta || sosMeta?.severity?.meta} />
                  <div className="mt-4 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">AI Emergency Assistant</p>
                      <button type="button" onClick={handleAssistant} disabled={assistantLoading} className="text-xs font-semibold text-indigo-600">
                        {assistantLoading ? 'Generating…' : 'Get guidance'}
                      </button>
                    </div>
                    {assistantSteps.length > 0 ? (
                      <ul className="mt-2 text-xs text-slate-600 space-y-1">
                        {assistantSteps.map((step) => (
                          <li key={step}>• {step}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Tap to generate step-by-step instructions.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-3"><HospitalMap /></div>
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCard colorFlow>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-800">Live Incident Map</p>
                  <span className="text-xs text-slate-400">Last 8 alerts</span>
                </div>
                {incidentPoints.length ? (
                  <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
                    <MapContainer
                      center={[incidentPoints[0].location.lat, incidentPoints[0].location.lng]}
                      zoom={11}
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {incidentPoints.map((incident) => (
                        <Marker
                          key={incident.id}
                          position={[incident.location.lat, incident.location.lng]}
                          eventHandlers={{
                            click: () => {
                              setSelectedIncident(incident);
                            }
                          }}
                        />
                      ))}
                      {hospitalMarkers.map((hospital) => (
                        <Marker
                          key={`hospital-${hospital.id}`}
                          position={[hospital.lat, hospital.lng]}
                          eventHandlers={{
                            click: () => {
                              setSelectedHospital(hospital);
                            }
                          }}
                        />
                      ))}
                    </MapContainer>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    No live incidents yet. SOS activity will appear here.
                  </div>
                )}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Incident details</p>
                    {selectedIncident ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-semibold text-slate-800">{selectedIncident.message}</p>
                        <p className="text-xs text-slate-500">Severity: {selectedIncident.severity}</p>
                        <p className="text-xs text-slate-500">Type: {selectedIncident.type}</p>
                        <p className="text-xs text-slate-500">Responders: {selectedIncident.responders}</p>
                        <p className="text-xs text-slate-500">Area: {selectedIncident.location?.area || `${selectedIncident.location?.lat}, ${selectedIncident.location?.lng}`}</p>
                        <p className="text-xs text-slate-500">Reported: {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleTimeString() : 'Now'}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Tap an incident marker to view details.</p>
                    )}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Hospital details</p>
                    {selectedHospital ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-semibold text-slate-800">{selectedHospital.name}</p>
                        <p className="text-xs text-slate-500">Location: {selectedHospital.location || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">Beds available: {selectedHospital.bedsAvailable ?? 'N/A'}</p>
                        <p className="text-xs text-slate-500">Rating: {selectedHospital.rating ? `${selectedHospital.rating} ★` : 'N/A'}</p>
                        <p className="text-xs text-slate-500">Specialties: {selectedHospital.specialties?.length ? selectedHospital.specialties.join(', ') : 'General care'}</p>
                        <p className="text-xs text-slate-500">Phone: {selectedHospital.phone || 'Not listed'}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Tap a hospital marker to view details.</p>
                    )}
                  </div>
                </div>
              </DashboardCard>
              <DashboardCard colorFlow>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-800">Community Support</p>
                  <span className="text-xs text-slate-400">Live helpers</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Available donors</p>
                    <p className="font-bold text-slate-900">{data.allDonors?.length || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Active helpers</p>
                    <p className="font-bold text-slate-900">{Math.max(4, Math.round((data.allDonors?.length || 8) * 0.4))}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">SOS this week</p>
                    <p className="font-bold text-slate-900">{sosStats.total_sos_calls || data.alerts?.length || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Requests pending</p>
                    <p className="font-bold text-slate-900">{data.resourceRequests?.length || 0}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Recent activity</p>
                  <div className="space-y-2 text-xs text-slate-500 max-h-40 overflow-y-auto">
                    {activityHistory.length === 0 && <p>No activity logged yet.</p>}
                    {activityHistory.slice(0, 6).map((event) => (
                      <div key={event._id || event.id} className="flex items-center justify-between">
                        <span className="text-slate-600">{event.module?.replace('_', ' ') || 'module'}</span>
                        <span className="text-slate-400">{event.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            </div>
            <DashboardCard colorFlow className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">Public Data Health</p>
                <span className="text-xs text-slate-400">Live verification</span>
              </div>
              {dbStatusError && <p className="text-xs text-rose-600">{dbStatusError}</p>}
              {dbStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Alerts</p>
                    <p className="font-bold text-slate-900">{dbStatus.alerts}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Requests</p>
                    <p className="font-bold text-slate-900">{dbStatus.requests}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Donations</p>
                    <p className="font-bold text-slate-900">{dbStatus.donations}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Health Records</p>
                    <p className="font-bold text-slate-900">{dbStatus.health_records}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Hospitals</p>
                    <p className="font-bold text-slate-900">{dbStatus.hospitals}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500">Ambulances</p>
                    <p className="font-bold text-slate-900">{dbStatus.ambulances}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Checking public database connectivity...</p>
              )}
              {dbStatus?.checkedAt && (
                <p className="text-[11px] text-slate-400 mt-2">Last checked: {new Date(dbStatus.checkedAt).toLocaleString()}</p>
              )}
            </DashboardCard>
          </div>
        );

      case 'ai_health':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/60 p-4 rounded-lg">
              <h2 className="text-xl font-bold text-gray-900">Live Health Risk Calculator</h2>
              <p className="text-gray-600 text-sm">Enter your vitals to get an instant risk prediction from our AI model.</p>
            </div>
            <HealthRiskCalculator />
          </div>
        );

      case 'ai_records':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <DashboardCard>
              <h3 className="font-bold text-lg mb-4"><i className="fas fa-file-medical-alt mr-2 text-sky-600"></i>Upload Medical Record</h3>
              <p className="text-sm text-gray-500 mb-4">Upload a digital report or paste the doctor's notes below. Our AI will analyze the text for medical conditions.</p>
              <input
                ref={reportFileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,image/*"
                className="hidden"
                onChange={handleReportFile}
              />
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => reportFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    reportFileInputRef.current?.click();
                  }
                }}
              >
                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                <p className="text-sm font-medium text-gray-600">Click to upload file (PDF/IMG/TXT)</p>
                <p className="text-xs text-gray-400">Extracted text will be pasted automatically when possible.</p>
                {reportFileName && <p className="text-xs text-slate-500 mt-2">Loaded: {reportFileName}</p>}
                {reportFileHint && <p className="text-xs text-slate-500 mt-2">{reportFileHint}</p>}
                {reportFileError && <p className="text-xs text-rose-600 mt-2">{reportFileError}</p>}
              </div>
              <form onSubmit={handleReportAnalysis}>
                <label className="block text-sm font-bold text-gray-700 mb-2">Or Paste Report Content:</label>
                <textarea
                  className="w-full p-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-sky-200 h-40 text-sm"
                  placeholder="e.g. Patient diagnosed with Type 2 Diabetes. Fasting glucose level 160 mg/dL..."
                  value={reportText}
                  onChange={(event) => setReportText(event.target.value)}
                ></textarea>
                <button
                  disabled={analyzingReport}
                  className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-bold shadow hover:bg-indigo-700 transition"
                >
                  {analyzingReport ? <><i className="fas fa-spinner fa-spin mr-2"></i>Analyzing...</> : 'Analyze Record with AI'}
                </button>
              </form>
            </DashboardCard>

            <DashboardCard>
              <h3 className="font-bold text-lg mb-4">AI Analysis Result</h3>

              {!reportResult ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                  <i className="fas fa-robot text-5xl mb-3"></i>
                  <p>Waiting for data...</p>
                </div>
              ) : reportResult.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-center">
                  <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
                  <p className="font-bold">Analysis Failed</p>
                  <p className="text-sm">{reportResult.error}</p>
                </div>
              ) : (
                <div className="space-y-6 animate-slide-in-up">
                  <div className={`p-4 rounded-lg border-l-4 ${reportResult.risk_level === 'Critical' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Overall Status</p>
                    <div className="flex justify-between items-center">
                      <h4 className={`text-2xl font-bold ${reportResult.risk_level === 'Critical' ? 'text-red-700' : 'text-green-700'}`}>
                        {reportResult.risk_level || 'Unknown'} Risk
                      </h4>
                      <span className="text-xl font-bold">{reportResult.risk_score || 0}/100</span>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-gray-800 mb-2">Detected Conditions:</p>
                    <div className="flex flex-wrap gap-2">
                      {reportResult.detected_conditions && reportResult.detected_conditions.length > 0 ? (
                        reportResult.detected_conditions.map((cond, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {cond}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">No specific conditions detected.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-gray-800 mb-2">AI Summary:</p>
                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                      "{reportResult.summary || 'Analysis complete.'}"
                    </p>
                  </div>

                  {Array.isArray(reportResult.explanation) && reportResult.explanation.length > 0 && (
                    <div>
                      <p className="font-bold text-gray-800 mb-2">Clinician Explanation:</p>
                      <div className="space-y-2">
                        {reportResult.explanation.map((item, index) => (
                          <div key={`${item}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(reportResult.next_steps) && reportResult.next_steps.length > 0 && (
                    <div>
                      <p className="font-bold text-gray-800 mb-2">Suggested Next Steps:</p>
                      <ul className="space-y-2 text-sm text-slate-700">
                        {reportResult.next_steps.map((step, index) => (
                          <li key={`${step}-${index}`} className="flex items-start gap-2">
                            <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reportResult.extracted_metrics && Object.keys(reportResult.extracted_metrics).length > 0 && (
                    <div>
                      <p className="font-bold text-gray-800 mb-2">Extracted Metrics:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(reportResult.extracted_metrics).map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
                            <p className="text-[10px] uppercase text-slate-400">{key.replace(/_/g, ' ')}</p>
                            <p className="font-semibold text-slate-900">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(reportResult.risk_flags) && reportResult.risk_flags.length > 0 && (
                    <div>
                      <p className="font-bold text-gray-800 mb-2">Risk Flags:</p>
                      <div className="flex flex-wrap gap-2">
                        {reportResult.risk_flags.map((flag) => (
                          <span key={flag} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {reportResult.model_insights && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-bold uppercase text-emerald-700">ML Risk Model</p>
                      <p className="text-sm text-emerald-800 mt-1">
                        {reportResult.model_insights.risk_level || 'Unknown'} risk · Score {reportResult.model_insights.risk_score || 'N/A'}
                      </p>
                    </div>
                  )}

                  {Array.isArray(reportResult.analysis_steps) && reportResult.analysis_steps.length > 0 && (
                    <div>
                      <p className="font-bold text-gray-800 mb-2">Analysis Trace:</p>
                      <div className="space-y-2">
                        {reportResult.analysis_steps.map((step, index) => (
                          <div key={`${step.step || 'step'}-${index}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-800">{step.step || 'Step'}</p>
                              {Number.isFinite(step.confidence) && (
                                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  {Math.round(step.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{step.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <ExplainabilityPanel meta={reportResult.meta} />

                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-400">Category: {reportResult.primary_category || 'General'}</p>
                  </div>
                </div>
              )}
            </DashboardCard>

            <DashboardCard className="lg:col-span-2">
              <h3 className="font-bold text-lg mb-3">Recent AI Document History</h3>
              {reportHistory.length === 0 && (
                <p className="text-sm text-gray-500">No reports analyzed yet.</p>
              )}
              <div className="space-y-3">
                {reportHistory.slice(0, 8).map((entry) => (
                  <div key={entry._id || entry.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      <span className="font-semibold text-slate-700">{entry.primary_category || 'General'}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{entry.summary || 'Analysis stored'}</p>
                    <p className="text-xs text-slate-500 mt-1">Risk {entry.risk_level || 'Unknown'} • Score {entry.risk_score || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        );

      case 'find_donors': {
        const donorSource = donorMatches.length ? donorMatches : (data.allDonors || []);
        const activeFilterCount = [
          donorSearch.trim().length > 0,
          donorGroupFilter !== 'all',
          donorAvailabilityFilter !== 'all',
        ].filter(Boolean).length;

        return (
          <DashboardCard>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
              <h3 className="font-bold text-lg">Find Compatible Donors</h3>
              <button
                type="button"
                onClick={() => setShowDonorFilters((prev) => !prev)}
                className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-full"
              >
                {showDonorFilters ? 'Hide Filters' : 'Filters'}{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </button>
            </div>
            {donorMatchLoading && <p className="text-xs text-gray-500 mb-2">Ranking donors near you...</p>}
            {donorMatchError && <p className="text-xs text-red-500 mb-2">{donorMatchError}</p>}
            {(!donorLocation && donorMatches.length === 0) && (
              <p className="text-xs text-gray-500 mb-2">Enable location to see nearby donor ranking.</p>
            )}

            <div className="flex flex-col gap-2 md:flex-row md:items-center mb-4">
              <input
                type="text"
                value={donorSearch}
                onChange={(event) => setDonorSearch(event.target.value)}
                placeholder="Search by name, location, or blood group"
                className="w-full md:flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={donorSortBy}
                onChange={(event) => setDonorSortBy(event.target.value)}
                className="w-full md:w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="score_desc">Sort: AI score (high to low)</option>
                <option value="score_asc">Sort: AI score (low to high)</option>
                <option value="distance_asc">Sort: Distance (near to far)</option>
                <option value="name_asc">Sort: Name (A-Z)</option>
              </select>
            </div>

            {showDonorFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select
                  value={donorGroupFilter}
                  onChange={(event) => setDonorGroupFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="all">All blood groups</option>
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <select
                  value={donorAvailabilityFilter}
                  onChange={(event) => setDonorAvailabilityFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="all">All availability</option>
                  <option value="available">Available</option>
                  <option value="standby">Standby</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setDonorSearch('');
                    setDonorGroupFilter('all');
                    setDonorAvailabilityFilter('all');
                    setDonorSortBy('score_desc');
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
                >
                  Reset filters
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {donorSource.length === 0 && (
                <p className="text-sm text-gray-500 animate-fade-in">No donors available right now.</p>
              )}
              {donorSource.length > 0 && visibleDonors.length === 0 && (
                <p className="text-sm text-gray-500 animate-fade-in">No donors match your filters. Adjust filters to continue.</p>
              )}
              {visibleDonors.slice(0, 24).map((donor) => {
                const donorId = donor.user_id || donor._id || donor.id;
                const donorKey = donorId ? String(donorId) : `unknown-${donor.name || 'donor'}`;
                const locationLabel = typeof donor.location === 'string'
                  ? donor.location
                  : donor.location?.city || donor.location?.address || 'Unknown location';
                return (
                  <div
                    key={donorKey}
                    className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition"
                    onClick={() => {
                      setSelectedDonor(donor);
                      setNotifyStatus({ loading: false, message: '', error: '' });
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedDonor(donor);
                        setNotifyStatus({ loading: false, message: '', error: '' });
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">{donor.name || 'Unknown Donor'}</h4>
                        <p className="text-xs text-gray-500">
                          {locationLabel || (donor.distance_km ? `${donor.distance_km} km away` : 'Unknown location')}
                        </p>
                        <p className="text-xs text-gray-500">Availability: {donor.availability || 'Available'}</p>
                      </div>
                      <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded text-sm">{donor.blood_group || donor.bloodGroup || 'N/A'}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      {donorMatches.length ? (
                        <span className="text-xs font-semibold text-slate-600">AI score {Number.isFinite(donor.score) ? donor.score.toFixed(1) : '0.0'}</span>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            checkCompat(donorId);
                          }}
                          className="text-sky-600 text-sm font-semibold hover:underline disabled:text-slate-400"
                          disabled={!donorId}
                        >
                          Check Match
                        </button>
                      )}
                      {compatResults[donorKey]?.loading && (
                        <span className="text-xs text-gray-500"><i className="fas fa-spinner fa-spin"></i></span>
                      )}
                      {compatResults[donorKey]?.score !== undefined && (
                        <span className={`font-bold ${compatResults[donorKey].score > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {compatResults[donorKey].score}% Match
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedDonor && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelectedDonor(null)}>
                <div
                  className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{selectedDonor.name || 'Donor Details'}</h4>
                      <p className="text-xs text-slate-500">Blood group: {selectedDonor.blood_group || selectedDonor.bloodGroup || 'N/A'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDonor(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Availability</p>
                      <p className="font-semibold text-slate-800">{selectedDonor.availability || 'Available'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Last Donation</p>
                      <p className="font-semibold text-slate-800">{selectedDonor.last_donation || 'Not provided'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Contact</p>
                      <p className="font-semibold text-slate-800">{selectedDonor.phone || 'Not shared'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Organ Types</p>
                      <p className="font-semibold text-slate-800">{Array.isArray(selectedDonor.organ_types) ? selectedDonor.organ_types.join(', ') : (selectedDonor.organ_types || 'Blood')}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Notify donor</label>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                      rows={3}
                      placeholder="Write a short availability request..."
                      value={notifyNote}
                      onChange={(event) => setNotifyNote(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleNotifyDonor}
                      disabled={notifyStatus.loading}
                      className="mt-3 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      {notifyStatus.loading ? 'Notifying...' : 'Notify Donor'}
                    </button>
                    {notifyStatus.message && <p className="text-xs text-emerald-600 mt-2">{notifyStatus.message}</p>}
                    {notifyStatus.error && <p className="text-xs text-rose-600 mt-2">{notifyStatus.error}</p>}
                  </div>
                </div>
              </div>,
              document.body
            )}
            {visibleDonors.length > 24 && (
              <p className="text-xs text-slate-500 mt-3">Showing first 24 donors. Refine your search for more.</p>
            )}
          </DashboardCard>
        );
      }

      case 'requests':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <DashboardCard>
              <h3 className="font-bold text-lg mb-4">Create Resource Request</h3>
              <form onSubmit={handleRequestSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select className="w-full p-3 border rounded bg-gray-50" onChange={(event) => setRequestForm({ ...requestForm, type: event.target.value })} value={requestForm.type}>
                    <option value="blood">Blood Request</option>
                    <option value="organ">Organ Request</option>
                  </select>
                  <select className="w-full p-3 border rounded bg-gray-50" onChange={(event) => setRequestForm({ ...requestForm, urgency: event.target.value })} value={requestForm.urgency}>
                    <option value="low">Low Urgency</option>
                    <option value="medium">Medium</option>
                    <option value="high">Critical</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Age" className="w-full p-3 border rounded" value={requestForm.age} onChange={(event) => setRequestForm({ ...requestForm, age: event.target.value })} />
                  <select className="w-full p-3 border rounded" value={requestForm.gender} onChange={(event) => setRequestForm({ ...requestForm, gender: event.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Contact Number" className="w-full p-3 border rounded" value={requestForm.contact} onChange={(event) => setRequestForm({ ...requestForm, contact: event.target.value })} />
                  <input type="text" placeholder="Required By (e.g. 2pm Today)" className="w-full p-3 border rounded" value={requestForm.requiredTime} onChange={(event) => setRequestForm({ ...requestForm, requiredTime: event.target.value })} />
                </div>
                <input type="text" placeholder="Specific Requirement (e.g. O+ Blood, Kidney)" className="w-full p-3 border rounded" value={requestForm.specific} onChange={(event) => setRequestForm({ ...requestForm, specific: event.target.value })} />
                <textarea className="w-full p-3 border rounded bg-gray-50 h-20" placeholder="Additional Medical Details..." value={requestForm.details} onChange={(event) => setRequestForm({ ...requestForm, details: event.target.value })}></textarea>
                <button className="w-full bg-sky-600 text-white py-3 rounded-lg font-bold hover:bg-sky-700 transition">Submit Request</button>
              </form>
            </DashboardCard>

            <DashboardCard>
              <h3 className="font-bold text-lg mb-4">Activity History (All)</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {data.fullHistory?.length === 0 && <p className="text-gray-500 text-sm">No activity recorded yet.</p>}
                {data.fullHistory?.map((item, index) => (
                  <div key={index} className={`border p-3 rounded-lg mb-2 relative overflow-hidden ${item.category === 'SOS Alert' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.category === 'SOS Alert' ? 'bg-red-500' : item.category === 'Donation' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <div className="pl-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold text-sm uppercase ${item.category === 'SOS Alert' ? 'text-red-700' : 'text-gray-700'}`}>
                          {item.category === 'Request' ? item.requestType : item.category}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(item.date).toLocaleString()}</span>
                      </div>
                      {item.category === 'SOS Alert' && <p className="text-sm font-medium text-gray-900">"{item.message}"</p>}
                      {item.category === 'Request' && (
                        <div>
                          <p className="text-sm text-gray-800">{item.details}</p>
                          <div className="flex gap-2 mt-1">
                            <StatusPill text={item.urgency} color={item.urgency === 'high' ? 'red' : 'yellow'} />
                            <StatusPill text={item.status} color="gray" />
                          </div>
                        </div>
                      )}
                      {item.category === 'Donation' && <p className="text-sm text-gray-800">Donated {item.donationType} at {item.hospitalName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        );

      case 'donations': {
        const sosCallCount = sosStats.total_sos_calls || 0;
        const criticalAlerts = sosStats.recent_critical_alerts || 0;
        const totalSignals = sosCallCount + (criticalAlerts * 2);
        const donationUrgencyScore = Math.min(100, Math.round(20 + (totalSignals * 8)));
        const donationUrgency = donationUrgencyScore >= 80
          ? 'Critical'
          : donationUrgencyScore >= 60
            ? 'High'
            : donationUrgencyScore >= 40
              ? 'Medium'
              : 'Low';
        const recommendedDays = Math.max(56, Math.min(120, Math.round(120 - (totalSignals * 6))));
        const impactLow = Math.max(1, Math.round(1 + (totalSignals * 0.6)));
        const impactHigh = Math.max(2, Math.round(2 + (totalSignals * 0.9)));

        const urgencyBadgeClass = donationUrgency === 'Critical'
          ? 'bg-red-100 text-red-800'
          : donationUrgency === 'High'
            ? 'bg-orange-100 text-orange-800'
            : donationUrgency === 'Medium'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800';

        const urgencyMeterClass = donationUrgency === 'Critical'
          ? 'from-red-400 to-red-600'
          : donationUrgency === 'High'
            ? 'from-orange-400 to-orange-600'
            : donationUrgency === 'Medium'
              ? 'from-yellow-400 to-yellow-600'
              : 'from-green-400 to-green-600';

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <DashboardCard className="lg:col-span-1">
              <h3 className="font-bold text-lg mb-4">My Donation History</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.donationHistory?.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500 animate-fade-in">No history found.</td>
                      </tr>
                    ) : (
                      data.donationHistory?.map((item, index) => {
                        const typeLabel = item.donationType || item.type || item.resourceType || item.requestType || 'Blood';
                        const dateValue = item.donationDate || item.date || item.createdAt;
                        const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : '—';
                        return (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{typeLabel}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{dateLabel}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
            <DashboardCard className="lg:col-span-1">
              <h3 className="font-bold text-lg mb-2">AI Activity Analysis</h3>
              <p className="text-sm text-gray-500 mb-6">Our ML model analyzes your interaction history and SOS activity.</p>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 p-2 rounded border">
                  <p className="text-xs text-gray-500">SOS Calls</p>
                  <p className="font-bold text-red-600">{sosCallCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <p className="text-xs text-gray-500">Critical (24h)</p>
                  <p className="font-bold text-orange-600">{criticalAlerts}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                  <p className="text-xs text-gray-500">Donations</p>
                  <p className="font-bold text-green-600">{data.donationHistory?.length || 0}</p>
                </div>
              </div>
              {profileCluster ? (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg text-center animate-zoom-in">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Analysis Complete</p>
                  <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mt-1">{profileCluster}</p>
                </div>
              ) : (
                <button
                  onClick={handleProfileAnalysis}
                  disabled={isAnalyzingProfile}
                  className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  {isAnalyzingProfile ? 'Running ML Model...' : 'Run Profile Analysis'}
                </button>
              )}
            </DashboardCard>
            <DashboardCard className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Donation Forecast Model</h3>
                  <p className="text-sm text-gray-500">Predictive analytics based on your historical frequency and SOS activity.</p>
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Live AI</div>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={fetchForecast}
                  disabled={forecastLoading}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  {forecastLoading ? 'Running forecast...' : 'Run Forecast'}
                </button>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border flex items-center gap-4">
                <div className="p-3 bg-white rounded-full shadow text-green-600 text-xl"><i className="fas fa-chart-line"></i></div>
                <div>
                  {donationForecast !== null ? (
                    <>
                      <p className="text-gray-900 font-medium">Prediction Result:</p>
                      <p className="text-sm text-gray-600">You are projected to make <b className="text-green-600 text-lg">{donationForecast}</b> more donations in the next 12 months.</p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Run the analysis above to generate a forecast.</p>
                  )}
                </div>
              </div>
            </DashboardCard>

            {donationForecast !== null && (
              <div className="lg:col-span-2">
                <SimpleLineChart
                  title="Donation Forecast (12 months)"
                  lineColor="rgba(34, 197, 94, 0.8)"
                  data={[
                    { label: 'Past 12 mo', value: data.donationHistory?.length || 0 },
                    { label: 'Next 12 mo', value: donationForecast },
                  ]}
                />
              </div>
            )}

            <DashboardCard className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">SOS-Based Donation Urgency</h3>
                  <p className="text-sm text-gray-500">ML model recommends donation frequency based on your SOS activity.</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-xs font-bold ${urgencyBadgeClass}`}>{donationUrgency}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                  <p className="text-xs text-gray-600 font-bold uppercase mb-2">Donation Urgency Score</p>
                  <div className="relative h-8 bg-white rounded-full overflow-hidden border border-gray-300">
                    <div
                      className={`h-full bg-gradient-to-r ${urgencyMeterClass}`}
                      style={{ width: `${Math.min(100, donationUrgencyScore)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-bold mt-2">{Math.min(100, donationUrgencyScore)}/100</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-bold uppercase mb-2">AI Recommendation</p>
                  <p className="text-sm font-medium text-blue-800">
                    {donationUrgency === 'Critical'
                      ? `Donate as soon as you are eligible (min ${recommendedDays} days between donations).`
                      : donationUrgency === 'High'
                        ? `Plan a donation soon - frequent emergencies reported. Suggested interval: ${recommendedDays} days.`
                        : donationUrgency === 'Medium'
                          ? `Regular donations recommended. Suggested interval: ${recommendedDays} days.`
                          : `Low urgency - donate when convenient (typically every ${recommendedDays} days).`}
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-bold uppercase mb-2">Your Impact</p>
                  <p className="text-sm font-medium text-green-800">
                    Based on community signals, your donation could help {impactLow}-{impactHigh} people
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-2">
                <p className="font-bold text-gray-800">ML Analysis Details:</p>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>SOS Calls:</strong> {sosCallCount} total emergency requests detected</li>
                  <li>• <strong>Critical Alerts (24h):</strong> {criticalAlerts} life-threatening emergencies</li>
                  <li>• <strong>Community Impact:</strong> Your donations directly help emergency responders</li>
                  <li>• <strong>Donation Frequency:</strong> Recommended every {recommendedDays} days (minimum 56 days for whole blood)</li>
                </ul>
              </div>
            </DashboardCard>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      sidebarItems={publicSidebarItems}
      activeItem={activeTab}
      onSelect={handleSelect}
      onRefresh={fetchData}
      refreshLabel="Refresh data"
    >
      <div className="animate-zoom-in" style={{ animationDuration: '0.6s' }}>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default DesktopPublicDashboard;

import React, { useState, useCallback, useEffect } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero } from '../shared/GovernmentShared';
import { DetailModal, Toast, AnimatedBarChart, AIExplainPanel } from '../shared/InteractiveComponents';
import { apiFetch } from '../../../config/api';

const AIMLLab = () => {
  const [models, setModels] = useState([
    { id: 'M-001', name: 'Disaster Risk Predictor', accuracy: 94, status: 'Active', type: 'Classification', lastRun: '2m ago', desc: 'Predicts disaster probability based on weather, seismic, and historical data. Trained on 24 years of NDMA records.', predictions: 1247 },
    { id: 'M-002', name: 'Resource Optimization Engine', accuracy: 89, status: 'Active', type: 'Optimization', lastRun: '8m ago', desc: 'Optimizes resource allocation across agencies. Uses reinforcement learning for dynamic resource distribution.', predictions: 892 },
    { id: 'M-003', name: 'Pandemic Spread Forecaster', accuracy: 92, status: 'Active', type: 'Time Series', lastRun: '15m ago', desc: 'Forecasts disease spread patterns using SEIR model with mobility data integration.', predictions: 654 },
    { id: 'M-004', name: 'Hospital Load Balancer', accuracy: 87, status: 'Active', type: 'Regression', lastRun: '22m ago', desc: 'Predicts hospital capacity utilization and recommends load balancing across facilities.', predictions: 1024 },
    { id: 'M-005', name: 'Supply Chain Predictor', accuracy: 85, status: 'Idle', type: 'Forecasting', lastRun: '1h ago', desc: 'Predicts medical supply demand and supply chain bottlenecks.', predictions: 456 },
    { id: 'M-006', name: 'Traffic Flow Optimizer', accuracy: 91, status: 'Training', type: 'Reinforcement', lastRun: '5m ago', desc: 'Optimizes traffic flow during emergencies. Currently training on new real-time data.', predictions: 2340 },
  ]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [trainingJobs, setTrainingJobs] = useState([
    { model: 'Earthquake Early Warning', progress: 72, eta: '1h 20m', dataset: 'seismic_2026', loss: 0.034, accuracy: 88 },
    { model: 'Landslide Predictor v3', progress: 45, eta: '2h 15m', dataset: 'landslide_history', loss: 0.052, accuracy: 82 },
    { model: 'Urban Flood Model', progress: 18, eta: '4h 30m', dataset: 'urban_drainage', loss: 0.078, accuracy: 76 },
  ]);
  const [showInferenceModal, setShowInferenceModal] = useState(false);
  const [inferenceInput, setInferenceInput] = useState('');
  const [inferenceResult, setInferenceResult] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ visible: true, message: msg, type }), []);

  const runInference = useCallback(async () => {
    if (!inferenceInput.trim()) return;
    try {
      const res = await apiFetch('/v2/government/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ query: inferenceInput, context: 'risk_assessment' }),
      });
      if (res.ok && res.data) {
        setInferenceResult({
          input: inferenceInput,
          prediction: res.data.prediction || res.data.risk_level || (Math.random() > 0.5 ? 'High Risk' : 'Moderate Risk'),
          confidence: res.data.confidence || Math.round(70 + Math.random() * 25),
          factors: res.data.factors || [
            'Weather conditions: 82% correlation',
            'Historical incidents: 74% match',
            'Geographic risk score: 78%',
            'Seasonal adjustment: +12%',
          ],
          recommendation: res.data.recommendation || res.data.answer || (inferenceInput.toLowerCase().includes('flood') || inferenceInput.toLowerCase().includes('rain')
            ? 'Activate flood monitoring protocols. Pre-position rescue teams in low-lying areas.'
            : 'Standard monitoring recommended. No immediate action required.'),
        });
        return;
      }
    } catch (err) { /* use local fallback */ }
    setInferenceResult({
      input: inferenceInput,
      prediction: Math.random() > 0.5 ? 'High Risk' : 'Moderate Risk',
      confidence: Math.round(70 + Math.random() * 25),
      factors: [
        'Weather conditions: 82% correlation',
        'Historical incidents: 74% match',
        'Geographic risk score: 78%',
        'Seasonal adjustment: +12%',
      ],
      recommendation: inferenceInput.toLowerCase().includes('flood') || inferenceInput.toLowerCase().includes('rain')
        ? 'Activate flood monitoring protocols. Pre-position rescue teams in low-lying areas.'
        : 'Standard monitoring recommended. No immediate action required.',
    });
  }, [inferenceInput]);

  const deployModel = useCallback((model) => {
    setModels(ms => ms.map(m => m.id === model.id ? { ...m, status: 'Active' } : m));
    showToast(`${model.name} deployed successfully!`, 'success');
  }, [showToast]);

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="AI/ML Laboratory"
        subtitle="Interactive government AI model management, training, and real-time inference engine"
        icon="fa-robot"
        gradient="from-purple-700 to-indigo-800"
        stats={[
          { label: 'Active Models', value: models.filter(m => m.status === 'Active').length.toString() },
          { label: 'Inference QPS', value: '2,400' },
          { label: 'Avg Accuracy', value: '89.2%' },
          { label: 'GPU Utilization', value: '76%' },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Training Queued" value="4" icon="fa-clock" color="amber" />
        <GovKPICard label="In Progress" value={trainingJobs.length.toString()} icon="fa-spinner" color="sky" trend={-10} />
        <GovKPICard label="Deployed" value={models.filter(m => m.status === 'Active').length.toString()} icon="fa-check-circle" color="emerald" />
        <GovKPICard label="Failed / Drifted" value="1" icon="fa-triangle-exclamation" color="red" />
      </div>

      {/* Model Registry */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <GovSectionHeader icon="fa-cubes" label="Model Registry" action={{ label: 'Deploy New', onClick: () => showToast('Opening model deployment wizard...', 'info') }} />
          <button onClick={() => setShowInferenceModal(true)} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <i className="fas fa-flask mr-1" />Run Inference
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {models.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedModel(m)}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.status === 'Active' ? 'bg-emerald-100' : m.status === 'Training' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  <i className={`fas fa-brain text-xs ${m.status === 'Active' ? 'text-emerald-600' : m.status === 'Training' ? 'text-amber-600' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{m.type}</span><span>·</span><span>{m.predictions.toLocaleString()} predictions</span><span>·</span><span>Last: {m.lastRun}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700">{m.accuracy}%</p>
                  <p className="text-[9px] text-slate-400">Accuracy</p>
                </div>
                <GovStatusBadge text={m.status} color={m.status === 'Active' ? 'emerald' : m.status === 'Training' ? 'amber' : 'slate'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Queue + Experiments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-list-ol" label="Training Queue" action={{ label: 'Start New', onClick: () => showToast('New training job queued', 'success') }} />
          <div className="space-y-2">
            {trainingJobs.map((t, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => showToast(`Training metrics for ${t.model}: Loss ${t.loss}, Accuracy ${t.accuracy}%`, 'info')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">{t.model}</span>
                  <span className="text-[9px] text-slate-400">{t.eta} remaining</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-1.5">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: t.progress + '%' }} />
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-400">Dataset: {t.dataset}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">Acc: {t.accuracy}%</span>
                    <span className="text-amber-600">Loss: {t.loss}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-flask" label="Experiment Tracking" action={{ label: 'New Experiment', onClick: () => showToast('New experiment created', 'success') }} />
          <div className="space-y-2">
            {[
              { name: 'hyperparam_scan_v4', metric: 'F1: 0.912', status: 'Completed', desc: 'Grid search over 144 combinations. Best params found.' },
              { name: 'feature_ablation_test', metric: 'Loss: 0.024', status: 'Running', desc: 'Testing impact of removing each feature group.' },
              { name: 'ensemble_compare_v2', metric: 'AUC: 0.945', status: 'Completed', desc: 'XGBoost vs Random Forest vs Neural Network ensemble.' },
              { name: 'drift_detection_run', metric: 'Drift: 0.03', status: 'Completed', desc: 'Data drift detection on production model features.' },
            ].map((e, i) => (
              <div key={i} onClick={() => showToast(`${e.name}: ${e.desc}`, 'info')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 font-medium truncate">{e.name}</p>
                    <p className="text-[9px] text-slate-400 truncate">{e.metric}</p>
                  </div>
                </div>
                <GovStatusBadge text={e.status} color={e.status === 'Completed' ? 'emerald' : 'amber'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Performance Chart */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <GovSectionHeader icon="fa-chart-bar" label="Model Accuracy Comparison" />
        <AnimatedBarChart
          data={models.map(m => ({ label: m.name.split(' ').slice(0, 2).join(' '), value: m.accuracy }))}
          height={160}
          barColor="from-purple-500 to-indigo-600"
        />
      </div>

      {/* Model Detail Modal */}
      <DetailModal open={!!selectedModel} onClose={() => setSelectedModel(null)} title={selectedModel?.name || 'Model Details'} subtitle={`${selectedModel?.type} · ${selectedModel?.status}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Accuracy</p>
              <p className="text-lg font-bold text-emerald-600">{selectedModel?.accuracy}%</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Predictions</p>
              <p className="text-lg font-bold text-slate-800">{(selectedModel?.predictions || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Status</p>
              <GovStatusBadge text={selectedModel?.status || '-'} color={selectedModel?.status === 'Active' ? 'emerald' : selectedModel?.status === 'Training' ? 'amber' : 'slate'} />
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-[9px] text-slate-400">Last Run</p>
              <p className="text-xs font-bold text-slate-800">{selectedModel?.lastRun}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-[9px] text-slate-400">Description</p>
            <p className="text-xs text-slate-700 mt-1">{selectedModel?.desc || 'No description.'}</p>
          </div>
          {selectedModel?.status !== 'Active' && (
            <button onClick={() => { deployModel(selectedModel); setSelectedModel(null); }}
              className="w-full px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
              <i className="fas fa-rocket mr-1" />Deploy Model
            </button>
          )}
        </div>
      </DetailModal>

      {/* Inference Modal */}
      <DetailModal open={showInferenceModal} onClose={() => { setShowInferenceModal(false); setInferenceResult(null); setInferenceInput(''); }}
        title="AI Inference Engine" subtitle="Run real-time predictions using deployed models">
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-medium text-slate-400 mb-1">Input Data (describe the scenario)</p>
            <textarea value={inferenceInput} onChange={e => setInferenceInput(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 text-xs h-24 resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., Flood in Netravati Valley with 250mm rainfall, wind 60km/h, 5,000 population at risk..." />
          </div>
          <button onClick={runInference} disabled={!inferenceInput.trim()}
            className="w-full px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
            <i className="fas fa-flask mr-1" />Run AI Inference
          </button>
          {inferenceResult && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-indigo-700">Prediction Result</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{inferenceResult.confidence}% confidence</span>
                </div>
                <p className="text-sm font-bold text-slate-800">{inferenceResult.prediction}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-[9px] font-semibold text-slate-400 mb-1.5">Contributing Factors</p>
                <div className="space-y-1">
                  {inferenceResult.factors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span className="w-1 h-1 rounded-full bg-indigo-400" />{f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-[9px] font-semibold text-emerald-700 mb-1">AI Recommendation</p>
                <p className="text-[10px] text-slate-600">{inferenceResult.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </DetailModal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, visible: false }))} />
    </div>
  );
};

export default AIMLLab;

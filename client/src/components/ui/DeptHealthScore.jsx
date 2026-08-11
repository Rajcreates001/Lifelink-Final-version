import React, { useState, useEffect } from 'react';

const DeptHealthScore = ({ score = 78, label = 'Health Score', size = 100, strokeWidth = 8, delay = 0 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let current = 0;
      const step = () => {
        current += 1;
        setAnimatedScore(Math.min(current, score));
        if (current < score) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = animatedScore >= 80 ? '#10b981' : animatedScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center" style={{ width: size, height: size + 24 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-300" />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize={size * 0.22} fontWeight="800" fill={color}>{animatedScore}</text>
        <text x={size / 2} y={size / 2 + size * 0.14} textAnchor="middle" fontSize={size * 0.08} fill="#94a3b8">{label}</text>
      </svg>
    </div>
  );
};

export default DeptHealthScore;

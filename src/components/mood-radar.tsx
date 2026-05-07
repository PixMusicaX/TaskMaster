"use client";

import React from "react";
import { motion } from "framer-motion";

interface MoodRadarProps {
  data: {
    joy: number;
    steady: number;
    stress: number;
  };
  size?: number;
}

export default function MoodRadar({ data, size = 200 }: MoodRadarProps) {
  const center = size / 2;
  const radius = size * 0.4;

  // Max value for normalization (at least 1 to avoid div by zero)
  const max = Math.max(data.joy, data.steady, data.stress, 1);

  // Helper to get coordinates for a point on an axis
  // Joy: 0 deg (top), Steady: 120 deg, Stress: 240 deg
  const getPoint = (value: number, angle: number) => {
    const normalized = value / max;
    const r = normalized * radius;
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const joyPoint = getPoint(data.joy, 0);
  const steadyPoint = getPoint(data.steady, 120);
  const stressPoint = getPoint(data.stress, 240);

  const pathData = `M ${joyPoint.x} ${joyPoint.y} L ${steadyPoint.x} ${steadyPoint.y} L ${stressPoint.x} ${stressPoint.y} Z`;

  // Background grid points
  const gridLevels = [0.5, 1];
  const gridPaths = gridLevels.map(level => {
    const p1 = getPoint(max * level, 0);
    const p2 = getPoint(max * level, 120);
    const p3 = getPoint(max * level, 240);
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grids */}
        {gridPaths.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="white"
            strokeOpacity={0.05}
            strokeWidth={1}
          />
        ))}

        {/* Axes Lines */}
        {[0, 120, 240].map(angle => {
          const p = getPoint(max, angle);
          return (
            <line
              key={angle}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="white"
              strokeOpacity={0.1}
              strokeDasharray="2 2"
            />
          );
        })}

        {/* Data Shape */}
        <motion.path
          initial={{ d: `M ${center} ${center} L ${center} ${center} L ${center} ${center} Z` }}
          animate={{ d: pathData }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          fill="url(#moodGradient)"
          fillOpacity={0.6}
          stroke="currentColor"
          className="text-tm-yellow"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        <defs>
          <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF4500" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Labels */}
        <text x={getPoint(max * 1.2, 0).x} y={getPoint(max * 1.2, 0).y} textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor" className="text-tm-yellow uppercase tracking-widest">JOY</text>
        <text x={getPoint(max * 1.2, 120).x} y={getPoint(max * 1.2, 120).y} textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor" className="text-tm-blue-gray/60 uppercase tracking-widest">STEADY</text>
        <text x={getPoint(max * 1.2, 240).x} y={getPoint(max * 1.2, 240).y} textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor" className="text-tm-orange-dark uppercase tracking-widest">STRESS</text>
      </svg>
    </div>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Swords, Brain, Coins, HeartPulse, Users } from "lucide-react";

interface CharacterStatsRadarProps {
  data: {
    strength: number;
    intelligence: number;
    wealth: number;
    vitality: number;
    charisma: number;
  };
  totalXP?: number;
  size?: number;
}

export default function CharacterStatsRadar({
  data,
  totalXP = 0,
  size = 240,
}: CharacterStatsRadarProps) {
  const center = size / 2;
  const radius = size * 0.35;

  // Max value for normalization
  const max = Math.max(data.strength, data.intelligence, data.wealth, data.vitality, data.charisma, 1);

  // Helper to get coordinates for a point on an axis (5 axes for pentagonal shape)
  // Strength: 0°, Intelligence: 72°, Wealth: 144°, Vitality: 216°, Charisma: 288°
  const getPoint = (value: number, angle: number) => {
    const normalized = value / max;
    const r = normalized * radius;
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const stats = [
    { key: "strength", label: "Strength", angle: 0, color: "tm-orange-dark", icon: Swords },
    { key: "intelligence", label: "Intelligence", angle: 72, color: "tm-yellow", icon: Brain },
    { key: "wealth", label: "Wealth", angle: 144, color: "tm-orange-light", icon: Coins },
    { key: "vitality", label: "Vitality", angle: 216, color: "tm-red", icon: HeartPulse },
    { key: "charisma", label: "Charisma", angle: 288, color: "tm-blue-gray", icon: Users },
  ] as const;

  const dataPoints = stats.map(s => getPoint(data[s.key], s.angle));
  const pathData = `M ${dataPoints.map((p, i) => `${p.x} ${p.y}`).join(" L ")} Z`;

  // Background grid levels
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPaths = gridLevels.map(level => {
    const points = stats.map(s => getPoint(max * level, s.angle));
    return `M ${points.map((p, i) => `${p.x} ${p.y}`).join(" L ")} Z`;
  });

  return (
    <div className="relative flex flex-col items-center justify-center gap-6">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grids */}
        {gridPaths.map((path, i) => (
          <path
            key={`grid-${i}`}
            d={path}
            fill="none"
            stroke="currentColor"
            className="text-tm-blue-gray/20"
            strokeWidth={0.5}
          />
        ))}

        {/* Axes Lines */}
        {stats.map((s) => {
          const p = getPoint(max, s.angle);
          return (
            <line
              key={`axis-${s.angle}`}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              className="text-tm-blue-gray/40"
              strokeDasharray="2 2"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data Shape */}
        <motion.path
          initial={{ d: pathData, fillOpacity: 0 }}
          animate={{ d: pathData, fillOpacity: 0.5 }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
          fill="url(#statsGradient)"
          stroke="currentColor"
          className="text-tm-yellow"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="currentColor"
            className="text-tm-yellow"
            initial={{ r: 0 }}
            animate={{ r: 3 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 60 }}
          />
        ))}

        <defs>
          <linearGradient id="statsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--tm-yellow)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--tm-orange-dark)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Labels */}
        {stats.map((s) => {
          const labelPoint = getPoint(max * 1.25, s.angle);
          // Add extra vertical padding for bottom stats
          const adjustedY = (s.angle === 216 || s.angle === 144) ? labelPoint.y + 8 : labelPoint.y;
          return (
            <g key={`label-${s.angle}`}>
              <text
                x={labelPoint.x}
                y={adjustedY - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="900"
                fill="currentColor"
                className={`text-${s.color} uppercase tracking-widest`}
              >
                {s.label}
              </text>
              <text
                x={labelPoint.x}
                y={adjustedY + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fontWeight="700"
                fill="currentColor"
                className="text-tm-blue-gray/50 uppercase tracking-widest"
              >
                {data[s.key]} XP
              </text>
            </g>
          );
        })}
      </svg>

      {/* Total XP Display */}
      {totalXP > 0 && (
        <div className="text-center px-8 py-3 bg-tm-yellow/5 rounded-3xl border border-tm-yellow/10 backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase text-tm-blue-gray/40 tracking-[0.4em] mb-1">
            Total XP
          </p>
          <p className="text-4xl font-black text-tm-yellow tracking-tighter">{totalXP}</p>
        </div>
      )}
    </div>
  );
}

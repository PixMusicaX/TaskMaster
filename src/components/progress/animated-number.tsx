"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

// Rolls to the new value instead of jumping
export default function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, v => Math.round(v).toString());

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ── Button ──
export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  const variants = {
    primary:     'bg-gradient-to-r from-[#00A8CB] to-[#007FA3] text-white shadow-[0_2px_8px_rgba(0,168,203,0.25)] hover:shadow-[0_4px_16px_rgba(0,168,203,0.35)] hover:-translate-y-px',
    secondary:   'bg-[#00B67A] text-white hover:bg-[#009966] shadow-sm hover:-translate-y-px',
    outline:     'bg-white text-[#1A2035] border border-[#E3E8F0] hover:border-[#00A8CB] hover:text-[#00A8CB] hover:bg-[#E6F7FB]',
    ghost:       'bg-transparent text-[#6B7A99] hover:bg-[#F0F3F8] hover:text-[#1A2035]',
    destructive: 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm hover:-translate-y-px',
    link:        'text-[#00A8CB] underline-offset-4 hover:underline bg-transparent p-0 h-auto font-medium',
  };

  const sizes = {
    sm:   'h-8 px-3 text-xs gap-1.5',
    md:   'h-10 px-5 py-2 text-sm gap-2',
    lg:   'h-12 px-8 text-base gap-2',
    icon: 'h-10 w-10',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8CB] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';

// ── Card ──
export const Card = ({ className, ...props }) => (
  <div className={cn(
    'rounded-xl border border-[#E3E8F0] bg-white text-[#1A2035] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-200',
    className
  )} {...props} />
);

export const CardHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1 p-6', className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-bold leading-none tracking-tight font-heading text-[#1A2035]', className)} {...props} />
);

export const CardDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-[#6B7A99]', className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

export const CardFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
);

// ── Input ──
export const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-lg border border-[#E3E8F0] bg-white px-3 py-2 text-sm text-[#1A2035] placeholder:text-[#A8B8D0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8CB]/30 focus-visible:border-[#00A8CB] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

// ── Badge ──
export const Badge = ({ className, variant = 'default', pulse = false, ...props }) => {
  const variants = {
    default:     'bg-[#E6F7FB] text-[#007FA3] border border-[#B3E5F0]',
    secondary:   'bg-[#E6F9F2] text-[#00806D] border border-[#B3EDD9]',
    destructive: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
    outline:     'text-[#6B7A99] border border-[#E3E8F0] bg-white',
    accent:      'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
    muted:       'bg-[#F0F3F8] text-[#6B7A99] border border-[#E3E8F0]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant] || variants.default,
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    />
  );
};

// ── Skeleton ──
export const Skeleton = ({ className, ...props }) => (
  <div
    className={cn('rounded-lg animate-shimmer', className)}
    style={{ background: 'linear-gradient(90deg, #F0F3F8 0%, #FFFFFF 50%, #F0F3F8 100%)', backgroundSize: '200% 100%' }}
    {...props}
  />
);

// ── AnimatedCounter ──
export const AnimatedCounter = ({ value, duration = 1.4, prefix = '', suffix = '', className }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numericValue)) return;

    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue((numericValue) * eased);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  const formatted = Number.isInteger(parseFloat(value))
    ? Math.round(displayValue).toLocaleString()
    : displayValue.toFixed(1);

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

// ── Progress Bar ──
export const Progress = ({ value = 0, max = 100, className, barClassName }) => (
  <div className={cn('h-2 w-full rounded-full bg-[#F0F3F8] overflow-hidden', className)}>
    <motion.div
      className={cn('h-full rounded-full bg-gradient-to-r from-[#00A8CB] to-[#007FA3]', barClassName)}
      initial={{ width: 0 }}
      animate={{ width: `${(value / max) * 100}%` }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    />
  </div>
);

// ── ScoreGauge (TransUnion style circular gauge) ──
export const ScoreGauge = ({ score = 0, maxScore = 850, minScore = 300, size = 200 }) => {
  const radius = (size / 2) * 0.78;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Map score from 300-850 range to 0-1
  const pct = Math.max(0, Math.min(1, (score - minScore) / (maxScore - minScore)));

  // TransUnion score band color
  let strokeColor = '#EF4444';
  let band = 'Poor';
  if (score >= 750) { strokeColor = '#00B67A'; band = 'Excellent'; }
  else if (score >= 670) { strokeColor = '#00A8CB'; band = 'Good'; }
  else if (score >= 580) { strokeColor = '#F59E0B'; band = 'Fair'; }

  const dashOffset = circumference * (1 - pct * 0.75); // 270° arc

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
        {/* Gradient */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={strokeColor} stopOpacity="1"/>
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="#E3E8F0" strokeWidth={size * 0.07}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
        />
        {/* Fill */}
        <motion.circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={size * 0.07}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          strokeLinecap="round"
        />
      </svg>
      {/* Score text inside */}
      <div className="flex flex-col items-center" style={{ marginTop: -(size * 0.62) }}>
        <motion.span
          className="font-heading font-black text-[#1A2035]"
          style={{ fontSize: size * 0.22 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <AnimatedCounter value={score} duration={1.6} />
        </motion.span>
        <span className="text-xs font-semibold text-[#6B7A99] mt-0.5" style={{ fontSize: size * 0.065 }}>
          out of {maxScore}
        </span>
      </div>
      {/* Band label below gauge */}
      <div className="mt-2">
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold',
            score >= 750 ? 'bg-[#E6F9F2] text-[#00806D]' :
            score >= 670 ? 'bg-[#E6F7FB] text-[#007FA3]' :
            score >= 580 ? 'bg-[#FEF3C7] text-[#B45309]' :
            'bg-[#FEF2F2] text-[#B91C1C]'
          )}
        >
          {band}
        </span>
      </div>
    </div>
  );
};

// ── FairnessMetric ──
export const FairnessMetric = ({ label, value, benchmark = 0.8, higherIsBetter = true }) => {
  const numVal = parseFloat(value);
  const isGood = higherIsBetter ? numVal >= benchmark : numVal <= benchmark;
  const isWarn = higherIsBetter ? numVal >= benchmark * 0.9 : numVal <= benchmark * 1.1;

  const statusClass = isGood ? 'fairness-good' : isWarn ? 'fairness-warn' : 'fairness-danger';
  const statusLabel = isGood ? 'Pass' : isWarn ? 'Review' : 'Fail';

  return (
    <div className={cn('p-4 rounded-lg flex items-center justify-between', statusClass)}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-black font-heading mt-0.5">{value}</p>
      </div>
      <span className={cn(
        'px-2.5 py-1 rounded-full text-xs font-bold',
        isGood ? 'bg-[#00B67A]/20 text-[#006D54]' :
        isWarn ? 'bg-[#F59E0B]/20 text-[#92400E]' :
        'bg-[#EF4444]/20 text-[#7F1D1D]'
      )}>
        {statusLabel}
      </span>
    </div>
  );
};

// ── Stagger motion helpers ──
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};


import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} border-brand-primary border-t-transparent rounded-full animate-spin`}
      ></div>
    </div>
  );
};

export const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full bg-line-light rounded-full h-5 relative overflow-hidden border border-line-dark/20">
      <div
        className="bg-brand-primary h-full rounded-full transition-all duration-300 ease-linear"
        style={{ width: `${progress}%` }}
      ></div>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">
        {Math.round(progress)}%
      </span>
    </div>
  );
};


export default Spinner;
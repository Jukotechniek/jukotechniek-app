
import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  title, 
  subtitle,
  className = "" 
}) => {
  return (
    <div className={`p-2 md:p-6 bg-gradient-to-br from-white via-gray-100 to-red-50 min-h-screen ${className}`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700 mb-1 md:mb-2 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 text-sm md:text-base">
              {subtitle}
            </p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
};

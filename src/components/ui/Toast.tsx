import React, { useEffect, useState } from 'react';
import type { ToastMessage } from '../../types';

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function ToastItem({ message, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Progress bar
    const duration = 3000;
    const interval = 30;
    const decrement = (interval / duration) * 100;
    
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(progressTimer);
          return 0;
        }
        return next;
      });
    }, interval);

    // Auto close
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(message.id), 200);
    }, duration);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(closeTimer);
    };
  }, [message.id, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      className={`
        transform transition-all duration-200 mb-2
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colors[message.type]} flex items-center justify-center text-white font-bold`}>
            {icons[message.type]}
          </div>
          <p className="flex-1 text-gray-800">{message.message}</p>
          <button
            onClick={() => onClose(message.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="h-1 bg-gray-200">
          <div
            className={`h-full ${colors[message.type]} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Expose global toast function
  useEffect(() => {
    (window as any).showToast = (type: ToastMessage['type'], message: string) => {
      const newToast: ToastMessage = {
        id: Date.now().toString(),
        type,
        message,
      };
      setToasts((prev) => [...prev, newToast]);
    };

    return () => {
      delete (window as any).showToast;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} message={toast} onClose={removeToast} />
      ))}
    </div>
  );
}

// Helper function to show toast
export function showToast(type: ToastMessage['type'], message: string) {
  if ((window as any).showToast) {
    (window as any).showToast(type, message);
  }
}

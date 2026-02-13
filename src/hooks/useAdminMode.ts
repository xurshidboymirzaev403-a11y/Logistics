import { useState, useEffect } from 'react';
import { adminModeStore } from '../store';

export function useAdminMode() {
  const [isAdminMode, setIsAdminMode] = useState(adminModeStore.get());

  useEffect(() => {
    // Reset admin mode on page load
    adminModeStore.reset();
    setIsAdminMode(false);
  }, []);

  const toggleAdminMode = () => {
    const newValue = !isAdminMode;
    adminModeStore.set(newValue);
    setIsAdminMode(newValue);
  };

  const enableAdminMode = () => {
    adminModeStore.set(true);
    setIsAdminMode(true);
  };

  const disableAdminMode = () => {
    adminModeStore.set(false);
    setIsAdminMode(false);
  };

  return {
    isAdminMode,
    toggleAdminMode,
    enableAdminMode,
    disableAdminMode,
  };
}

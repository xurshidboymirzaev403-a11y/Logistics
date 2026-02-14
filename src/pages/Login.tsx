import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore, currentUserStore, initializeDefaultUser } from '../store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showToast } from '../components/ui/Toast';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeDefaultUser();
    
    // Check if already logged in
    const currentUser = currentUserStore.get();
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const user = userStore.getByUsername(username);
      
      if (!user || user.password !== password) {
        showToast('error', 'Неверный логин или пароль');
        setIsLoading(false);
        return;
      }

      currentUserStore.set(user);
      showToast('success', `Добро пожаловать, ${user.fullName}!`);
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">🚛 Logistics</h1>
          <p className="text-gray-600">Система управления логистикой</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Логин"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Введите логин"
            required
            autoFocus
          />

          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            <strong>По умолчанию:</strong><br />
            Логин: admin<br />
            Пароль: admin
          </p>
        </div>
      </div>
    </div>
  );
}

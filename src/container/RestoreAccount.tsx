import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRestoreAccount } from '../hooks/useRestoreAccount';
import Spinner from '../components/Spinner';

export default function RestoreAccount() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const restoreMutation = useRestoreAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRestore = async () => {
    if (!user) return;

    try {
      await restoreMutation.mutateAsync(user.id);

      // Refresh the user profile in AuthContext so deleted_at is updated
      // Wait for the profile to be refreshed before navigating to avoid
      // a race condition where the user is redirected back to /restore-account
      setIsRefreshing(true);
      await refreshUserProfile();

      // Navigate only after the profile is confirmed updated
      // The App.tsx routing will handle the redirect if deleted_at is still set
      navigate('/');
    } catch (error) {
      console.error('Error restoring account:', error);
      setIsRefreshing(false);
    }
  };

  const isProcessing = restoreMutation.isPending || isRefreshing;

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4"
        style={{
          border: '1px solid #e5e7eb',
        }}
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Account Deleted</h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Your account has been deleted. All your content is not available to other users.
          </p>
          <p className="text-gray-600 text-sm mb-4">
            You can restore your account at any time. However, please note that:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-2 mb-4">
            <li>Your friends and follow relationships will not be restored</li>
            <li>You will need to reconnect with friends manually</li>
            <li>Your pomodoros and other content will become visible again</li>
          </ul>
        </div>

        {restoreMutation.isError && (
          <div
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
            role="alert"
          >
            Failed to restore account. Please try again.
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleRestore}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Restoring...' : 'Restore Account'}
          </button>
        </div>
      </div>
    </div>
  );
}


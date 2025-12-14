import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsProps {
  user: any;
  token: string | null;
  onUserUpdate: (user: any) => void;
  onNavigateBack?: () => void;
}

const profileSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
});

const securitySchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

const Settings: React.FC<SettingsProps> = ({ user, token, onUserUpdate, onNavigateBack }) => {
  const [tabValue, setTabValue] = useState(0);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [emailReports, setEmailReports] = useState(user?.emailReports || false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const profileForm = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: { name: user?.name || '' },
  });

  const securityForm = useForm({
    resolver: yupResolver(securitySchema),
  });

  useEffect(() => {
    if (tabValue === 5 && user?.tier === 'BUSINESS') {
      fetchGroups();
      fetchInvitations();
    }
  }, [tabValue]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/groups', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch('https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Failed to fetch invitations', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const response = await fetch('https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName }),
      });
      if (response.ok) {
        setGroupName('');
        fetchGroups();
        setMessage({ type: 'success', text: 'Group created successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to create group' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating group' });
    }
  };

  const handleInvite = async (groupId: number) => {
    if (!inviteEmail.trim()) return;
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (response.ok) {
        setInviteEmail('');
        setMessage({ type: 'success', text: 'Invitation sent' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send invitation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending invitation' });
    }
  };

  const handleAcceptInvitation = async (id: number) => {
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/invitations/${id}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchInvitations();
        fetchGroups();
        setMessage({ type: 'success', text: 'Invitation accepted' });
      } else {
        setMessage({ type: 'error', text: 'Failed to accept invitation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error accepting invitation' });
    }
  };

  const handleDeclineInvitation = async (id: number) => {
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/invitations/${id}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchInvitations();
        setMessage({ type: 'success', text: 'Invitation declined' });
      } else {
        setMessage({ type: 'error', text: 'Failed to decline invitation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error declining invitation' });
    }
  };

  const handleTabChange = (newValue: number) => {
    if (unsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    setTabValue(newValue);
  };

  const handleProfileSubmit = async (data: any) => {
    setLoading(true);
    setMessage(null);
    console.log('Updating profile', data);
    try {
      const nameResponse = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: data.name }),
      });

      if (!nameResponse.ok) {
        const errorText = await nameResponse.text();
        console.log('Name update error:', errorText);
        setMessage({ type: 'error', text: 'Failed to update name' });
        setLoading(false);
        return;
      }

      const updatedUser = await nameResponse.json();
      console.log('Name updated:', updatedUser);

      if (profilePicture) {
        const formData = new FormData();
        formData.append('profilePicture', profilePicture);

        console.log('Uploading profile picture');
        const picResponse = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}/profile-picture`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!picResponse.ok) {
          const errorText = await picResponse.text();
          console.log('Picture update error:', errorText);
          setMessage({ type: 'error', text: 'Name updated but failed to update profile picture' });
          onUserUpdate(updatedUser);
          setLoading(false);
          return;
        }

        const picData = await picResponse.json();
        console.log('Profile picture updated:', picData);
        onUserUpdate({ ...updatedUser, profilePicture: picData.profilePicture });
      } else if (user.profilePicture) {
        onUserUpdate({ ...updatedUser, profilePicture: user.profilePicture });
      } else {
        onUserUpdate(updatedUser);
      }
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setUnsavedChanges(false);
    } catch (error) {
      console.log('Fetch error:', error);
      setMessage({ type: 'error', text: 'Error updating profile' });
    }
    setLoading(false);
  };

  const handleSecuritySubmit = async (data: any) => {
    setLoading(true);
    setMessage(null);
    console.log('Updating password', { currentPassword: '***', newPassword: '***' });
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        securityForm.reset();
        setUnsavedChanges(false);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating password' });
    }
    setLoading(false);
  };

  const handleNotificationsUpdate = async () => {
    setLoading(true);
    setMessage(null);
    console.log('Updating notifications', { emailReports });
    const url = `https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}/notifications`;
    console.log('Sending PUT request to:', url);
    console.log('Request body:', JSON.stringify({ emailReports }));
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emailReports }),
      });
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      if (response.ok) {
        setMessage({ type: 'success', text: 'Notifications updated successfully' });
        setUnsavedChanges(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to update notifications' });
      }
    } catch (error) {
      console.log('Fetch error:', error);
      setMessage({ type: 'error', text: 'Error updating notifications' });
    }
    setLoading(false);
  };

  const handleDataExport = async () => {
    setLoading(true);
    setMessage(null);
    console.log('Exporting data');
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user_data.json';
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Data exported successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to export data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error exporting data' });
    }
    setLoading(false);
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }
    setLoading(true);
    setMessage(null);
    console.log('Deleting account');
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Account deleted successfully' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting account' });
    }
    setLoading(false);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProfilePicture(event.target.files[0]);
      setUnsavedChanges(true);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 25) return 'bg-red-500';
    if (strength < 50) return 'bg-yellow-500';
    if (strength < 75) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <div className="w-full max-w-4xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/60 rounded-3xl shadow-2xl p-6 md:p-12 relative overflow-hidden animate-in fade-in duration-500 slide-in-from-bottom-8">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/20 dark:hidden" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-transparent to-slate-200/10 dark:from-slate-800/30 dark:to-slate-700/20" />
        
        <div className="text-center mb-12 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 drop-shadow-2xl">Settings</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 font-medium max-w-md mx-auto leading-relaxed">Manage your account settings with ease</p>
        </div>

        <div className="settings-tabs-container mb-12 relative z-10">
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl mb-8 hover:shadow-2xl transition-all duration-300">
            <button
              className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] whitespace-nowrap backdrop-blur-sm ${
                tabValue === 0
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-xl border-2 border-white/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-slate-300/50 dark:hover:border-slate-600/50 border border-transparent'
              }`}
              onClick={() => handleTabChange(0)}
            >
              Profile
            </button>
            <button
              className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] whitespace-nowrap backdrop-blur-sm ${
                tabValue === 1
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl border-2 border-white/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-slate-300/50 dark:hover:border-slate-600/50 border border-transparent'
              }`}
              onClick={() => handleTabChange(1)}
            >
              Security
            </button>
            <button
              className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] whitespace-nowrap backdrop-blur-sm ${
                tabValue === 2
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl border-2 border-white/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-slate-300/50 dark:hover:border-slate-600/50 border border-transparent'
              }`}
              onClick={() => handleTabChange(2)}
            >
              Notifications
            </button>
            <button
              className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] whitespace-nowrap backdrop-blur-sm ${
                tabValue === 3
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-xl border-2 border-white/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-slate-300/50 dark:hover:border-slate-600/50 border border-transparent'
              }`}
              onClick={() => handleTabChange(3)}
            >
              Privacy
            </button>
            <button
              className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] whitespace-nowrap backdrop-blur-sm ${
                tabValue === 4
                  ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-xl border-2 border-white/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-slate-300/50 dark:hover:border-slate-600/50 border border-transparent'
              }`}
              onClick={() => handleTabChange(4)}
            >
              Account
            </button>
            {user?.tier === 'BUSINESS' && (
              <button
                className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] whitespace-nowrap backdrop-blur-sm ${
                  tabValue === 5
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xl border-2 border-white/50'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-slate-300/50 dark:hover:border-slate-600/50 border border-transparent'
                }`}
                onClick={() => handleTabChange(5)}
              >
                Groups
              </button>
            )}
          </div>
        </div>

        {tabValue === 0 && (
          <div className="settings-card relative z-10 animate-in zoom-in duration-500">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg">Profile Information</h3>
            <form className="space-y-6" onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
              <div className="flex flex-col items-center mb-12 space-y-4">
                <div className="relative group">
                  <img
                    src={profilePicture ? URL.createObjectURL(profilePicture) : user?.profilePicture ? `${process.env.REACT_APP_API_BASE || 'https://financial-tracker-ai-insight-a194fc716874.herokuapp.com'}${user.profilePicture}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiNGM0Y0RjYiLz48Y2lyY2xlIGN4PSI2NCIgY3k9IjMyIiByPSIyNCIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik0zMiA4MGw0OCAwbC0xNiAzMmgzMnYtMzJoLTQ4WiIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik0zMiAxMTZ2LTE2aDY0djE2SDMyeiIgZmlsbD0iI0ZGQUIvPjwvc3ZnPg=='}
                    alt="Profile"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white/60 shadow-2xl ring-8 ring-white/50 ring-offset-4 ring-offset-slate-100 dark:ring-offset-slate-900 transition-all duration-500 hover:scale-105 group-hover:scale-110"
                  />
                  <button className="absolute -top-2 -right-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl transform hover:scale-110 active:scale-95 transition-all duration-300 font-bold text-xl backdrop-blur-md border-2 border-white/50 z-20" type="button">
                    <label htmlFor="profile-picture-input" className="cursor-pointer flex items-center justify-center w-full h-full">📷</label>
                  </button>
                  <input
                    id="profile-picture-input"
                    className="hidden"
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <input
                    className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium"
                    placeholder="Full Name"
                    {...profileForm.register('name')}
                    onChange={(e) => {
                      profileForm.setValue('name', e.target.value);
                      setUnsavedChanges(true);
                    }}
                  />
                </div>
                <div>
                  <input
                    className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium bg-slate-100/70 dark:bg-slate-800/70 cursor-not-allowed"
                    placeholder="Email"
                    value={user?.email || ''}
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <select
                    className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 appearance-none transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 cursor-pointer"
                    value={theme}
                    onChange={(e) => {
                      if (e.target.value === 'dark' && theme === 'light') toggleTheme();
                      else if (e.target.value === 'light' && theme === 'dark') toggleTheme();
                      setUnsavedChanges(true);
                    }}
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
                <div>
                  <select className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 appearance-none transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 cursor-pointer">
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <button 
                className="w-full md:w-auto bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white py-5 px-12 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mx-auto md:ml-auto"
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        )}

        {tabValue === 1 && (
          <div className="settings-card relative z-10 animate-in zoom-in duration-500">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg">Security Settings</h3>
            <form className="space-y-6" onSubmit={securityForm.handleSubmit(handleSecuritySubmit)}>
              <div>
                <input
                  className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium"
                  type="password"
                  placeholder="Current Password"
                  {...securityForm.register('currentPassword')}
                />
              </div>
              <div>
                <input
                  className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium"
                  type="password"
                  placeholder="New Password"
                  {...securityForm.register('newPassword')}
                />
                {securityForm.watch('newPassword') && (
                  <div className="w-full h-3 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden mb-3 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600/50">
                    <div
                      className={`h-full rounded-full shadow-inner transition-all duration-700 ease-out ${getStrengthColor(getPasswordStrength(securityForm.watch('newPassword') || ''))}`}
                      style={{ width: `${getPasswordStrength(securityForm.watch('newPassword') || '')}%` }}
                    ></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium"
                  type="password"
                  placeholder="Confirm New Password"
                  {...securityForm.register('confirmPassword')}
                />
              </div>
              <button 
                className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-5 px-12 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mx-auto md:ml-auto"
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        )}

        {tabValue === 2 && (
          <div className="settings-card relative z-10 animate-in zoom-in duration-500">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg">Notification Preferences</h3>
            <div className="flex items-center justify-center p-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-3xl border-2 border-amber-200/50 dark:border-amber-800/50 shadow-xl mb-8 backdrop-blur-md hover:shadow-2xl transition-all duration-300">
              <label className="relative inline-flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={emailReports}
                  onChange={(e) => {
                    setEmailReports(e.target.checked);
                    setUnsavedChanges(true);
                  }}
                />
                <div className="w-20 h-10 md:w-24 md:h-12 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-slate-300 rounded-2xl after:h-8 after:w-8 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500 after:md:h-10 after:md:w-10 md:after:top-1.5 md:after:left-1.5 md:after:h-9 md:after:w-9 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                <span className="ml-4 md:ml-6 text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-wide">Email Reports</span>
              </label>
            </div>
            <button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-5 px-12 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mx-auto"
              onClick={handleNotificationsUpdate} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        )}

        {tabValue === 3 && (
          <div className="settings-card relative z-10 animate-in zoom-in duration-500">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg">Privacy & Data</h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl">Export your data in JSON format for backup or migration purposes.</p>
            {user.tier !== 'FREE' ? (
              <button 
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white py-5 px-12 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                onClick={handleDataExport} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  'Export Data'
                )}
              </button>
            ) : (
              <div className="group relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/90 to-yellow-500/90 backdrop-blur-md rounded-3xl shadow-2xl flex items-center justify-center z-10 animate-pulse">
                  <span className="text-white font-bold text-lg px-6 py-3 tracking-wide">Premium Feature</span>
                </div>
                <button 
                  className="w-full bg-gradient-to-r from-slate-400 to-slate-500 text-white py-5 px-12 rounded-3xl font-bold text-xl shadow-xl cursor-not-allowed relative z-0 opacity-50"
                  disabled
                >
                  Export Data
                </button>
              </div>
            )}
          </div>
        )}

        {tabValue === 4 && (
          <div className="settings-card relative z-10 animate-in zoom-in duration-500">
            <div className="bg-gradient-to-br from-rose-50/80 to-red-50/80 dark:from-rose-950/40 dark:to-red-950/40 border-2 border-rose-200/60 dark:border-rose-800/60 rounded-3xl p-10 shadow-2xl hover:shadow-3xl transition-all duration-300 mb-8 backdrop-blur-xl">
              <h4 className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 mb-6 bg-gradient-to-r from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent drop-shadow-xl text-center">⚠️ Danger Zone</h4>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
                Once you delete your account, there is <span className="font-bold text-rose-600 dark:text-rose-400">no going back</span>. Please be certain.
              </p>
              <input
                className="w-full px-6 py-5 border-2 border-rose-300 dark:border-rose-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-rose-400 dark:placeholder-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/50 focus:border-rose-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-semibold text-center tracking-wide mb-6"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
              <button
                className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white py-6 px-12 rounded-3xl font-black text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 tracking-wide uppercase"
                onClick={handleAccountDeletion}
                disabled={loading || deleteConfirmation !== 'DELETE'}
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        )}

        {tabValue === 5 && user?.tier === 'BUSINESS' && (
          <div className="settings-card relative z-10 animate-in zoom-in duration-500">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg">Group Management</h3>
            {groups.length === 0 ? (
              <div className="space-y-6">
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">Create a group to collaborate with up to 4 other users.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    className="flex-1 px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <button 
                    className="px-12 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
                    onClick={handleCreateGroup} 
                    disabled={!groupName.trim()}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Your Groups</h4>
                {groups.map((group) => (
                  <div key={group.id} className="p-8 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h5 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 capitalize">{group.name}</h5>
                    <p className="text-lg text-slate-700 dark:text-slate-300 mb-2"><span className="font-semibold">Owner:</span> {group.owner.name}</p>
                    <p className="text-lg text-slate-700 dark:text-slate-300 mb-6"><span className="font-semibold">Members:</span> {group.members.map((m: any) => m.name).join(', ')}</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input
                        className="flex-1 px-6 py-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 shadow-inner hover:shadow-md"
                        placeholder="Invite Email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <button 
                        className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-60 whitespace-nowrap"
                        onClick={() => handleInvite(group.id)} 
                        disabled={!inviteEmail.trim()}
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {invitations.length > 0 && (
              <div className="mt-12">
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Pending Invitations</h4>
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex flex-col sm:flex-row gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/50 rounded-2xl shadow-xl mb-4 hover:shadow-2xl transition-all duration-300 backdrop-blur-md">
                    <p className="flex-1 text-lg text-slate-800 dark:text-slate-200 font-medium">Invited to <span className="font-bold text-indigo-600 dark:text-indigo-400">{inv.group.name}</span> by <span className="font-bold text-emerald-600 dark:text-emerald-400">{inv.invitedBy.name}</span></p>
                    <div className="flex gap-3">
                      <button 
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                        onClick={() => handleAcceptInvitation(inv.id)}
                      >
                        Accept
                      </button>
                      <button 
                        className="flex-1 bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                        onClick={() => handleDeclineInvitation(inv.id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {message && (
          <div className={`fixed top-6 right-6 w-96 p-6 rounded-3xl shadow-2xl backdrop-blur-xl border-2 transform translate-x-full animate-slide-in-from-right-96 fade-in duration-300 z-50 group data-[closed=false]:animate-in data-[closed=false]:slide-in-from-right-96 data-[closed=false]:fade-in ${message.type === 'success' ? 'bg-emerald-500/95 border-emerald-400/60 text-white shadow-emerald-500/25' : 'bg-red-500/95 border-red-400/60 text-white shadow-red-500/25'} hover:!translate-x-0 transition-all duration-300`} role="alert">
            <p className="font-semibold text-lg mb-2 leading-relaxed">{message.text}</p>
            <button 
              className="absolute top-3 right-3 text-white/80 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-200 hover:rotate-90"
              onClick={() => setMessage(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
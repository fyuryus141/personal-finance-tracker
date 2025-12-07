import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTheme } from '../contexts/ThemeContext';
import './Settings.css';

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
      // Show confirmation dialog
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
      // First, update the name
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

      // Then, update profile picture if provided
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
          // Still update user without picture
          onUserUpdate(updatedUser);
          setLoading(false);
          return;
        }

        const picData = await picResponse.json();
        console.log('Profile picture updated:', picData);
        // Update user with new picture
        onUserUpdate({ ...updatedUser, profilePicture: picData.profilePicture });
      }

      onUserUpdate(updatedUser);
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Settings</h2>
          <p className="login-subtitle">Manage your account settings</p>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${tabValue === 0 ? 'active' : ''}`}
            onClick={() => handleTabChange(0)}
          >
            Profile
          </button>
          <button
            className={`settings-tab ${tabValue === 1 ? 'active' : ''}`}
            onClick={() => handleTabChange(1)}
          >
            Security
          </button>
          <button
            className={`settings-tab ${tabValue === 2 ? 'active' : ''}`}
            onClick={() => handleTabChange(2)}
          >
            Notifications
          </button>
          <button
            className={`settings-tab ${tabValue === 3 ? 'active' : ''}`}
            onClick={() => handleTabChange(3)}
          >
            Privacy
          </button>
          <button
            className={`settings-tab ${tabValue === 4 ? 'active' : ''}`}
            onClick={() => handleTabChange(4)}
          >
            Account
          </button>
          {user?.tier === 'BUSINESS' && (
            <button
              className={`settings-tab ${tabValue === 5 ? 'active' : ''}`}
              onClick={() => handleTabChange(5)}
            >
              Groups
            </button>
          )}
        </div>

        {tabValue === 0 && (
          <div className="settings-card">
            <h3 className="settings-card-title">Profile Information</h3>
            <form className="login-form" onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
              <div className="settings-avatar-section">
                <img
                  src={profilePicture ? URL.createObjectURL(profilePicture) : user?.profilePicture ? `${process.env.REACT_APP_API_BASE}/uploads/${user.profilePicture}` : '/default-avatar.png'}
                  alt="Profile"
                  className="settings-avatar"
                />
                <button className="settings-avatar-button" type="button">
                  <label htmlFor="profile-picture-input">📷</label>
                  <input
                    id="profile-picture-input"
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                </button>
              </div>
              <div className="settings-form-row">
                <div className="input-group">
                  <input
                    className="login-input"
                    placeholder="Name"
                    {...profileForm.register('name')}
                    onChange={(e) => {
                      profileForm.setValue('name', e.target.value);
                      setUnsavedChanges(true);
                    }}
                  />
                </div>
                <div className="input-group">
                  <input
                    className="login-input"
                    placeholder="Email"
                    value={user?.email || ''}
                    readOnly
                  />
                </div>
              </div>
              <div className="settings-form-row">
                <div className="input-group">
                  <select
                    className="settings-select"
                    value={theme}
                    onChange={(e) => {
                      if (e.target.value === 'dark' && theme === 'light') toggleTheme();
                      else if (e.target.value === 'light' && theme === 'dark') toggleTheme();
                      setUnsavedChanges(true);
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className="input-group">
                  <select className="settings-select" value="en">
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <button className="login-button" type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {tabValue === 1 && (
          <div className="settings-card">
            <h3 className="settings-card-title">Security Settings</h3>
            <form className="login-form" onSubmit={securityForm.handleSubmit(handleSecuritySubmit)}>
              <div className="input-group">
                <input
                  className="login-input"
                  type="password"
                  placeholder="Current Password"
                  {...securityForm.register('currentPassword')}
                />
              </div>
              <div className="input-group">
                <input
                  className="login-input"
                  type="password"
                  placeholder="New Password"
                  {...securityForm.register('newPassword')}
                />
                {securityForm.watch('newPassword') && (
                  <div className="settings-progress">
                    <div
                      className="settings-progress-bar"
                      style={{ width: `${getPasswordStrength(securityForm.watch('newPassword'))}%` }}
                    ></div>
                  </div>
                )}
              </div>
              <div className="input-group">
                <input
                  className="login-input"
                  type="password"
                  placeholder="Confirm New Password"
                  {...securityForm.register('confirmPassword')}
                />
              </div>
              <button className="login-button" type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {tabValue === 2 && (
          <div className="settings-card">
            <h3 className="settings-card-title">Notification Preferences</h3>
            <div className="settings-switch">
              <input
                type="checkbox"
                checked={emailReports}
                onChange={(e) => {
                  setEmailReports(e.target.checked);
                  setUnsavedChanges(true);
                }}
              />
              <label>Email Reports</label>
            </div>
            <button className="login-button" onClick={handleNotificationsUpdate} disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {tabValue === 3 && (
          <div className="settings-card">
            <h3 className="settings-card-title">Privacy & Data</h3>
            <p>Export your data in JSON format for backup or migration purposes.</p>
            {user.tier !== 'FREE' ? (
              <button className="login-button" onClick={handleDataExport} disabled={loading}>
                {loading ? 'Exporting...' : 'Export Data'}
              </button>
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  <div style={{ textAlign: 'center', color: '#FFFFFF', fontSize: '12px' }}>
                    Premium Feature
                  </div>
                </div>
                <button className="login-button" disabled>
                  Export Data
                </button>
              </div>
            )}
          </div>
        )}

        {tabValue === 4 && (
          <div className="settings-card">
            <div className="settings-danger-zone">
              <h4 className="settings-danger-title">Danger Zone</h4>
              <p className="settings-danger-text">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <input
                className="login-input"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
              <button
                className="settings-delete-button"
                onClick={handleAccountDeletion}
                disabled={loading || deleteConfirmation !== 'DELETE'}
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}

        {tabValue === 5 && user?.tier === 'BUSINESS' && (
          <div className="settings-card">
            <h3 className="settings-card-title">Group Management</h3>
            {groups.length === 0 ? (
              <div>
                <p>Create a group to collaborate with up to 4 other users.</p>
                <input
                  className="login-input"
                  placeholder="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <button className="login-button" onClick={handleCreateGroup} disabled={!groupName.trim()}>
                  Create Group
                </button>
              </div>
            ) : (
              <div>
                <h4>Your Groups</h4>
                {groups.map((group) => (
                  <div key={group.id}>
                    <h5>{group.name}</h5>
                    <p>Owner: {group.owner.name}</p>
                    <p>Members: {group.members.map((m: any) => m.name).join(', ')}</p>
                    <input
                      className="login-input"
                      placeholder="Invite Email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <button className="login-button" onClick={() => handleInvite(group.id)} disabled={!inviteEmail.trim()}>
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
            {invitations.length > 0 && (
              <div>
                <h4>Pending Invitations</h4>
                {invitations.map((inv) => (
                  <div key={inv.id}>
                    <p>Invited to {inv.group.name} by {inv.invitedBy.name}</p>
                    <button className="login-button" onClick={() => handleAcceptInvitation(inv.id)}>Accept</button>
                    <button className="settings-delete-button" onClick={() => handleDeclineInvitation(inv.id)}>Decline</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {message && (
          <div className={`settings-alert ${message.type}`}>
            <p className="settings-alert-text">{message.text}</p>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
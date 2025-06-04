import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  History, 
  Settings, 
  CheckSquare, 
  Users, 
  User, 
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Download,
  Info,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { JournalEntry } from '../../types/journal';
import JournalApiService from '../../services/journalApi';

interface PrivacyDashboardProps {
  onClose: () => void;
}

interface PrivacyAuditEvent {
  id: string;
  entryId: string;
  timestamp: string;
  action: string;
  changes: string[];
  oldSettings: any;
  newSettings: any;
}

interface PrivacyNotification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  read?: boolean;
}

interface PrivacySummary {
  totalEntries: number;
  privateEntries: number;
  sharedEntries: number;
  encryptedEntries: number;
  recentChanges: number;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [auditEvents, setAuditEvents] = useState<PrivacyAuditEvent[]>([]);
  const [notifications, setNotifications] = useState<PrivacyNotification[]>([]);
  const [summary, setSummary] = useState<PrivacySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'entries' | 'audit' | 'notifications'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'shared'>('all');

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load journal entries
      const entriesResponse = await JournalApiService.getEntries({
        limit: 100, // Get all entries for privacy management
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
      setEntries(entriesResponse.entries || []);

      // Calculate summary
      const totalEntries = entriesResponse.entries?.length || 0;
      const privateEntries = entriesResponse.entries?.filter(e => e.isPrivate).length || 0;
      const sharedEntries = entriesResponse.entries?.filter(e => 
        e.isShareableWithTeacher || e.isShareableWithParent
      ).length || 0;

      setSummary({
        totalEntries,
        privateEntries,
        sharedEntries,
        encryptedEntries: privateEntries, // Assume private entries are encrypted
        recentChanges: 0 // This would come from audit API
      });

      // Mock audit events and notifications for now
      // In production, these would come from the privacy manager API
      setAuditEvents([
        {
          id: '1',
          entryId: 'entry1',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          action: 'privacy_settings_changed',
          changes: ['sharing_enabled'],
          oldSettings: { isPrivate: true, isShareableWithTeacher: false },
          newSettings: { isPrivate: false, isShareableWithTeacher: true }
        }
      ]);

      setNotifications([
        {
          id: '1',
          type: 'sharing_enabled',
          message: 'Your journal entry "Today\'s Learning" is now shared with your teacher',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          priority: 'medium'
        }
      ]);

    } catch (error) {
      console.error('Failed to load privacy dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on search and privacy filter
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = privacyFilter === 'all' ||
      (privacyFilter === 'private' && entry.isPrivate) ||
      (privacyFilter === 'shared' && (entry.isShareableWithTeacher || entry.isShareableWithParent));

    return matchesSearch && matchesFilter;
  });

  // Handle entry selection
  const handleEntrySelect = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(entry => entry.id)));
    }
  };

  // Bulk privacy operations
  const handleBulkPrivacyUpdate = async (privacySettings: {
    isPrivate: boolean;
    isShareableWithTeacher: boolean;
    isShareableWithParent: boolean;
  }) => {
    if (selectedEntries.size === 0) return;

    try {
      setBulkLoading(true);
      const entryIds = Array.from(selectedEntries);
      
      // Update each selected entry
      for (const entryId of entryIds) {
        await JournalApiService.updateEntry({
          id: entryId,
          ...privacySettings
        });
      }

      // Reload data
      await loadDashboardData();
      setSelectedEntries(new Set());
      
      // Show success message
      alert(`Privacy settings updated for ${entryIds.length} entries`);
    } catch (error) {
      console.error('Bulk privacy update failed:', error);
      alert('Failed to update privacy settings');
    } finally {
      setBulkLoading(false);
    }
  };

  const getPrivacyIcon = (entry: JournalEntry) => {
    if (entry.isPrivate) {
      return <Lock className="w-4 h-4 text-red-600" />;
    } else if (entry.isShareableWithTeacher && entry.isShareableWithParent) {
      return <Eye className="w-4 h-4 text-purple-600" />;
    } else if (entry.isShareableWithTeacher) {
      return <User className="w-4 h-4 text-blue-600" />;
    } else if (entry.isShareableWithParent) {
      return <Users className="w-4 h-4 text-green-600" />;
    }
    return <EyeOff className="w-4 h-4 text-gray-400" />;
  };

  const getPrivacyStatus = (entry: JournalEntry) => {
    if (entry.isPrivate) return 'Private';
    if (entry.isShareableWithTeacher && entry.isShareableWithParent) return 'Shared with Both';
    if (entry.isShareableWithTeacher) return 'Shared with Teacher';
    if (entry.isShareableWithParent) return 'Shared with Parent';
    return 'Unknown';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-blue-600 animate-spin mr-3" />
            <span className="text-lg">Loading privacy dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Privacy Dashboard</h2>
                <p className="text-blue-100">Manage your journal privacy settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Shield },
              { id: 'entries', label: 'Manage Entries', icon: Settings },
              { id: 'audit', label: 'Audit Trail', icon: History },
              { id: 'notifications', label: 'Notifications', icon: Bell }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Shield className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {summary?.totalEntries || 0}
                      </div>
                      <div className="text-sm text-blue-700">Total Entries</div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Lock className="w-6 h-6 text-red-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-red-900">
                        {summary?.privateEntries || 0}
                      </div>
                      <div className="text-sm text-red-700">Private & Encrypted</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Eye className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {summary?.sharedEntries || 0}
                      </div>
                      <div className="text-sm text-green-700">Shared Entries</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-6 h-6 text-yellow-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-900">
                        {summary?.recentChanges || 0}
                      </div>
                      <div className="text-sm text-yellow-700">Recent Changes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-500" />
                  Your Privacy Protection
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Data Security</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Private entries are encrypted with AES-256
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Only you can decrypt your private content
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        All privacy changes are logged and auditable
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Sharing Control</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        You control who sees your entries
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Privacy settings can be changed anytime
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Notifications when sharing changes
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setSelectedTab('entries')}
                    className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-blue-600 mr-3" />
                    <span className="font-medium text-blue-900">Manage Entry Privacy</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedTab('audit')}
                    className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <History className="w-5 h-5 text-green-600 mr-3" />
                    <span className="font-medium text-green-900">View Privacy History</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedTab('notifications')}
                    className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Bell className="w-5 h-5 text-purple-600 mr-3" />
                    <span className="font-medium text-purple-900">Check Notifications</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'entries' && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={privacyFilter}
                  onChange={(e) => setPrivacyFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Entries</option>
                  <option value="private">Private Only</option>
                  <option value="shared">Shared Only</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selectedEntries.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-900 font-medium">
                      {selectedEntries.size} entries selected
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBulkPrivacyUpdate({
                          isPrivate: true,
                          isShareableWithTeacher: false,
                          isShareableWithParent: false
                        })}
                        disabled={bulkLoading}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        Make Private
                      </button>
                      
                      <button
                        onClick={() => handleBulkPrivacyUpdate({
                          isPrivate: false,
                          isShareableWithTeacher: true,
                          isShareableWithParent: false
                        })}
                        disabled={bulkLoading}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Share with Teacher
                      </button>
                      
                      <button
                        onClick={() => handleBulkPrivacyUpdate({
                          isPrivate: false,
                          isShareableWithTeacher: false,
                          isShareableWithParent: true
                        })}
                        disabled={bulkLoading}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        Share with Parent
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Entry List */}
              <div className="bg-white border border-gray-200 rounded-lg">
                {/* Header */}
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filteredEntries.length > 0 && selectedEntries.size === filteredEntries.length}
                      onChange={handleSelectAll}
                      className="mr-3"
                    />
                    <span className="font-medium text-gray-900">
                      Select All ({filteredEntries.length} entries)
                    </span>
                  </div>
                </div>

                {/* Entry Items */}
                <div className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => handleEntrySelect(entry.id)}
                          className="mr-3"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{entry.title}</h4>
                            <div className="flex items-center space-x-2">
                              {getPrivacyIcon(entry)}
                              <span className="text-sm text-gray-600">
                                {getPrivacyStatus(entry)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-500">
                            Created {formatTimestamp(entry.createdAt)} • {entry.wordCount} words
                          </div>
                          
                          {entry.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredEntries.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No entries found matching your criteria.
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Privacy Change History</h3>
                  <p className="text-sm text-gray-600">Track all changes to your privacy settings</p>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {auditEvents.map((event) => (
                    <div key={event.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <History className="w-4 h-4 text-blue-500 mr-2" />
                            <span className="font-medium text-gray-900">
                              Privacy settings changed
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-600">
                            <div>Entry: {event.entryId}</div>
                            <div>Changes: {event.changes.join(', ')}</div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {auditEvents.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No privacy changes recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Privacy Notifications</h3>
                  <p className="text-sm text-gray-600">Important updates about your privacy settings</p>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 ${!notification.read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Bell className={`w-4 h-4 mr-2 ${
                              notification.priority === 'high' ? 'text-red-500' :
                              notification.priority === 'medium' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`} />
                            <span className="font-medium text-gray-900">
                              {notification.message}
                            </span>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-600">
                            Type: {notification.type} • Priority: {notification.priority}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {notifications.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 
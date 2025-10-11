import React, { useState, useEffect, useRef } from 'react';
import './BulkActionChangeOwnerModal.scss';

interface User {
  name: string;
  username: string;
}

interface BulkActionChangeOwnerModalProps {
  isOpen: boolean;
  selectedMediaIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  csrfToken: string;
}

export const BulkActionChangeOwnerModal: React.FC<BulkActionChangeOwnerModalProps> = ({
  isOpen,
  selectedMediaIds,
  onCancel,
  onSuccess,
  onError,
  csrfToken,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUser(null);
    }
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (searchBoxRef.current) {
      const rect = searchBoxRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const searchUsers = async (name: string) => {
    if (!name.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/v1/users?name=${encodeURIComponent(name)}`);
      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setSearchResults(data.results || data);
      updateDropdownPosition();
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      searchUsers(value);
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchTerm(user.name + ' - ' + user.username);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      onError('Please select a user');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/v1/media/user/bulk_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          action: 'change_owner',
          media_ids: selectedMediaIds,
          owner: selectedUser.username,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change owner');
      }

      const data = await response.json();
      onSuccess(data.detail || 'Successfully changed owner');
      onCancel();
    } catch (error) {
      console.error('Error changing owner:', error);
      onError('Failed to change owner. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="change-owner-modal-overlay">
      <div className="change-owner-modal">
        <div className="change-owner-modal-header">
          <h2>Select Owner</h2>
          <button className="change-owner-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="change-owner-modal-content">
          <div className="search-box-wrapper" ref={searchBoxRef}>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search for user..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {selectedUser && (
            <div className="selected-user">
              <span>Selected: {selectedUser.name} - {selectedUser.username}</span>
            </div>
          )}
        </div>

        <div className="change-owner-modal-footer">
          <button className="change-owner-btn change-owner-btn-cancel" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button
            className="change-owner-btn change-owner-btn-submit"
            onClick={handleSubmit}
            disabled={isProcessing || !selectedUser}
          >
            {isProcessing ? 'Processing...' : 'Submit'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div
          className="search-results"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {searchResults.slice(0, 10).map((user) => (
            <div
              key={user.username}
              className="search-result-item"
              onClick={() => handleUserSelect(user)}
            >
              {user.name} - {user.username}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

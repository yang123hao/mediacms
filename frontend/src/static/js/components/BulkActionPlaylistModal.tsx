import React, { useState, useEffect } from 'react';
import './BulkActionPlaylistModal.scss';

interface Playlist {
  id?: number;
  friendly_token: string;
  title: string;
}

interface BulkActionPlaylistModalProps {
  isOpen: boolean;
  selectedMediaIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  csrfToken: string;
  username: string;
}

export const BulkActionPlaylistModal: React.FC<BulkActionPlaylistModalProps> = ({
  isOpen,
  selectedMediaIds,
  onCancel,
  onSuccess,
  onError,
  csrfToken,
  username,
}) => {
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Playlist[]>([]);
  const [originalSelectedPlaylists, setOriginalSelectedPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    if (isOpen && selectedMediaIds.length > 0) {
      fetchData();
    } else {
      // Reset state when modal closes
      setAvailablePlaylists([]);
      setSelectedPlaylists([]);
      setOriginalSelectedPlaylists([]);
      setSearchTerm('');
      setIsCreatingPlaylist(false);
      setNewPlaylistName('');
    }
  }, [isOpen, selectedMediaIds]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch user's playlists
      const playlistsResponse = await fetch(`/api/v1/playlists?author=${encodeURIComponent(username)}`);
      if (!playlistsResponse.ok) {
        throw new Error('Failed to fetch playlists');
      }
      const playlistsData = await playlistsResponse.json();
      const allPlaylists: Playlist[] = playlistsData.results || [];

      // Fetch existing membership
      const membershipResponse = await fetch('/api/v1/media/user/bulk_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          action: 'playlist_membership',
          media_ids: selectedMediaIds,
        }),
      });

      if (!membershipResponse.ok) {
        throw new Error('Failed to fetch playlist membership');
      }

      const membershipData = await membershipResponse.json();
      const existingPlaylists: Playlist[] = membershipData.results || [];

      // Set selected playlists (those that already contain all media)
      setSelectedPlaylists(existingPlaylists);
      setOriginalSelectedPlaylists(existingPlaylists);

      // Keep all playlists in available list (we'll show selected ones as disabled)
      setAvailablePlaylists(allPlaylists);
    } catch (error) {
      console.error('Error fetching data:', error);
      onError('Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    // Add to selected (don't remove from available)
    if (!selectedPlaylists.some((p) => p.friendly_token === playlist.friendly_token)) {
      setSelectedPlaylists([...selectedPlaylists, playlist]);
    }
  };

  const handlePlaylistRemove = (playlist: Playlist) => {
    // Remove from selected
    setSelectedPlaylists(selectedPlaylists.filter((p) => p.friendly_token !== playlist.friendly_token));
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/v1/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          title: newPlaylistName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      const newPlaylist = await response.json();

      // Add to available playlists
      setAvailablePlaylists([...availablePlaylists, newPlaylist]);

      // Reset create form
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const handleProceed = async () => {
    setIsProcessing(true);

    try {
      // Determine which playlists to add (new in selected, not in original)
      const originalTokens = new Set(originalSelectedPlaylists.map((p) => p.friendly_token));
      const currentTokens = new Set(selectedPlaylists.map((p) => p.friendly_token));

      const toAdd = selectedPlaylists.filter((p) => !originalTokens.has(p.friendly_token));
      const toRemove = originalSelectedPlaylists.filter((p) => !currentTokens.has(p.friendly_token));

      // Add to playlists
      if (toAdd.length > 0) {
        const playlistIds = toAdd.map((p) => p.id).filter((id): id is number => id !== undefined);
        if (playlistIds.length > 0) {
          const addResponse = await fetch('/api/v1/media/user/bulk_actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({
              action: 'add_to_playlist',
              media_ids: selectedMediaIds,
              playlist_ids: playlistIds,
            }),
          });

          if (!addResponse.ok) {
            throw new Error('Failed to add media to playlists');
          }
        }
      }

      // Remove from playlists
      if (toRemove.length > 0) {
        const playlistIds = toRemove.map((p) => p.id).filter((id): id is number => id !== undefined);
        if (playlistIds.length > 0) {
          const removeResponse = await fetch('/api/v1/media/user/bulk_actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({
              action: 'remove_from_playlist',
              media_ids: selectedMediaIds,
              playlist_ids: playlistIds,
            }),
          });

          if (!removeResponse.ok) {
            throw new Error('Failed to remove media from playlists');
          }
        }
      }

      onSuccess('Successfully updated playlist membership');
      onCancel();
    } catch (error) {
      console.error('Error processing playlists:', error);
      onError('Failed to update playlists. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAvailablePlaylists = availablePlaylists.filter((playlist) =>
    playlist.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasChanges =
    selectedPlaylists.length !== originalSelectedPlaylists.length ||
    !selectedPlaylists.every((p) =>
      originalSelectedPlaylists.some((op) => op.friendly_token === p.friendly_token)
    );

  if (!isOpen) return null;

  return (
    <div className="playlist-modal-overlay">
      <div className="playlist-modal">
        <div className="playlist-modal-header">
          <h2>Manage Playlists</h2>
          <button className="playlist-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="playlist-modal-content">
          <div className="playlist-panel">
            <h3>Playlists</h3>
            {isCreatingPlaylist ? (
              <div className="create-playlist-form">
                <input
                  type="text"
                  placeholder="Enter playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreatePlaylist();
                    }
                  }}
                  autoFocus
                />
                <div className="create-playlist-buttons">
                  <button className="create-btn" onClick={handleCreatePlaylist}>
                    Create
                  </button>
                  <button className="cancel-btn" onClick={() => setIsCreatingPlaylist(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="create-playlist-btn" onClick={() => setIsCreatingPlaylist(true)}>
                + Create Playlist
              </button>
            )}

            <div className="search-box">
              <input
                type="text"
                placeholder="Filter playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="loading-message">Loading playlists...</div>
            ) : (
              <div className="playlist-list">
                {filteredAvailablePlaylists.length === 0 ? (
                  <div className="empty-message">No playlists available</div>
                ) : (
                  filteredAvailablePlaylists.map((playlist) => {
                    const isSelected = selectedPlaylists.some((p) => p.friendly_token === playlist.friendly_token);
                    return (
                      <div
                        key={playlist.friendly_token}
                        className={`playlist-item ${isSelected ? 'playlist-item-disabled' : ''}`}
                        onClick={() => !isSelected && handlePlaylistSelect(playlist)}
                      >
                        <span>{playlist.title}</span>
                        <button className="add-btn" disabled={isSelected}>
                          +
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="playlist-panel">
            <h3>Add to</h3>
            <div className="playlist-list">
              {selectedPlaylists.length === 0 ? (
                <div className="empty-message">No playlists selected</div>
              ) : (
                selectedPlaylists.map((playlist) => (
                  <div key={playlist.friendly_token} className="playlist-item">
                    <span>{playlist.title}</span>
                    <button className="remove-btn" onClick={() => handlePlaylistRemove(playlist)}>
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="playlist-modal-footer">
          <button className="playlist-btn playlist-btn-cancel" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button
            className="playlist-btn playlist-btn-proceed"
            onClick={handleProceed}
            disabled={isProcessing || !hasChanges}
          >
            {isProcessing ? 'Processing...' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
};

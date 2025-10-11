import React, { useState, useEffect } from 'react';
import './BulkActionPublishStateModal.scss';

interface BulkActionPublishStateModalProps {
  isOpen: boolean;
  selectedMediaIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  csrfToken: string;
}

const PUBLISH_STATES = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
];

export const BulkActionPublishStateModal: React.FC<BulkActionPublishStateModalProps> = ({
  isOpen,
  selectedMediaIds,
  onCancel,
  onSuccess,
  onError,
  csrfToken,
}) => {
  const [selectedState, setSelectedState] = useState('public');
  const [initialState, setInitialState] = useState('public');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedState('public');
      setInitialState('public');
    } else {
      // When modal opens, set initial state
      setInitialState('public');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedState) {
      onError('Please select a publish state');
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
          action: 'set_state',
          media_ids: selectedMediaIds,
          state: selectedState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set publish state');
      }

      const data = await response.json();
      onSuccess(data.detail || 'Successfully updated publish state');
      onCancel();
    } catch (error) {
      console.error('Error setting publish state:', error);
      onError('Failed to set publish state. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const hasStateChanged = selectedState !== initialState;

  return (
    <div className="publish-state-modal-overlay">
      <div className="publish-state-modal">
        <div className="publish-state-modal-header">
          <h2>Publish State</h2>
          <button className="publish-state-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="publish-state-modal-content">
          <div className="state-selector">
            <label htmlFor="publish-state-select">Select publish state:</label>
            <select
              id="publish-state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              disabled={isProcessing}
            >
              {PUBLISH_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="publish-state-modal-footer">
          <button className="publish-state-btn publish-state-btn-cancel" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button
            className="publish-state-btn publish-state-btn-submit"
            onClick={handleSubmit}
            disabled={isProcessing || !hasStateChanged}
          >
            {isProcessing ? 'Processing...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

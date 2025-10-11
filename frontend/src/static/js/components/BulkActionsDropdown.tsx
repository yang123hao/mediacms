import React from 'react';
import './BulkActionsDropdown.scss';

interface BulkActionsDropdownProps {
  selectedCount: number;
  onActionSelect: (action: string) => void;
}

const BULK_ACTIONS = [
  { value: 'add-remove-coviewers', label: 'Add / Remove Co-Viewers', enabled: true },
  { value: 'add-remove-coeditors', label: 'Add / Remove Co-Editors', enabled: true },
  { value: 'add-remove-coowners', label: 'Add / Remove Co-Owners', enabled: true },
  { value: 'add-remove-playlist', label: 'Add to / Remove from Playlist', enabled: true },
  { value: 'add-remove-category', label: 'Add to / Remove from Category', enabled: false },
  { value: 'add-remove-tags', label: 'Add / Remove Tags', enabled: false },
  { value: 'enable-comments', label: 'Enable Comments', enabled: true },
  { value: 'disable-comments', label: 'Disable Comments', enabled: true },
  { value: 'enable-download', label: 'Enable Download', enabled: true },
  { value: 'disable-download', label: 'Disable Download', enabled: true },
  { value: 'publish-state', label: 'Publish State', enabled: true },
  { value: 'change-owner', label: 'Change Owner', enabled: true },
  { value: 'copy-media', label: 'Copy Media', enabled: true },
  { value: 'delete-media', label: 'Delete Media', enabled: true },
];

export const BulkActionsDropdown: React.FC<BulkActionsDropdownProps> = ({ selectedCount, onActionSelect }) => {
  const noSelection = selectedCount === 0;


  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (!value) return;

    if (noSelection) {
      event.target.value = '';
      return;
    }

    onActionSelect(value);
    // Reset dropdown after selection
    event.target.value = '';
  };

  const displayText = noSelection
    ? 'Bulk Actions'
    : `Bulk Actions (${selectedCount} selected)`;

  return (
    <div className="bulk-actions-dropdown">
      <select
        className={'bulk-actions-select' + (noSelection ? ' no-selection' : '')}
        onChange={handleChange}
        value=""
        aria-label="Bulk Actions"
      >
        <option value="" disabled>
          {displayText}
        </option>
        {BULK_ACTIONS.map((action) => (
          <option key={action.value} value={action.value} disabled={noSelection || !action.enabled}>
            {action.label}
          </option>
        ))}
      </select>
    </div>
  );
};

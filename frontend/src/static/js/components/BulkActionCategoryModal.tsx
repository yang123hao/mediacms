import React, { useState, useEffect } from 'react';
import './BulkActionCategoryModal.scss';

interface Category {
  title: string;
  uid: string;
}

interface BulkActionCategoryModalProps {
  isOpen: boolean;
  selectedMediaIds: string[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  csrfToken: string;
}

export const BulkActionCategoryModal: React.FC<BulkActionCategoryModalProps> = ({
  isOpen,
  selectedMediaIds,
  onCancel,
  onSuccess,
  onError,
  csrfToken,
}) => {
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoriesToAdd, setCategoriesToAdd] = useState<Category[]>([]);
  const [categoriesToRemove, setCategoriesToRemove] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && selectedMediaIds.length > 0) {
      fetchData();
    } else {
      // Reset state when modal closes
      setExistingCategories([]);
      setAllCategories([]);
      setCategoriesToAdd([]);
      setCategoriesToRemove([]);
    }
  }, [isOpen, selectedMediaIds]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch existing categories (intersection - categories all selected media belong to)
      const existingResponse = await fetch('/api/v1/media/user/bulk_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          action: 'category_membership',
          media_ids: selectedMediaIds,
        }),
      });

      if (!existingResponse.ok) {
        throw new Error('Failed to fetch existing categories');
      }

      const existingData = await existingResponse.json();
      const existing = existingData.results || [];

      // Fetch all categories
      const allResponse = await fetch('/api/v1/categories');
      if (!allResponse.ok) {
        throw new Error('Failed to fetch all categories');
      }

      const allData = await allResponse.json();
      const all = allData.results || allData;

      setExistingCategories(existing);
      setAllCategories(all);
    } catch (error) {
      console.error('Error fetching categories:', error);
      onError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const addCategoryToList = (category: Category) => {
    if (!categoriesToAdd.some((c) => c.uid === category.uid)) {
      setCategoriesToAdd([...categoriesToAdd, category]);
    }
  };

  const removeCategoryFromAddList = (category: Category) => {
    setCategoriesToAdd(categoriesToAdd.filter((c) => c.uid !== category.uid));
  };

  const markCategoryForRemoval = (category: Category) => {
    if (!categoriesToRemove.some((c) => c.uid === category.uid)) {
      setCategoriesToRemove([...categoriesToRemove, category]);
    }
  };

  const unmarkCategoryForRemoval = (category: Category) => {
    setCategoriesToRemove(categoriesToRemove.filter((c) => c.uid !== category.uid));
  };

  const handleProceed = async () => {
    setIsProcessing(true);

    try {
      // First, add categories if any
      if (categoriesToAdd.length > 0) {
        const uidsToAdd = categoriesToAdd.map((c) => c.uid);
        const addResponse = await fetch('/api/v1/media/user/bulk_actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({
            action: 'add_to_category',
            media_ids: selectedMediaIds,
            category_uids: uidsToAdd,
          }),
        });

        if (!addResponse.ok) {
          throw new Error('Failed to add categories');
        }
      }

      // Then, remove categories if any
      if (categoriesToRemove.length > 0) {
        const uidsToRemove = categoriesToRemove.map((c) => c.uid);
        const removeResponse = await fetch('/api/v1/media/user/bulk_actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({
            action: 'remove_from_category',
            media_ids: selectedMediaIds,
            category_uids: uidsToRemove,
          }),
        });

        if (!removeResponse.ok) {
          throw new Error('Failed to remove categories');
        }
      }

      onSuccess('Successfully updated categories');
      onCancel();
    } catch (error) {
      console.error('Error processing categories:', error);
      onError('Failed to update categories. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get categories for left panel (all categories minus those already existing)
  const getLeftPanelCategories = () => {
    return allCategories.filter(
      (cat) => !existingCategories.some((existing) => existing.uid === cat.uid)
    );
  };

  // Get categories for right panel ("Add to" - existing + newly added)
  const getRightPanelCategories = () => {
    // Combine existing categories with newly added ones
    const combined = [...existingCategories, ...categoriesToAdd];
    return combined;
  };

  if (!isOpen) return null;

  const leftPanelCategories = getLeftPanelCategories();
  const rightPanelCategories = getRightPanelCategories();

  return (
    <div className="category-modal-overlay">
      <div className="category-modal">
        <div className="category-modal-header">
          <h2>Add / Remove from Categories</h2>
          <button className="category-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="category-modal-content">
          <div className="category-panel">
            <h3>Categories</h3>

            {isLoading ? (
              <div className="loading-message">Loading categories...</div>
            ) : (
              <div className="category-list scrollable">
                {leftPanelCategories.length === 0 ? (
                  <div className="empty-message">All categories already added</div>
                ) : (
                  leftPanelCategories.map((category) => (
                    <div
                      key={category.uid}
                      className="category-item clickable"
                      onClick={() => addCategoryToList(category)}
                    >
                      <span>{category.title}</span>
                      <button className="add-btn">+</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="category-panel">
            <h3>Add to</h3>

            {isLoading ? (
              <div className="loading-message">Loading categories...</div>
            ) : (
              <div className="category-list scrollable">
                {rightPanelCategories.length === 0 ? (
                  <div className="empty-message">No categories</div>
                ) : (
                  rightPanelCategories.map((category) => {
                    const isExisting = existingCategories.some((c) => c.uid === category.uid);
                    const isMarkedForRemoval = categoriesToRemove.some((c) => c.uid === category.uid);

                    return (
                      <div key={category.uid} className={`category-item ${isMarkedForRemoval ? 'marked-for-removal' : ''}`}>
                        <span>{category.title}</span>
                        <button
                          className="remove-btn"
                          onClick={() => {
                            if (isExisting) {
                              // This is an existing category - mark/unmark for removal
                              isMarkedForRemoval ? unmarkCategoryForRemoval(category) : markCategoryForRemoval(category);
                            } else {
                              // This is a newly added category - remove from add list
                              removeCategoryFromAddList(category);
                            }
                          }}
                          title={isMarkedForRemoval ? 'Undo removal' : isExisting ? 'Remove category' : 'Remove from list'}
                        >
                          {isMarkedForRemoval ? '↺' : '×'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="category-modal-footer">
          <button className="category-btn category-btn-cancel" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button
            className="category-btn category-btn-proceed"
            onClick={handleProceed}
            disabled={isProcessing || (categoriesToAdd.length === 0 && categoriesToRemove.length === 0)}
          >
            {isProcessing ? 'Processing...' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
};

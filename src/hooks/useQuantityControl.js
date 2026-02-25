import { useState } from 'react';
import { useDB } from '../context/DBContext';

/**
 * Shared hook for +/- quantity controls across all screens.
 *
 * Behaviour:
 *   inc(item)  → quantity + 1, clears needsRestock flag
 *   dec(item)  → quantity - 1; if would hit 0, shows a dialog:
 *                  "Remove Item"         → deleteItem
 *                  "Keep & Restock Alert" → sets quantity=0, needsRestock=true
 *
 * Returns:
 *   { inc, dec, zeroModal, ZeroModal }
 *   - inc / dec  : call with an item object
 *   - ZeroModal  : JSX to render once anywhere in the screen
 */
export function useQuantityControl() {
  const { updateItem, deleteItem } = useDB();
  const [zeroTarget, setZeroTarget] = useState(null); // item that just hit 0

  const inc = (item) => {
    updateItem(item.id, {
      quantity:     item.quantity + 1,
      needsRestock: false,   // clear restock flag as soon as stock rises
    });
  };

  const dec = (item) => {
    if (item.quantity <= 0) return;
    if (item.quantity === 1) {
      // About to hit zero — open the dialog
      setZeroTarget(item);
    } else {
      updateItem(item.id, { quantity: item.quantity - 1 });
    }
  };

  const handleRemove = () => {
    if (zeroTarget) deleteItem(zeroTarget.id);
    setZeroTarget(null);
  };

  const handleKeep = () => {
    if (zeroTarget) updateItem(zeroTarget.id, { quantity: 0, needsRestock: true });
    setZeroTarget(null);
  };

  const handleCancel = () => setZeroTarget(null);

  return { inc, dec, zeroTarget, handleRemove, handleKeep, handleCancel };
}

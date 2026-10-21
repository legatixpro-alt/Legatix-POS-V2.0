import { useEffect } from 'react';

type BackHandler = () => boolean | void;

// LIFO stack for open modals, dialogs, drawers, and sheets
const activeModalHandlers: Array<{ id: string; handler: BackHandler }> = [];

let tabHistory: string[] = [];
let currentTab: string = '';
let onTabNavigate: ((tab: any) => void) | null = null;
let lastBackPressTime = 0;
let isInitialized = false;

/**
 * Register a modal or subview dismiss handler on the back stack.
 */
export function registerBackHandler(id: string, handler: BackHandler): () => void {
  // Remove any existing handler with the same ID first
  const existingIdx = activeModalHandlers.findIndex(item => item.id === id);
  if (existingIdx !== -1) {
    activeModalHandlers.splice(existingIdx, 1);
  }

  activeModalHandlers.push({ id, handler });

  return () => {
    const idx = activeModalHandlers.findIndex(item => item.id === id);
    if (idx !== -1) {
      activeModalHandlers.splice(idx, 1);
    }
  };
}

/**
 * React hook to effortlessly register any modal with the native Android / mobile back button.
 * When open is true, pressing back in the device closes this modal before navigating away.
 */
export function useNativeBackHandler(isOpen: boolean, onClose: () => void, customId?: string) {
  useEffect(() => {
    if (!isOpen) return;

    const id = customId || `modal_${Math.random().toString(36).substring(2, 9)}`;
    const unregister = registerBackHandler(id, () => {
      onClose();
      return true;
    });

    return () => {
      unregister();
    };
  }, [isOpen, onClose, customId]);
}

/**
 * Initializes native mobile navigation (popstate trap & tab back stack).
 */
export function initNativeNavigation(initialTab: string, navigateCallback: (tab: any) => void) {
  if (isInitialized || typeof window === 'undefined') return () => {};

  isInitialized = true;
  currentTab = initialTab;
  tabHistory = [initialTab];
  onTabNavigate = navigateCallback;

  // Prime browser history so pressing "Back" emits popstate instead of exiting the PWA
  try {
    window.history.replaceState({ bodegueroRoot: true }, '');
    window.history.pushState({ bodegueroApp: true, tab: initialTab }, '');
  } catch (err) {
    console.error('History pushState not supported:', err);
  }

  const handlePopState = (_e: PopStateEvent) => {
    // 1. If any modal or popup is currently active, close the topmost one
    if (activeModalHandlers.length > 0) {
      const top = activeModalHandlers.pop();
      if (top) {
        try {
          top.handler();
        } catch (err) {
          console.error('Error closing modal on native back:', err);
        }
      }
      // Re-prime the history state so the user remains safely in the app
      window.history.pushState({ bodegueroApp: true }, '');
      return;
    }

    // 2. If no modal is open, but the user has previous modules in history
    if (tabHistory.length > 1) {
      tabHistory.pop(); // Remove the current tab
      const previousTab = tabHistory[tabHistory.length - 1];
      currentTab = previousTab;
      if (onTabNavigate) {
        onTabNavigate(previousTab);
      }
      // Re-prime history with the previous tab
      window.history.pushState({ bodegueroApp: true, tab: previousTab }, '');
      return;
    }

    // 3. Root module with no modals open: Native "Double-tap to exit" pattern
    const now = Date.now();
    if (now - lastBackPressTime < 2200) {
      // User tapped "Back" twice within 2.2 seconds: allow exit
      window.history.back();
    } else {
      lastBackPressTime = now;
      // Re-prime to prevent exiting on this first tap
      window.history.pushState({ bodegueroApp: true, rootTrap: true }, '');
      // Dispatch custom event to notify UI to show exit warning toast
      window.dispatchEvent(new CustomEvent('bodeguero_native_back_prompt'));
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (activeModalHandlers.length > 0) {
        const top = activeModalHandlers.pop();
        if (top) {
          top.handler();
        }
      }
    }
  };

  window.addEventListener('popstate', handlePopState);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('keydown', handleKeyDown);
    isInitialized = false;
  };
}

/**
 * Record a tab navigation when user explicitly taps a tab in the UI.
 */
export function recordTabNavigation(newTab: string) {
  if (!newTab || currentTab === newTab) return;
  currentTab = newTab;

  // If the newTab is already the previous tab, we avoid infinite stacking
  if (tabHistory.length > 1 && tabHistory[tabHistory.length - 2] === newTab) {
    tabHistory.pop();
  } else {
    tabHistory.push(newTab);
    // Keep max 25 history entries
    if (tabHistory.length > 25) {
      tabHistory.shift();
    }
  }
}

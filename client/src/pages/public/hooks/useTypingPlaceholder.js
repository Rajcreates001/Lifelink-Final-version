import { useEffect, useState } from 'react';

const DEFAULT_PLACEHOLDERS = [
  'Search hospitals...',
  'Find blood donors...',
  'Emergency records...',
  'Nearby ICU...',
  'AI health suggestions...',
];

/**
 * useTypingPlaceholder — Cycles through placeholder texts with a typing animation.
 *
 * @param {string[]} placeholders - Array of placeholder strings to cycle through
 * @returns {{ placeholderText: string }}
 */
export function useTypingPlaceholder(placeholders = DEFAULT_PLACEHOLDERS) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState('');
  const [isTypingPlaceholder, setIsTypingPlaceholder] = useState(true);

  useEffect(() => {
    const currentPhrase = placeholders[placeholderIndex];
    if (!currentPhrase) return;

    if (isTypingPlaceholder) {
      if (placeholderText.length < currentPhrase.length) {
        const t = setTimeout(() => setPlaceholderText(currentPhrase.slice(0, placeholderText.length + 1)), 60);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setIsTypingPlaceholder(false), 2000);
        return () => clearTimeout(t);
      }
    } else {
      if (placeholderText.length > 0) {
        const t = setTimeout(() => setPlaceholderText(placeholderText.slice(0, -1)), 30);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
          setIsTypingPlaceholder(true);
        }, 500);
        return () => clearTimeout(t);
      }
    }
  }, [placeholderText, placeholderIndex, isTypingPlaceholder, placeholders]);

  return { placeholderText };
}

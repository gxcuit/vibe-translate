// Deep Translate Content Script

/**
 * Common abbreviations that should not be treated as sentence endings.
 * These are followed by a period but don't end a sentence.
 */
const ABBREVIATIONS = [
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
  'vs', 'etc', 'viz', 'al', 'eg', 'ie', 'cf',
  'approx', 'appt', 'apt', 'dept', 'est', 'min', 'max',
  'misc', 'no', 'nos', 'vol', 'vols', 'rev', 'pp', 'pg',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  'Inc', 'Corp', 'Ltd', 'Co', 'Ave', 'Blvd', 'St', 'Rd',
  'U', 'S', 'A', 'E', 'G', 'I'  // For U.S., U.K., e.g., i.e., etc.
];

/**
 * Splits text into sentences using intelligent boundary detection.
 * Handles abbreviations, decimal numbers, and ellipses.
 * 
 * @param {string} text - The text to split into sentences
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  if (!text) {
    return [];
  }

  // Create abbreviation pattern
  const abbrPattern = ABBREVIATIONS.join('|');

  // Regex to match sentence boundaries:
  // - Matches . ? ! followed by whitespace and an uppercase letter
  // - Uses negative lookbehind to avoid splitting after abbreviations
  // - Handles ellipsis (...) by not splitting on them

  const sentences = [];
  let currentSentence = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    currentSentence += char;

    // Check if this could be a sentence ending
    if (char === '.' || char === '?' || char === '!') {
      // Look ahead: is there whitespace followed by an uppercase letter?
      const remaining = text.slice(i + 1);
      const lookAhead = remaining.match(/^\s+([A-Z])/);

      if (lookAhead) {
        // Check if this period is part of an abbreviation
        const beforePeriod = currentSentence.slice(0, -1);
        const lastWord = beforePeriod.split(/\s+/).pop() || '';

        // Check for ellipsis
        const isEllipsis = text.slice(i - 2, i + 1) === '...';

        // Check for decimal number (e.g., 3.14)
        const isDecimal = /\d$/.test(beforePeriod) && /^\d/.test(remaining.trim());

        // Check for abbreviation
        const isAbbreviation = ABBREVIATIONS.some(abbr =>
          lastWord.toLowerCase() === abbr.toLowerCase() ||
          lastWord.toUpperCase() === abbr.toUpperCase()
        );

        // Check for single letter abbreviation like "U.S." or "e.g."
        const isSingleLetterAbbr = lastWord.length === 1 && /[A-Za-z]/.test(lastWord);

        if (!isEllipsis && !isDecimal && !isAbbreviation && !isSingleLetterAbbr && char !== '.') {
          // This is a real sentence boundary (for ? and !)
          sentences.push(currentSentence.trim());
          currentSentence = '';
          // Skip the whitespace
          i++;
          while (i < text.length && /\s/.test(text[i])) {
            i++;
          }
          continue;
        } else if (!isEllipsis && !isDecimal && !isAbbreviation && !isSingleLetterAbbr) {
          // Period - check more carefully
          // Only split if we have a clear sentence boundary
          sentences.push(currentSentence.trim());
          currentSentence = '';
          // Skip the whitespace
          i++;
          while (i < text.length && /\s/.test(text[i])) {
            i++;
          }
          continue;
        }
      }
    }

    i++;
  }

  // Add remaining text as last sentence
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }

  return sentences.filter(s => s.length > 0);
}

/**
 * Gets the text content around the current selection.
 * Traverses the DOM to find surrounding text.
 * 
 * @returns {string} The surrounding text content
 */
function getSurroundingText() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return '';
  }

  const range = selection.getRangeAt(0);

  // Get the common ancestor container
  let container = range.commonAncestorContainer;

  // If it's a text node, get the parent element
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }

  // Walk up to find a reasonable block-level parent
  // (paragraph, div, article, section, etc.)
  const blockElements = ['P', 'DIV', 'ARTICLE', 'SECTION', 'MAIN', 'LI', 'TD', 'TH', 'BLOCKQUOTE'];
  let blockParent = container;

  while (blockParent && !blockElements.includes(blockParent.tagName)) {
    if (blockParent.parentElement) {
      blockParent = blockParent.parentElement;
    } else {
      break;
    }
  }

  // If we couldn't find a block parent, use the body or the container itself
  if (!blockParent || blockParent.tagName === 'BODY') {
    blockParent = container;
  }

  // Get all text content from the block parent
  return blockParent.textContent || '';
}

/**
 * Finds the context (previous and next sentences) around the selected text.
 * 
 * @param {string} selectedText - The text that was selected
 * @param {string} surroundingText - The surrounding paragraph/block text
 * @returns {Object} Object containing previousSentence, selectedSentence, nextSentence
 */
function findContextSentences(selectedText, surroundingText) {
  const sentences = splitIntoSentences(surroundingText);

  if (sentences.length === 0) {
    return {
      previousSentence: null,
      selectedSentence: selectedText,
      nextSentence: null
    };
  }

  // Find which sentence(s) contain the selected text
  let selectedIndex = -1;
  const normalizedSelection = selectedText.replace(/\s+/g, ' ').trim();

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].includes(normalizedSelection) ||
      normalizedSelection.includes(sentences[i]) ||
      sentences[i].replace(/\s+/g, ' ').includes(normalizedSelection)) {
      selectedIndex = i;
      break;
    }
  }

  // If we couldn't find an exact match, try fuzzy matching
  if (selectedIndex === -1) {
    // Look for partial matches
    const selectionWords = normalizedSelection.split(/\s+/);
    if (selectionWords.length > 0) {
      const firstWord = selectionWords[0];
      const lastWord = selectionWords[selectionWords.length - 1];

      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].includes(firstWord) || sentences[i].includes(lastWord)) {
          selectedIndex = i;
          break;
        }
      }
    }
  }

  return {
    previousSentence: selectedIndex > 0 ? sentences[selectedIndex - 1] : null,
    selectedSentence: selectedIndex >= 0 ? sentences[selectedIndex] : selectedText,
    nextSentence: selectedIndex >= 0 && selectedIndex < sentences.length - 1
      ? sentences[selectedIndex + 1]
      : null
  };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractContext') {
    const selectedText = message.selectionText || window.getSelection()?.toString() || '';
    const surroundingText = getSurroundingText();
    const context = findContextSentences(selectedText, surroundingText);

    // Log to console for debugging
    console.log('='.repeat(60));
    console.log('[Deep Translate] Selection Context');
    console.log('='.repeat(60));
    console.log('Selected Text:', selectedText);
    console.log('-'.repeat(60));
    console.log('Previous Sentence:', context.previousSentence || '(none)');
    console.log('Selected Sentence:', context.selectedSentence);
    console.log('Next Sentence:', context.nextSentence || '(none)');
    console.log('='.repeat(60));

    // Send response back to background script
    sendResponse({
      selectedText,
      previousSentence: context.previousSentence,
      selectedSentence: context.selectedSentence,
      nextSentence: context.nextSentence
    });
  }

  if (message.action === 'showTranslationResult') {
    showTranslationPopup(message);
  }

  // Return true to indicate we'll send response asynchronously
  return true;
});

/**
 * Shows a floating popup with the translation result
 */
function showTranslationPopup(data) {
  // Remove any existing popup
  const existingPopup = document.getElementById('deep-translate-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'deep-translate-popup';
  popup.innerHTML = `
    <style>
      #deep-translate-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 380px;
        max-height: 400px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #f8fafc;
        z-index: 2147483647;
        overflow: hidden;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      #deep-translate-popup .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        background: rgba(59, 130, 246, 0.1);
        border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      }
      
      #deep-translate-popup .popup-title {
        font-size: 14px;
        font-weight: 600;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
      }
      
      #deep-translate-popup .popup-close {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 18px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      #deep-translate-popup .popup-close:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
      
      #deep-translate-popup .popup-content {
        padding: 16px;
        max-height: 320px;
        overflow-y: auto;
      }
      
      #deep-translate-popup .section {
        margin-bottom: 14px;
      }
      
      #deep-translate-popup .section:last-child {
        margin-bottom: 0;
      }
      
      #deep-translate-popup .section-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #64748b;
        margin-bottom: 6px;
      }
      
      #deep-translate-popup .section-text {
        font-size: 14px;
        line-height: 1.6;
        color: #e2e8f0;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        border: 1px solid rgba(148, 163, 184, 0.1);
      }
      
      #deep-translate-popup .translation-text {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.2);
      }
      
      #deep-translate-popup .loading {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 20px;
        color: #94a3b8;
      }
      
      #deep-translate-popup .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(59, 130, 246, 0.3);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      #deep-translate-popup .error {
        padding: 16px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        color: #fca5a5;
        font-size: 13px;
      }
      
      #deep-translate-popup .copy-btn {
        margin-top: 12px;
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      #deep-translate-popup .copy-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
      
      #deep-translate-popup .copy-btn.copied {
        background: #22c55e;
      }
    </style>
    
    <div class="popup-header">
      <span class="popup-title">Vibe Translate</span>
      <button class="popup-close" title="Close">&times;</button>
    </div>
    <div class="popup-content">
      ${getPopupContent(data)}
    </div>
  `;

  document.body.appendChild(popup);

  // Add close button handler
  popup.querySelector('.popup-close').addEventListener('click', () => {
    popup.remove();
  });

  // Add copy button handler if translation exists
  const copyBtn = popup.querySelector('.copy-btn');
  if (copyBtn && data.translation) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(data.translation).then(() => {
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy Translation';
          copyBtn.classList.remove('copied');
        }, 2000);
      });
    });
  }

  // Auto-close on click outside
  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 100);
}

/**
 * Generate popup content based on data state
 */
function getPopupContent(data) {
  if (data.loading) {
    return `
      <div class="loading">
        <div class="spinner"></div>
        <span>Translating...</span>
      </div>
    `;
  }

  if (data.error) {
    return `
      <div class="error">
        <strong>Error:</strong> ${escapeHtml(data.error)}
      </div>
    `;
  }

  return `
    <div class="section">
      <div class="section-label">Original</div>
      <div class="section-text">${escapeHtml(data.originalText || '')}</div>
    </div>
    <div class="section">
      <div class="section-label">Translation</div>
      <div class="section-text translation-text">${escapeHtml(data.translation || '')}</div>
    </div>
    <button class="copy-btn">Copy Translation</button>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('[Deep Translate] Content script loaded');

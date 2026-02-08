// Deep Translate Popup JavaScript

// Default base URLs for each provider
const PROVIDER_DEFAULTS = {
  openai: {
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4'
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.0-flash'
  }
};

// Default prompts
const DEFAULT_SYSTEM_PROMPT = 'You are a professional translator. Translate the following text to English accurately and naturally, preserving the original meaning and tone.';
const DEFAULT_USER_MESSAGE = 'Translate: {{text}}\n\nContext:\nPrevious sentence: {{previousSentence}}\nNext sentence: {{nextSentence}}';

// DOM Elements
const form = document.getElementById('settings-form');
const providerSelect = document.getElementById('provider-type');
const baseUrlInput = document.getElementById('base-url');
const modelInput = document.getElementById('model');
const apiTokenInput = document.getElementById('api-token');
const systemPromptInput = document.getElementById('system-prompt');
const userMessageInput = document.getElementById('user-message');
const toggleVisibilityBtn = document.getElementById('toggle-visibility');
const statusMessage = document.getElementById('status-message');
const submitBtn = document.querySelector('.submit-btn');

// Load saved settings on popup open
document.addEventListener('DOMContentLoaded', loadSettings);

// Handle provider change - auto-fill defaults
providerSelect.addEventListener('change', (e) => {
  const provider = e.target.value;
  const defaults = PROVIDER_DEFAULTS[provider];

  if (defaults) {
    baseUrlInput.value = defaults.baseUrl;
    baseUrlInput.placeholder = defaults.baseUrl;
    modelInput.placeholder = defaults.model;

    // Only update model if it's empty or matches another provider's default
    const otherProvider = provider === 'openai' ? 'gemini' : 'openai';
    if (!modelInput.value || modelInput.value === PROVIDER_DEFAULTS[otherProvider].model) {
      modelInput.value = defaults.model;
    }
  }
});

// Toggle password visibility
toggleVisibilityBtn.addEventListener('click', () => {
  const isPassword = apiTokenInput.type === 'password';
  apiTokenInput.type = isPassword ? 'text' : 'password';
  toggleVisibilityBtn.setAttribute('aria-label', isPassword ? 'Hide token' : 'Show token');
});

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const settings = {
    providerType: providerSelect.value,
    baseUrl: baseUrlInput.value.trim(),
    model: modelInput.value.trim(),
    apiToken: apiTokenInput.value.trim(),
    systemPrompt: systemPromptInput.value.trim() || DEFAULT_SYSTEM_PROMPT,
    userMessage: userMessageInput.value.trim() || DEFAULT_USER_MESSAGE
  };

  // Validate
  if (!validateSettings(settings)) {
    return;
  }

  try {
    await saveSettings(settings);
    showStatus('Settings saved successfully!', 'success');

    // Show success state on button
    submitBtn.classList.add('success');
    setTimeout(() => {
      submitBtn.classList.remove('success');
    }, 2000);

  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
});

// Load settings from Chrome storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'providerType',
      'baseUrl',
      'model',
      'apiToken',
      'systemPrompt',
      'userMessage'
    ]);

    if (result.providerType) {
      providerSelect.value = result.providerType;
    }

    if (result.baseUrl) {
      baseUrlInput.value = result.baseUrl;
    } else {
      // Set default based on provider
      baseUrlInput.value = PROVIDER_DEFAULTS[providerSelect.value].baseUrl;
    }

    if (result.model) {
      modelInput.value = result.model;
    } else {
      modelInput.value = PROVIDER_DEFAULTS[providerSelect.value].model;
    }

    if (result.apiToken) {
      apiTokenInput.value = result.apiToken;
    }

    // Load system prompt
    if (result.systemPrompt) {
      systemPromptInput.value = result.systemPrompt;
    } else {
      systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
    }

    // Load user message template
    if (result.userMessage) {
      userMessageInput.value = result.userMessage;
    } else {
      userMessageInput.value = DEFAULT_USER_MESSAGE;
    }

    // Update placeholder
    baseUrlInput.placeholder = PROVIDER_DEFAULTS[providerSelect.value].baseUrl;
    modelInput.placeholder = PROVIDER_DEFAULTS[providerSelect.value].model;

  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings to Chrome storage
function saveSettings(settings) {
  return chrome.storage.local.set(settings);
}

// Validate settings
function validateSettings(settings) {
  if (!settings.baseUrl) {
    showStatus('Base URL is required', 'error');
    baseUrlInput.focus();
    return false;
  }

  // Validate URL format
  try {
    new URL(settings.baseUrl);
  } catch {
    showStatus('Please enter a valid URL', 'error');
    baseUrlInput.focus();
    return false;
  }

  if (!settings.model) {
    showStatus('Model name is required', 'error');
    modelInput.focus();
    return false;
  }

  if (!settings.apiToken) {
    showStatus('API Token is required', 'error');
    apiTokenInput.focus();
    return false;
  }

  return true;
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message show ' + type;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

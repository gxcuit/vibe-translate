// Deep Translate Background Service Worker

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    // Create parent menu
    chrome.contextMenus.create({
        id: 'deep-translate',
        title: 'Vibe Translate',
        contexts: ['selection']
    });

    // Create translate submenu
    chrome.contextMenus.create({
        id: 'deep-translate-action',
        parentId: 'deep-translate',
        title: 'Translate',
        contexts: ['selection']
    });

    console.log('[Deep Translate] Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'deep-translate-action' && tab?.id) {
        try {
            // Send message to content script to extract context
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'extractContext',
                selectionText: info.selectionText
            });

            if (response) {
                console.log('[Deep Translate] Context received:', response);

                // Call LLM API for translation
                await translateWithLLM(response, tab.id);
            }
        } catch (error) {
            console.error('[Deep Translate] Error:', error.message);
            // Notify content script of error
            chrome.tabs.sendMessage(tab.id, {
                action: 'showTranslationResult',
                error: error.message
            });
        }
    }
});

/**
 * Call LLM API to translate the text with context
 */
async function translateWithLLM(context, tabId) {
    // Get settings from storage
    const settings = await chrome.storage.local.get([
        'providerType',
        'baseUrl',
        'model',
        'apiToken',
        'systemPrompt',
        'userMessage'
    ]);

    // Validate settings
    if (!settings.apiToken) {
        throw new Error('API token not configured. Please set up in extension settings.');
    }

    // Default prompts
    const defaultSystemPrompt = 'You are a professional translator. Translate the following text to English accurately and naturally, preserving the original meaning and tone.';
    const defaultUserMessage = 'Translate: {{text}}\n\nContext:\nPrevious sentence: {{previousSentence}}\nNext sentence: {{nextSentence}}';

    // Build the user message with placeholders replaced
    const systemPrompt = settings.systemPrompt || defaultSystemPrompt;
    let userMessage = settings.userMessage || defaultUserMessage;

    userMessage = userMessage
        .replace(/\{\{text\}\}/g, context.selectedText || '')
        .replace(/\{\{previousSentence\}\}/g, context.previousSentence || '(none)')
        .replace(/\{\{nextSentence\}\}/g, context.nextSentence || '(none)');

    // Log the LLM input
    console.log('='.repeat(60));
    console.log('[Deep Translate] LLM API Input');
    console.log('='.repeat(60));
    console.log('Provider:', settings.providerType || 'openai');
    console.log('Model:', settings.model);
    console.log('System Prompt:', systemPrompt);
    console.log('User Message:', userMessage);
    console.log('='.repeat(60));

    // Show loading state
    chrome.tabs.sendMessage(tabId, {
        action: 'showTranslationResult',
        loading: true
    });

    let translation;

    if (settings.providerType === 'gemini') {
        translation = await callGeminiAPI(settings, systemPrompt, userMessage);
    } else {
        translation = await callOpenAIAPI(settings, systemPrompt, userMessage);
    }

    // Log the LLM output
    console.log('='.repeat(60));
    console.log('[Deep Translate] LLM API Output');
    console.log('='.repeat(60));
    console.log('Translation:', translation);
    console.log('='.repeat(60));

    // Send translation result to content script
    chrome.tabs.sendMessage(tabId, {
        action: 'showTranslationResult',
        translation: translation,
        originalText: context.selectedText
    });
}

/**
 * Call OpenAI-compatible API
 */
async function callOpenAIAPI(settings, systemPrompt, userMessage) {
    const baseUrl = settings.baseUrl || 'https://api.openai.com';
    const model = settings.model || 'gpt-4';

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiToken}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No translation returned';
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(settings, systemPrompt, userMessage) {
    const baseUrl = settings.baseUrl || 'https://generativelanguage.googleapis.com';
    const model = settings.model || 'gemini-2.0-flash';

    const response = await fetch(
        `${baseUrl}/v1beta/models/${model}:generateContent?key=${settings.apiToken}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [{
                    parts: [{ text: userMessage }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No translation returned';
}

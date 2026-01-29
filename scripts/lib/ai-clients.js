/**
 * AI Client wrappers for the verification cascade
 * Each client queries its respective AI model for feature verification
 */

/**
 * Provider to model mapping for skip rules
 */
const PROVIDER_MODEL_MAP = {
    'Google': 'gemini',
    'Perplexity AI': 'perplexity',
    'xAI': 'grok',
    'Anthropic': 'claude'
};

/**
 * Build the verification prompt for a feature
 * @param {Object} platform - Platform object
 * @param {Object} feature - Feature object
 * @returns {string} The prompt to send to AI models
 */
function buildVerificationPrompt(platform, feature) {
    const planList = platform.pricing.map(p => p.plan).join(', ');

    return `For ${platform.name}'s "${feature.name}" feature, please verify the current:

1. Pricing tier availability:
   - Which subscription plans have access? (Plans for ${platform.name}: ${planList})
   - What are the usage limits per tier (if any)?

2. Platform/surface availability:
   - Is it available on: Windows, macOS, Linux, iOS, Android, web, terminal, API?

3. Current status:
   - Is it GA (generally available), Beta, Preview, or Deprecated?

4. Access gating:
   - Is it free, paid-only, invite-only, or org-only?

5. Recent changes:
   - Any announcements or changes in the last 30 days?

Please provide specific, factual information and cite official sources where possible.
Respond in a structured format.`;
}

/**
 * Build X/Twitter-specific prompt for Grok
 * @param {Object} platform - Platform object
 * @param {Object} feature - Feature object
 * @returns {string} The prompt for Grok X/Twitter search
 */
function buildGrokPrompt(platform, feature) {
    // Map platform names to their official X/Twitter accounts
    const twitterAccounts = {
        'ChatGPT': '@OpenAI',
        'Claude': '@AnthropicAI',
        'Gemini': '@GoogleAI, @Google',
        'Copilot': '@Microsoft, @MicrosoftCopilot',
        'Perplexity': '@peraboratoryai',
        'Grok': '@xaboratoryai, @xAI'
    };

    const accounts = twitterAccounts[platform.name] || `official ${platform.vendor} accounts`;

    return `Search X/Twitter for recent posts from ${accounts} about "${feature.name}" feature.

Look for:
1. Any announcements about pricing changes, new tier availability, or plan restrictions
2. Platform availability updates (desktop apps, mobile apps, web, API)
3. Feature status changes (beta, GA, deprecated)
4. Any changes in the last 30-60 days

Focus on official announcements and verified account posts.
Summarize what you find about current availability and any recent changes.`;
}

/**
 * Gemini Flash client using Google AI Studio API
 */
class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
        this.name = 'gemini';
        this.displayName = 'Gemini Flash';
        this.provider = 'Google';
    }

    async verify(platform, feature) {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const prompt = buildVerificationPrompt(platform, feature);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 2048
                    },
                    // Enable search grounding for web results
                    tools: [{
                        google_search: {}
                    }]
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract grounding sources if available
        const sources = data.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

        return {
            model: this.displayName,
            response: text,
            sources,
            raw: data
        };
    }
}

/**
 * Perplexity client using Sonar API
 */
class PerplexityClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY;
        this.name = 'perplexity';
        this.displayName = 'Perplexity';
        this.provider = 'Perplexity AI';
    }

    async verify(platform, feature) {
        if (!this.apiKey) {
            throw new Error('PERPLEXITY_API_KEY not configured');
        }

        const prompt = buildVerificationPrompt(platform, feature);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a research assistant verifying AI product feature availability. Provide accurate, factual information with citations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        const citations = data.citations || [];

        return {
            model: this.displayName,
            response: text,
            sources: citations,
            raw: data
        };
    }
}

/**
 * Grok client using xAI API (X/Twitter search)
 */
class GrokClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.XAI_API_KEY;
        this.name = 'grok';
        this.displayName = 'Grok (X/Twitter)';
        this.provider = 'xAI';
    }

    async verify(platform, feature) {
        if (!this.apiKey) {
            throw new Error('XAI_API_KEY not configured');
        }

        // Use X/Twitter-specific prompt for Grok
        const prompt = buildGrokPrompt(platform, feature);

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'grok-2',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Grok, searching X/Twitter for recent announcements about AI product features. Focus on official accounts and verified sources. Report what you find factually.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Grok API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        return {
            model: this.displayName,
            response: text,
            sources: [], // Grok doesn't provide structured citations
            raw: data
        };
    }
}

/**
 * Claude client using Anthropic API with web search
 */
class ClaudeClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
        this.name = 'claude';
        this.displayName = 'Claude';
        this.provider = 'Anthropic';
    }

    async verify(platform, feature) {
        if (!this.apiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured');
        }

        const prompt = buildVerificationPrompt(platform, feature);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                tools: [{
                    type: 'web_search',
                    name: 'web_search'
                }],
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        // Extract text from content blocks
        let text = '';
        const sources = [];

        for (const block of data.content || []) {
            if (block.type === 'text') {
                text += block.text;
            }
            if (block.type === 'tool_result' && block.citations) {
                sources.push(...block.citations);
            }
        }

        return {
            model: this.displayName,
            response: text,
            sources,
            raw: data
        };
    }
}

/**
 * Get all available AI clients
 * @returns {Array<Object>} Array of client instances
 */
function getAllClients() {
    return [
        new GeminiClient(),
        new PerplexityClient(),
        new GrokClient(),
        new ClaudeClient()
    ];
}

/**
 * Get clients for cascade, excluding same-provider
 * @param {string} vendorName - The vendor name to skip
 * @returns {Array<Object>} Filtered array of client instances
 */
function getCascadeClients(vendorName) {
    const clients = getAllClients();
    const skipModel = PROVIDER_MODEL_MAP[vendorName];

    if (!skipModel) {
        return clients;
    }

    return clients.filter(client => client.name !== skipModel);
}

module.exports = {
    GeminiClient,
    PerplexityClient,
    GrokClient,
    ClaudeClient,
    getAllClients,
    getCascadeClients,
    buildVerificationPrompt,
    buildGrokPrompt,
    PROVIDER_MODEL_MAP
};

import { registry } from '../ToolRegistry.js';
import { z } from 'zod';

// Zod schema describing expected parameters
const zapierSchema = z.object({
  // The JSON payload to send to Zapier – anything goes
  payload: z.any().optional(),
  // Optional override Zapier Webhook URL; if omitted we fall back to env
  webhookUrl: z.string().url().optional(),
});

function getWebhookUrl(override) {
  return override || process.env.ZAPIER_WEBHOOK_URL || null;
}

registry.register({
  name: 'zapier_trigger_zap',
  description: 'Trigger a Zapier webhook to start an automation (Zap).',
  inputSchema: zapierSchema,
  /**
   * @param {{payload?: any, webhookUrl?: string}} params
   */
  handler: async ({ payload = {}, webhookUrl }, { socket }) => {
    const url = getWebhookUrl(webhookUrl);
    if (!url) {
      // Structured error used by ToolRegistry
      throw { code: -32020, message: 'Zapier webhook URL not configured' };
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw { code: -32021, message: `Zapier responded with ${res.status}`, data: txt };
      }
      return { status: 'triggered', httpStatus: res.status };
    } catch (err) {
      if (err?.code) throw err; // already structured
      throw { code: -32022, message: err.message ?? 'Zapier call failed' };
    }
  },
}); 
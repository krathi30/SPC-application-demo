// The agent loop: ask the model; if it asks for tools, run them and send the
// results back; repeat until it answers in plain text (or we hit the step cap).
const llm = require('./llm');
const { toolSchemas, runTool } = require('./tools');

const MAX_STEPS = parseInt(process.env.AGENT_MAX_STEPS || '5', 10);

const SYSTEM_PROMPT = `You are the SPC assistant for the Klondike Department at Plant #1352, Covington, of The Magnum Ice Cream Company.
You help operators and supervisors understand whether production lines are in statistical control.

Facts about this app:
- Each product has three parameters: slice thickness (mm), slice weight (g), coating weight (g).
- Each parameter has LCL < LWL < target < UWL < UCL. Outside LWL/UWL = warning (amber).
  Outside LCL/UCL = out of control (red) and must be acknowledged by the operator.
- Readings are taken every 30 minutes per freezer.

Rules for you:
- Use the tools for anything about current lines, products, orders or readings. Never guess or invent numbers.
- The tool statistics are exact; quote them, do not recalculate them.
- When a tool reports rule violations, say which rule (R1 out of control, R2 warning cluster, R3 shift, R4 trend),
  what it means physically, and a sensible first check (e.g. calibration, pump setting, mix viscosity).
- You are read-only: you cannot change data. If asked to, explain that a person must do it in the app.
- If something is outside SPC or this plant's data, say so briefly.
- Keep answers short: a direct answer first, then up to 4 bullet points. No tables or headings. All readings, codes and limits are demo data, not real specifications.`;

async function runAgent(history) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
  const trace = [];
  let model = null;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const { message, model: usedModel } = await llm.chat(messages, toolSchemas);
    model = usedModel;
    const calls = message.tool_calls || [];

    if (calls.length === 0) {
      return { answer: (message.content || '').trim() || '(no answer)', tools_used: trace, model };
    }

    messages.push({ role: 'assistant', content: message.content || '', tool_calls: calls });
    for (const call of calls) {
      let args = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      const result = await runTool(call.function.name, args);
      trace.push({ tool: call.function.name, args, ok: !result?.error });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 12000),
      });
    }
  }

  return {
    answer: 'I needed too many steps to answer that. Try a more specific question, e.g. "Is Line 1 in control?"',
    tools_used: trace,
    model,
  };
}

module.exports = { runAgent, SYSTEM_PROMPT };

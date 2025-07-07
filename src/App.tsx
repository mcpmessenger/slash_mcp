import React, { useState } from 'react';
import { Header } from './components/Header';
import { Settings } from './components/Settings';
import { TerminalGrid } from './components/TerminalGrid';
import { MultiClientManager } from './components/MultiClientManager';
import { OpposingTerminals } from './components/OpposingTerminals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Playground } from './components/Playground';
import { Walkthrough } from './components/Walkthrough';
import { Terminal } from './components/Terminal';
import AutoConnect from './components/AutoConnect';
import { PromptBox } from './components/ui/chatgpt-prompt-input';
import { MultiChatManager } from './components/ui/MultiChatManager';
import { useMCP } from './context/MCPContext';

type WorkflowStep = { ai: string; prompt: string };

function App() {
  const { invokeChat, invokeClaude, invokeGemini } = useMCP();
  const [showTerminal, setShowTerminal] = React.useState(false);
  const [showClients, setShowClients] = React.useState(false);
  const [showOpposing, setShowOpposing] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);
  const [sharedMemory, setSharedMemory] = useState<string>('');
  const [workflow, setWorkflow] = useState([
    { ai: 'openai', prompt: 'Generate a project plan for {memory}.' },
    { ai: 'anthropic', prompt: 'Review and improve this plan: {memory}' },
    { ai: 'gemini', prompt: 'Summarize the improved plan: {memory}' },
  ]);
  const [workflowLog, setWorkflowLog] = useState<string[]>([]);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);

  async function runWorkflow() {
    setIsRunningWorkflow(true);
    setWorkflowLog([]);
    let memory = sharedMemory;
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      const prompt = step.prompt.replace('{memory}', memory);
      setWorkflowLog((log) => [...log, `Step ${i + 1} (${step.ai}): ${prompt}`]);
      let response = '';
      try {
        if (step.ai === 'openai') {
          const res = await invokeChat('default', prompt); // replace 'default' with actual connId if needed
          let reply = res?.result?.output;
          if (!reply && res?.result?.toolOutput) {
            const match = res.result.toolOutput.match(/"prompt":"([^"]+)"/);
            reply = match ? match[1] : '(No model reply found)';
          }
          response = reply || JSON.stringify(res);
        } else if (step.ai === 'anthropic') {
          const res = await invokeClaude('default', prompt, { model: 'claude-3-sonnet-20240229' });
          let reply = res?.result?.output;
          if (!reply && res?.result?.toolOutput) {
            const match = res.result.toolOutput.match(/"prompt":"([^"]+)"/);
            reply = match ? match[1] : '(No model reply found)';
          }
          response = reply || JSON.stringify(res);
        } else if (step.ai === 'gemini') {
          const res = await invokeGemini('default', prompt);
          let reply = res?.result?.output;
          if (!reply && res?.result?.toolOutput) {
            const match = res.result.toolOutput.match(/"prompt":"([^"]+)"/);
            reply = match ? match[1] : '(No model reply found)';
          }
          response = reply || JSON.stringify(res);
        }
      } catch (err: any) {
        response = `Error: ${err.message || err}`;
      }
      memory += '\n' + response;
      setSharedMemory(memory);
      setWorkflowLog((log) => [...log, `Response: ${response}`]);
    }
    setIsRunningWorkflow(false);
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-dark-900 transition-colors duration-300">
        <Header />
        <div className="flex h-[calc(100vh-80px)]">
          <Routes>
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<MultiChatManager />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </div>
        {showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}
        {showClients && <MultiClientManager onClose={() => setShowClients(false)} />}
        {showOpposing && <OpposingTerminals onClose={() => setShowOpposing(false)} />}
        <AutoConnect />
        <Walkthrough />
        <WorkflowEditor workflow={workflow} setWorkflow={setWorkflow} />
        <button
          onClick={runWorkflow}
          disabled={isRunningWorkflow}
          style={{
            margin: 8,
            padding: '4px 12px',
            borderRadius: 4,
            background: '#4f4',
            color: '#222',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Run Workflow
        </button>
        <SharedMemoryPane memory={sharedMemory} onChange={setSharedMemory} />
        <div
          style={{
            border: '1px solid #444',
            padding: 8,
            margin: 8,
            background: '#18181b',
            color: '#fff',
            borderRadius: 4,
            minHeight: 60,
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Workflow Log</div>
          {workflowLog.map((line, idx) => (
            <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </BrowserRouter>
  );
}

function SharedMemoryPane({ memory, onChange }: { memory: string; onChange: (v: string) => void }) {
  return (
    <div
      style={{
        border: '1px solid #444',
        padding: 8,
        margin: 8,
        background: '#18181b',
        color: '#fff',
        borderRadius: 4,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Shared Memory</div>
      <textarea
        value={memory}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: 100,
          background: '#222',
          color: '#fff',
          border: '1px solid #333',
          borderRadius: 4,
        }}
      />
    </div>
  );
}

function WorkflowEditor({
  workflow,
  setWorkflow,
}: {
  workflow: WorkflowStep[];
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowStep[]>>;
}) {
  function updateStep(idx: number, field: keyof WorkflowStep, value: string) {
    setWorkflow((wf) => wf.map((step, i) => (i === idx ? { ...step, [field]: value } : step)));
  }
  function addStep() {
    setWorkflow((wf) => [...wf, { ai: 'openai', prompt: '' }]);
  }
  function removeStep(idx: number) {
    setWorkflow((wf) => wf.filter((_, i) => i !== idx));
  }
  return (
    <div
      style={{
        border: '1px solid #444',
        padding: 8,
        margin: 8,
        background: '#222',
        color: '#fff',
        borderRadius: 4,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Workflow Steps</div>
      {workflow.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center mb-8">
          <div className="flex items-center w-full max-w-xl mx-auto bg-[#232323] dark:bg-[#232323] rounded-[28px] p-2 shadow-sm">
            <select
              value={step.ai}
              onChange={(e) => updateStep(idx, 'ai', e.target.value)}
              className="mr-2 rounded-md bg-[#18181b] text-white border border-gray-700 px-2 py-1"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
            <div className="flex-1">
              <PromptBox
                value={step.prompt}
                onChange={(e) => updateStep(idx, 'prompt', e.target.value)}
                placeholder="Prompt template (use {memory})"
                className="bg-transparent border-none shadow-none px-0"
              />
            </div>
            <button
              onClick={() => removeStep(idx)}
              className="ml-2 text-red-400 hover:text-red-600 font-bold text-lg bg-transparent border-none cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addStep}
        style={{
          color: '#4f4',
          background: 'none',
          border: '1px solid #4f4',
          borderRadius: 4,
          padding: '2px 8px',
          cursor: 'pointer',
        }}
      >
        Add Step
      </button>
    </div>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import Form from '@rjsf/core';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MCP_METHODS = [
  'mcp_sendResource',
  'mcp_invokeTool',
  'mcp_setStorageCreds',
  'mcp_getResource',
  'mcp_listResources',
] as const;

export const Playground: React.FC = () => {
  const [method, setMethod] = useState<(typeof MCP_METHODS)[number] | ''>('');
  const [schema, setSchema] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!method) return;
    fetch(`/schemas/${method}.json`)
      .then((res) => res.json())
      .then((json) => setSchema(json))
      .catch(() => setSchema(null));
  }, [method]);

  return (
    <motion.div
      className="flex-1 p-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="px-3 py-2 border rounded-lg dark:bg-dark-800 dark:border-dark-600"
          >
            <option value="">Select MCP method…</option>
            {MCP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button onClick={() => navigate(-1)} className="text-sm text-primary-600 underline">
            Back
          </button>
        </div>

        {schema ? (
          <Form
            schema={schema.schema as any}
            validator={undefined as any}
            onSubmit={({ formData }) =>
              alert(JSON.stringify({ method, params: formData }, null, 2))
            }
          >
            <button type="submit" className="mt-4 px-4 py-2 bg-primary-600 text-white rounded">
              Preview JSON
            </button>
          </Form>
        ) : method ? (
          <p>Loading schema…</p>
        ) : null}
      </div>
    </motion.div>
  );
};

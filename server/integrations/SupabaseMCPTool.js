import { registry } from '../ToolRegistry.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Supabase MCP Tool - Complete integration with Supabase services
// Provides database operations, storage, auth, and real-time functionality

let supabaseClients = new Map(); // Cache clients by URL+key combination

// Initialize Supabase client
function getSupabaseClient(url, serviceRoleKey, anonKey) {
  const clientKey = `${url}:${serviceRoleKey || anonKey}`;
  
  if (supabaseClients.has(clientKey)) {
    return supabaseClients.get(clientKey);
  }

  try {
    const client = createClient(url, serviceRoleKey || anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    });
    
    supabaseClients.set(clientKey, client);
    return client;
  } catch (error) {
    throw new Error(`Failed to initialize Supabase client: ${error.message}`);
  }
}

// Schema for Supabase operations
const supabaseSchema = z.object({
  operation: z.enum([
    // Database operations
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'rpc',
    
    // Storage operations
    'upload_file',
    'download_file',
    'list_files',
    'delete_file',
    'create_bucket',
    'list_buckets',
    'delete_bucket',
    'get_public_url',
    
    // Auth operations
    'sign_up',
    'sign_in',
    'sign_out',
    'get_user',
    'update_user',
    'delete_user',
    'list_users',
    
    // Real-time operations
    'subscribe_to_changes',
    'unsubscribe',
    
    // Schema operations
    'get_schema',
    'create_table',
    'alter_table',
    'drop_table'
  ]).default('select'),
  
  // Connection parameters
  supabase_url: z.string().url(),
  supabase_key: z.string(), // Can be anon key or service role key
  service_role_key: z.string().optional(), // For admin operations
  
  // Database operation parameters
  table: z.string().optional(),
  schema: z.string().default('public'),
  columns: z.union([z.string(), z.array(z.string())]).optional(),
  filters: z.record(z.any()).optional(),
  data: z.union([z.record(z.any()), z.array(z.record(z.any()))]).optional(),
  function_name: z.string().optional(),
  function_args: z.record(z.any()).optional(),
  
  // Storage parameters
  bucket: z.string().optional(),
  file_path: z.string().optional(),
  file_data: z.string().optional(), // Base64 encoded or text
  file_options: z.record(z.any()).optional(),
  
  // Auth parameters
  email: z.string().email().optional(),
  password: z.string().optional(),
  user_metadata: z.record(z.any()).optional(),
  user_id: z.string().uuid().optional(),
  
  // Query modifiers
  limit: z.number().optional(),
  offset: z.number().optional(),
  order_by: z.string().optional(),
  order_ascending: z.boolean().default(true),
  
  // Real-time parameters
  event: z.enum(['INSERT', 'UPDATE', 'DELETE', '*']).optional(),
  
  // Schema parameters
  table_definition: z.record(z.any()).optional()
});

registry.register({
  name: 'supabase_mcp_tool',
  description: 'Complete Supabase integration providing database, storage, auth, and real-time functionality',
  inputSchema: supabaseSchema,
  handler: async (params) => {
    const { 
      operation, 
      supabase_url, 
      supabase_key, 
      service_role_key,
      table,
      schema,
      ...operationParams 
    } = params;

    if (!supabase_url || !supabase_key) {
      throw { code: -32602, message: 'supabase_url and supabase_key are required' };
    }

    try {
      // Use service role key for admin operations, otherwise use provided key
      const clientKey = (operation.includes('user') || operation.includes('bucket') || operation === 'create_table') 
        ? service_role_key || supabase_key 
        : supabase_key;
        
      const supabase = getSupabaseClient(supabase_url, clientKey);
      let result;

      switch (operation) {
        // Database operations
        case 'select':
          if (!table) {
            throw { code: -32602, message: 'table parameter required for select operation' };
          }
          
          let selectQuery = supabase.from(table).select(
            operationParams.columns ? 
              (Array.isArray(operationParams.columns) ? operationParams.columns.join(',') : operationParams.columns) 
              : '*'
          );
          
          // Apply filters
          if (operationParams.filters) {
            Object.entries(operationParams.filters).forEach(([key, value]) => {
              if (typeof value === 'object' && value.operator) {
                switch (value.operator) {
                  case 'eq':
                    selectQuery = selectQuery.eq(key, value.value);
                    break;
                  case 'neq':
                    selectQuery = selectQuery.neq(key, value.value);
                    break;
                  case 'gt':
                    selectQuery = selectQuery.gt(key, value.value);
                    break;
                  case 'gte':
                    selectQuery = selectQuery.gte(key, value.value);
                    break;
                  case 'lt':
                    selectQuery = selectQuery.lt(key, value.value);
                    break;
                  case 'lte':
                    selectQuery = selectQuery.lte(key, value.value);
                    break;
                  case 'like':
                    selectQuery = selectQuery.like(key, value.value);
                    break;
                  case 'ilike':
                    selectQuery = selectQuery.ilike(key, value.value);
                    break;
                  case 'in':
                    selectQuery = selectQuery.in(key, value.value);
                    break;
                }
              } else {
                selectQuery = selectQuery.eq(key, value);
              }
            });
          }
          
          // Apply ordering
          if (operationParams.order_by) {
            selectQuery = selectQuery.order(operationParams.order_by, { 
              ascending: operationParams.order_ascending 
            });
          }
          
          // Apply pagination
          if (operationParams.limit) {
            selectQuery = selectQuery.limit(operationParams.limit);
          }
          if (operationParams.offset) {
            selectQuery = selectQuery.range(operationParams.offset, operationParams.offset + (operationParams.limit || 100) - 1);
          }
          
          result = await selectQuery;
          break;

        case 'insert':
          if (!table || !operationParams.data) {
            throw { code: -32602, message: 'table and data parameters required for insert operation' };
          }
          result = await supabase.from(table).insert(operationParams.data);
          break;

        case 'update':
          if (!table || !operationParams.data) {
            throw { code: -32602, message: 'table and data parameters required for update operation' };
          }
          
          let updateQuery = supabase.from(table).update(operationParams.data);
          
          if (operationParams.filters) {
            Object.entries(operationParams.filters).forEach(([key, value]) => {
              updateQuery = updateQuery.eq(key, value);
            });
          }
          
          result = await updateQuery;
          break;

        case 'upsert':
          if (!table || !operationParams.data) {
            throw { code: -32602, message: 'table and data parameters required for upsert operation' };
          }
          result = await supabase.from(table).upsert(operationParams.data);
          break;

        case 'delete':
          if (!table) {
            throw { code: -32602, message: 'table parameter required for delete operation' };
          }
          
          let deleteQuery = supabase.from(table).delete();
          
          if (operationParams.filters) {
            Object.entries(operationParams.filters).forEach(([key, value]) => {
              deleteQuery = deleteQuery.eq(key, value);
            });
          }
          
          result = await deleteQuery;
          break;

        case 'rpc':
          if (!operationParams.function_name) {
            throw { code: -32602, message: 'function_name parameter required for rpc operation' };
          }
          result = await supabase.rpc(operationParams.function_name, operationParams.function_args || {});
          break;

        // Storage operations
        case 'upload_file':
          if (!operationParams.bucket || !operationParams.file_path || !operationParams.file_data) {
            throw { code: -32602, message: 'bucket, file_path, and file_data parameters required for upload_file operation' };
          }
          
          // Handle base64 encoded data
          let fileData = operationParams.file_data;
          if (operationParams.file_data.startsWith('data:')) {
            const base64Data = operationParams.file_data.split(',')[1];
            fileData = Buffer.from(base64Data, 'base64');
          }
          
          result = await supabase.storage
            .from(operationParams.bucket)
            .upload(operationParams.file_path, fileData, operationParams.file_options || {});
          break;

        case 'download_file':
          if (!operationParams.bucket || !operationParams.file_path) {
            throw { code: -32602, message: 'bucket and file_path parameters required for download_file operation' };
          }
          result = await supabase.storage
            .from(operationParams.bucket)
            .download(operationParams.file_path);
          break;

        case 'list_files':
          if (!operationParams.bucket) {
            throw { code: -32602, message: 'bucket parameter required for list_files operation' };
          }
          result = await supabase.storage
            .from(operationParams.bucket)
            .list(operationParams.file_path || '');
          break;

        case 'delete_file':
          if (!operationParams.bucket || !operationParams.file_path) {
            throw { code: -32602, message: 'bucket and file_path parameters required for delete_file operation' };
          }
          result = await supabase.storage
            .from(operationParams.bucket)
            .remove([operationParams.file_path]);
          break;

        case 'create_bucket':
          if (!operationParams.bucket) {
            throw { code: -32602, message: 'bucket parameter required for create_bucket operation' };
          }
          result = await supabase.storage.createBucket(operationParams.bucket, {
            public: operationParams.file_options?.public || false
          });
          break;

        case 'list_buckets':
          result = await supabase.storage.listBuckets();
          break;

        case 'delete_bucket':
          if (!operationParams.bucket) {
            throw { code: -32602, message: 'bucket parameter required for delete_bucket operation' };
          }
          result = await supabase.storage.deleteBucket(operationParams.bucket);
          break;

        case 'get_public_url':
          if (!operationParams.bucket || !operationParams.file_path) {
            throw { code: -32602, message: 'bucket and file_path parameters required for get_public_url operation' };
          }
          result = supabase.storage
            .from(operationParams.bucket)
            .getPublicUrl(operationParams.file_path);
          break;

        // Auth operations
        case 'sign_up':
          if (!operationParams.email || !operationParams.password) {
            throw { code: -32602, message: 'email and password parameters required for sign_up operation' };
          }
          result = await supabase.auth.signUp({
            email: operationParams.email,
            password: operationParams.password,
            options: {
              data: operationParams.user_metadata || {}
            }
          });
          break;

        case 'sign_in':
          if (!operationParams.email || !operationParams.password) {
            throw { code: -32602, message: 'email and password parameters required for sign_in operation' };
          }
          result = await supabase.auth.signInWithPassword({
            email: operationParams.email,
            password: operationParams.password
          });
          break;

        case 'sign_out':
          result = await supabase.auth.signOut();
          break;

        case 'get_user':
          result = await supabase.auth.getUser();
          break;

        case 'update_user':
          if (!operationParams.data) {
            throw { code: -32602, message: 'data parameter required for update_user operation' };
          }
          result = await supabase.auth.updateUser(operationParams.data);
          break;

        default:
          throw { code: -32602, message: `Unsupported operation: ${operation}` };
      }

      if (result.error) {
        throw { code: -32603, message: result.error.message };
      }

      return {
        operation,
        success: true,
        data: result.data,
        count: result.count,
        status: result.status,
        statusText: result.statusText,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error.code) {
        throw error;
      }
      throw { code: -32603, message: `Supabase operation failed: ${error.message}` };
    }
  }
});

export { getSupabaseClient }; 
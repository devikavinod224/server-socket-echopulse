const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing in .env. API features will be limited.');
}

// Custom fetch polyfill using Axios to bypass Node 18+ fetch instability
const customFetch = async (url, options) => {
  try {
    const headers = {};
    if (options.headers) {
      if (typeof options.headers.forEach === 'function') {
        options.headers.forEach((value, key) => { headers[key] = value; });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const response = await axios({
      url: url.toString(),
      method: options.method || 'GET',
      headers: headers,
      data: options.body,
      responseType: 'json',
      validateStatus: () => true, // Don't throw on error codes
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: async () => response.data,
      text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      headers: {
        get: (name) => response.headers[name.toLowerCase()],
      },
    };
  } catch (error) {
    console.error('Custom fetch error:', error.message);
    throw error;
  }
};

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  global: { fetch: customFetch }
});

module.exports = supabase;

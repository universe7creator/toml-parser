const TOML = require('@iarna/toml');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { toml, action = 'parse' } = req.body;

    if (!toml || typeof toml !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid TOML input',
        message: 'Please provide a valid TOML string in the request body'
      });
    }

    if (action === 'parse') {
      try {
        const parsed = TOML.parse(toml);
        const json = JSON.stringify(parsed, null, 2);

        // Calculate stats
        const lines = toml.split('\n').length;
        const keys = countKeys(parsed);

        return res.status(200).json({
          success: true,
          data: parsed,
          json: json,
          stats: {
            lines: lines,
            keys: keys,
            size: toml.length
          }
        });
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'TOML Parse Error',
          message: parseError.message,
          line: parseError.line || null,
          column: parseError.column || null
        });
      }
    }

    if (action === 'validate') {
      try {
        TOML.parse(toml);
        return res.status(200).json({
          success: true,
          valid: true,
          message: 'TOML is valid'
        });
      } catch (parseError) {
        return res.status(200).json({
          success: true,
          valid: false,
          error: parseError.message,
          line: parseError.line || null,
          column: parseError.column || null
        });
      }
    }

    if (action === 'to-json') {
      try {
        const parsed = TOML.parse(toml);
        return res.status(200).json({
          success: true,
          json: JSON.stringify(parsed, null, 2)
        });
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Conversion failed',
          message: parseError.message
        });
      }
    }

    return res.status(400).json({
      error: 'Invalid action',
      message: 'Supported actions: parse, validate, to-json'
    });

  } catch (error) {
    console.error('Process error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

function countKeys(obj, prefix = '') {
  let count = 0;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        count += countKeys(value, prefix + key + '.');
      } else {
        count++;
      }
    }
  }
  return count;
}

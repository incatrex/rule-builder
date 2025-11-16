import React, { useState, useEffect } from 'react';
import { RuleService, ConfigService, FieldService } from '../services/index.js';

/**
 * Example component showing how to use the new services
 * This replaces direct API calls with service methods
 */
const ServiceExampleComponent = () => {
  const [rules, setRules] = useState([]);
  const [config, setConfig] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize services - can be dependency injected or configured
  const ruleService = new RuleService();
  const configService = new ConfigService();
  const fieldService = new FieldService();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load all required data in parallel
      const [rulesResponse, configResponse, fieldsResponse] = await Promise.all([
        ruleService.getRules({ page: 1, size: 10 }),
        configService.getConfig(),
        fieldService.getFields({ page: 1, size: 50 })
      ]);

      setRules(rulesResponse.content || rulesResponse);
      setConfig(configResponse);
      setFields(fieldsResponse.content || fieldsResponse);
    } catch (err) {
      setError('Failed to load initial data: ' + err.message);
      console.error('Service error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewRule = async () => {
    try {
      setLoading(true);
      
      const newRule = {
        name: 'New Rule ' + Date.now(),
        type: 'CONDITION',
        returnType: 'BOOLEAN',
        conditions: []
      };

      // Server will generate UUID automatically
      const result = await ruleService.createRule(newRule);
      
      
      // Add the new rule to the list
      setRules(prev => [result.rule, ...prev]);
      
    } catch (err) {
      setError('Failed to create rule: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRule = async (uuid, updates) => {
    try {
      setLoading(true);
      
      // Server will create new version automatically
      const result = await ruleService.updateRule(uuid, updates);
      
      
      // Update the rule in the list
      setRules(prev => 
        prev.map(rule => 
          rule.uuId === uuid ? result.rule : rule
        )
      );
      
    } catch (err) {
      setError('Failed to update rule: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchRules = async (searchTerm) => {
    try {
      setLoading(true);
      
      const searchResults = await ruleService.getRules({
        page: 1,
        size: 20,
        search: searchTerm
      });
      
      setRules(searchResults.content || searchResults);
      
    } catch (err) {
      setError('Failed to search rules: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const convertRuleToSql = async (uuid) => {
    try {
      const sqlResult = await ruleService.convertToSql(uuid);
      
      // Display SQL result (could open modal, navigate to SQL viewer, etc.)
      alert(`SQL: ${sqlResult.sql}`);
      
    } catch (err) {
      setError('Failed to convert to SQL: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="service-example">
      <h2>Rule Builder with Services</h2>
      
      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="actions">
        <button onClick={createNewRule}>Create New Rule</button>
        <input 
          type="text" 
          placeholder="Search rules..." 
          onChange={(e) => searchRules(e.target.value)}
        />
      </div>

      <div className="rules-list">
        <h3>Rules ({rules.length})</h3>
        {rules.map(rule => (
          <div key={rule.uuId || rule.ruleId} className="rule-item">
            <h4>{rule.name}</h4>
            <p>Type: {rule.type} | Return: {rule.returnType}</p>
            <p>UUID: {rule.uuId} | Version: {rule.version}</p>
            <div className="rule-actions">
              <button 
                onClick={() => updateRule(rule.uuId, { 
                  ...rule, 
                  name: rule.name + ' (Updated)' 
                })}
              >
                Update
              </button>
              <button onClick={() => convertRuleToSql(rule.uuId)}>
                Convert to SQL
              </button>
            </div>
          </div>
        ))}
      </div>

      {config && (
        <div className="config-info">
          <h3>Configuration</h3>
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      )}

      <div className="fields-info">
        <h3>Available Fields ({fields.length})</h3>
        <div className="fields-grid">
          {fields.slice(0, 10).map(field => (
            <div key={field.id || field.name} className="field-item">
              <strong>{field.name}</strong>
              <br />
              <small>{field.type}</small>
            </div>
          ))}
          {fields.length > 10 && (
            <div>... and {fields.length - 10} more</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .service-example {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c66;
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
          position: relative;
        }

        .error button {
          position: absolute;
          top: 5px;
          right: 10px;
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
        }

        .actions {
          margin: 20px 0;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .actions input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-width: 250px;
        }

        .rule-item {
          border: 1px solid #ddd;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
          background: #f9f9f9;
        }

        .rule-actions {
          margin-top: 10px;
          display: flex;
          gap: 10px;
        }

        .rule-actions button {
          padding: 5px 10px;
          border: 1px solid #007cba;
          background: #007cba;
          color: white;
          border-radius: 3px;
          cursor: pointer;
        }

        .rule-actions button:hover {
          background: #005a9a;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .field-item {
          padding: 10px;
          border: 1px solid #eee;
          border-radius: 4px;
          background: white;
        }

        .config-info pre {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          max-height: 200px;
          overflow-y: auto;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default ServiceExampleComponent;
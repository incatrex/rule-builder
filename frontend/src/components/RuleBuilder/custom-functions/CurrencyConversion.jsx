import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Button, Space, Typography } from 'antd';
import { SwapRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Currency conversion custom function component
 * 
 * @param {object} initialData - Pre-populated form values
 * @param {function} onSave - Callback to save form data
 * @param {function} onCancel - Callback to cancel
 */
const CurrencyConversion = ({ initialData, onSave, onCancel }) => {
  const [form] = Form.useForm();
  
  console.log('[CurrencyConversion] Received initialData:', initialData);
  
  // Default values
  const defaults = {
    fromCurrency: 'USD',
    toCurrency: 'EUR',
    rate: 1.17
  };
  
  // Initialize form with defaults or initialData
  useEffect(() => {
    // Check if initialData has any meaningful (non-empty, non-zero) values
    const hasMeaningfulData = initialData && Object.entries(initialData).some(([key, value]) => {
      // Skip 'amount' field from this check since 0 is valid for amount
      if (key === 'amount') return false;
      // Check if value is meaningful (not empty string, not 0, not null/undefined)
      return value !== '' && value !== 0 && value != null;
    });
    
    // Use defaults for fields that are empty, but keep non-empty values from initialData
    const formValues = hasMeaningfulData 
      ? { ...defaults, ...initialData }
      : defaults;
    
    console.log('[CurrencyConversion] Setting form values:', formValues);
    form.setFieldsValue(formValues);
  }, [initialData, form]);
  
  const handleSubmit = (values) => {
    // Return simple object - wrapper handles conversion to function args
    onSave(values);
  };
  
  return (
    <Form 
      form={form} 
      onFinish={handleSubmit}
      layout="vertical"
      initialValues={defaults}
      data-testid="currency-conversion-form"
    >
      <Form.Item 
        name="amount" 
        label="Amount to Convert" 
        rules={[
          { required: true, message: 'Amount is required' },
          { type: 'number', min: 0, message: 'Amount must be positive' }
        ]}
      >
        <InputNumber 
          style={{ width: '100%' }} 
          min={0}
          precision={2}
          placeholder="Enter amount"
          data-testid="amount-input"
        />
      </Form.Item>
      
      <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Form.Item 
          name="fromCurrency" 
          label="From Currency" 
          rules={[{ required: true, message: 'Source currency is required' }]}
          style={{ marginBottom: 0 }}
        >
          <Select 
            style={{ width: 140 }}
            placeholder="Select"
            data-testid="from-currency-select"
          >
            <Select.Option value="USD">USD ($)</Select.Option>
            <Select.Option value="EUR">EUR (€)</Select.Option>
            <Select.Option value="GBP">GBP (£)</Select.Option>
            <Select.Option value="JPY">JPY (¥)</Select.Option>
            <Select.Option value="CHF">CHF</Select.Option>
            <Select.Option value="CAD">CAD</Select.Option>
            <Select.Option value="AUD">AUD</Select.Option>
            <Select.Option value="CNY">CNY (¥)</Select.Option>
          </Select>
        </Form.Item>
        
        <SwapRightOutlined style={{ fontSize: 24, color: '#1890ff', marginTop: 30 }} />
        
        <Form.Item 
          name="toCurrency" 
          label="To Currency" 
          rules={[{ required: true, message: 'Target currency is required' }]}
          style={{ marginBottom: 0 }}
        >
          <Select 
            style={{ width: 140 }}
            placeholder="Select"
            data-testid="to-currency-select"
          >
            <Select.Option value="USD">USD ($)</Select.Option>
            <Select.Option value="EUR">EUR (€)</Select.Option>
            <Select.Option value="GBP">GBP (£)</Select.Option>
            <Select.Option value="JPY">JPY (¥)</Select.Option>
            <Select.Option value="CHF">CHF</Select.Option>
            <Select.Option value="CAD">CAD</Select.Option>
            <Select.Option value="AUD">AUD</Select.Option>
            <Select.Option value="CNY">CNY (¥)</Select.Option>
          </Select>
        </Form.Item>
      </Space>
      
      <Form.Item 
        name="rate" 
        label="Exchange Rate" 
        rules={[
          { required: true, message: 'Exchange rate is required' },
          { type: 'number', min: 0.0001, message: 'Rate must be greater than 0' }
        ]}
        tooltip="How many units of 'To Currency' per 1 unit of 'From Currency'"
      >
        <InputNumber 
          step={0.0001} 
          style={{ width: '100%' }}
          min={0.0001}
          precision={4}
          placeholder="e.g., 1.2034"
          data-testid="rate-input"
        />
      </Form.Item>
      
      <Space>
        <Button 
          type="primary" 
          htmlType="submit"
          data-testid="save-button"
        >
          Save Conversion
        </Button>
        <Button 
          onClick={onCancel}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
      </Space>
    </Form>
  );
};

export default CurrencyConversion;

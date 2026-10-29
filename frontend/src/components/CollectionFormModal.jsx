import { useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Select } from 'antd';

import { getErrorMessage } from '../api/client';
import { STATUS_OPTIONS } from '../labels';

/**
 * Форма записи коллекции: платформа, статус, затраченные часы и заметки.
 * Используется для добавления игры, переноса из списка желаемого и редактирования прогресса.
 */
export default function CollectionFormModal({ open, title, game, initialValues, okText = 'Сохранить', onSubmit, onClose }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const platformOptions = (game?.platforms ?? []).map((p) => ({ value: p.id, label: p.name }));

  const handleFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...values, hours_played: values.hours_played ?? 0, notes: values.notes || null });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Отмена"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={handleFinish}
        initialValues={{
          platform_id: platformOptions.length === 1 ? platformOptions[0].value : undefined,
          status: 'not_started',
          hours_played: 0,
          ...initialValues,
        }}
      >
        <Form.Item label="Игра">
          <Input value={game?.title} disabled />
        </Form.Item>
        <Form.Item name="platform_id" label="Платформа" rules={[{ required: true, message: 'Выберите платформу' }]}>
          <Select options={platformOptions} placeholder="Выберите платформу" />
        </Form.Item>
        <Form.Item name="status" label="Статус" rules={[{ required: true, message: 'Выберите статус' }]}>
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="hours_played"
          label="Затрачено часов"
          rules={[{ type: 'number', min: 0, max: 100000, message: 'Укажите число от 0 до 100 000' }]}
        >
          <InputNumber min={0} max={100000} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="notes" label="Заметки" rules={[{ max: 2000, message: 'Не более 2000 символов' }]}>
          <Input.TextArea rows={3} placeholder="Например: остановился на третьей главе" />
        </Form.Item>
        {error && <Alert type="error" showIcon message={error} />}
      </Form>
    </Modal>
  );
}

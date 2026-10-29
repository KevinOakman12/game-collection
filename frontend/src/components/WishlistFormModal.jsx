import { useState } from 'react';
import { Alert, Form, Input, Modal, Radio, Select } from 'antd';

import { getErrorMessage } from '../api/client';
import { WISH_TYPE_OPTIONS } from '../labels';

/** Форма добавления игры в список желаемого или изменения пометки. */
export default function WishlistFormModal({ open, title, game, initialValues, onSubmit, onClose }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const platformOptions = (game?.platforms ?? []).map((p) => ({ value: p.id, label: p.name }));

  const handleFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...values, platform_id: values.platform_id ?? null, note: values.note || null });
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
      okText="Сохранить"
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
        initialValues={{ wish_type: 'play', ...initialValues }}
      >
        <Form.Item label="Игра">
          <Input value={game?.title} disabled />
        </Form.Item>
        <Form.Item name="wish_type" label="Пометка" rules={[{ required: true, message: 'Выберите пометку' }]}>
          <Radio.Group options={WISH_TYPE_OPTIONS} optionType="button" buttonStyle="solid" />
        </Form.Item>
        <Form.Item name="platform_id" label="Желаемая платформа">
          <Select options={platformOptions} placeholder="Не важно" allowClear />
        </Form.Item>
        <Form.Item name="note" label="Заметка" rules={[{ max: 2000, message: 'Не более 2000 символов' }]}>
          <Input.TextArea rows={2} placeholder="Например: дождаться скидки" />
        </Form.Item>
        {error && <Alert type="error" showIcon message={error} />}
      </Form>
    </Modal>
  );
}

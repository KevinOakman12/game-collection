import { useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Select } from 'antd';

import { getErrorMessage } from '../api/client';
import { gamesApi } from '../api/endpoints';
import useCatalog from '../hooks/useCatalog';

const CURRENT_YEAR = new Date().getFullYear();

/** Ручное добавление игры, которой нет в библиотеке, и редактирование такой игры. */
export default function GameFormModal({ open, game, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { platformOptions, genreOptions } = useCatalog();
  const isEdit = Boolean(game);

  const handleFinish = async (values) => {
    setSaving(true);
    setError(null);
    const data = {
      ...values,
      title: values.title.trim(),
      description: values.description || null,
      developer: values.developer || null,
      cover_url: values.cover_url || null,
      genre_id: values.genre_id ?? null,
      release_year: values.release_year ?? null,
    };
    try {
      const saved = isEdit ? await gamesApi.update(game.id, data) : await gamesApi.create(data);
      onSaved(saved);
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
      title={isEdit ? 'Редактирование игры' : 'Добавление игры вручную'}
      okText={isEdit ? 'Сохранить' : 'Добавить'}
      cancelText="Отмена"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnClose
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={handleFinish}
        initialValues={
          game && {
            ...game,
            genre_id: game.genre?.id,
            platform_ids: game.platforms.map((p) => p.id),
          }
        }
      >
        <Form.Item
          name="title"
          label="Название"
          rules={[
            { required: true, whitespace: true, message: 'Введите название' },
            { max: 200, message: 'Не более 200 символов' },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="platform_ids"
          label="Платформы"
          rules={[{ required: true, type: 'array', min: 1, message: 'Выберите хотя бы одну платформу' }]}
        >
          {/* По умолчанию Select ищет по value (id), поэтому явно задаём поиск по названию */}
          <Select mode="multiple" options={platformOptions} optionFilterProp="label" placeholder="Выберите платформы" />
        </Form.Item>
        <Form.Item name="genre_id" label="Жанр">
          <Select options={genreOptions} showSearch optionFilterProp="label" placeholder="Не указан" allowClear />
        </Form.Item>
        <Form.Item name="developer" label="Разработчик" rules={[{ max: 150, message: 'Не более 150 символов' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="release_year"
          label="Год выхода"
          rules={[{ type: 'number', min: 1950, max: CURRENT_YEAR + 5, message: `Год от 1950 до ${CURRENT_YEAR + 5}` }]}
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="cover_url"
          label="Ссылка на обложку"
          rules={[
            { pattern: /^https?:\/\/\S+$/, message: 'Ссылка должна начинаться с http:// или https://' },
            { max: 500, message: 'Не более 500 символов' },
          ]}
        >
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="description" label="Описание" rules={[{ max: 5000, message: 'Не более 5000 символов' }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        {error && <Alert type="error" showIcon message={error} />}
      </Form>
    </Modal>
  );
}

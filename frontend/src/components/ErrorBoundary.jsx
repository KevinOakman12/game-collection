import { Component } from 'react';
import { Button, Result } from 'antd';

/** Перехватывает ошибки отрисовки, чтобы вместо пустой страницы показать сообщение. */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Ошибка интерфейса:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Что-то пошло не так"
          subTitle="Произошла ошибка интерфейса. Обновите страницу."
          extra={<Button type="primary" onClick={() => window.location.reload()}>Обновить</Button>}
        />
      );
    }
    return this.props.children;
  }
}

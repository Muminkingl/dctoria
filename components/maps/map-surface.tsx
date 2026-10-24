import { WebView } from 'react-native-webview';
import type { MapSurfaceProps } from './map-surface.types';

export function MapSurface({ url, title, onLoad, onError }: MapSurfaceProps) {
  return (
    <WebView
      accessibilityLabel={title}
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: '#eef2f3' }}
      onLoad={onLoad}
      onError={onError}
      onHttpError={onError}
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

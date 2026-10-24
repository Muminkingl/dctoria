import type { MapSurfaceProps } from './map-surface.types';

export function MapSurface({ url, title, onLoad, onError }: MapSurfaceProps) {
  return <iframe title={title} src={url} onLoad={onLoad} onError={onError} loading="eager" referrerPolicy="no-referrer-when-downgrade" style={{ border: 0, width: '100%', height: '100%', display: 'block' }} />;
}

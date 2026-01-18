-- Fix MIME types for envato-assets bucket to support MOV, WAV, OGG, M4A, WOFF, WOFF2
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Images
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml',
  -- Videos (including MOV/QuickTime)
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi',
  -- Audio (all formats)
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
  -- 3D Models
  'model/gltf-binary', 'model/gltf+json', 'application/octet-stream',
  -- Fonts
  'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
  'application/font-woff', 'application/font-woff2',
  'application/x-font-ttf', 'application/x-font-otf'
]
WHERE id = 'envato-assets';
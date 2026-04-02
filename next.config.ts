import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  transpilePackages: [
    '@supabase/auth-js',
    '@supabase/functions-js',
    '@supabase/realtime-js',
    '@supabase/ssr',
    '@supabase/storage-js',
    '@supabase/supabase-js',
    '@supabase/postgrest-js',
  ],
};

export default withNextIntl(nextConfig);

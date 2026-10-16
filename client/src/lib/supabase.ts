import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다. Netlify 설정을 확인하세요.');
}

/**
 * Read magic-link errors before the auth client strips the URL.
 * Implicit flow puts tokens in the hash (#access_token=...).
 */
function readAuthRedirectNotice(): string | null {
    if (typeof window === 'undefined') return null;

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const errorCode = hashParams.get('error_code') || queryParams.get('error_code') || '';
    const error = hashParams.get('error') || queryParams.get('error') || '';
    const description = hashParams.get('error_description') || queryParams.get('error_description') || '';

    if (!errorCode && !error && !description) return null;

    const blob = `${errorCode} ${error} ${description}`.toLowerCase();
    if (blob.includes('otp_expired') || blob.includes('expired') || blob.includes('invalid')) {
        return '로그인 링크가 만료되었거나 이미 사용됐어요. 다시 요청해 주세요.';
    }
    return '로그인 링크를 확인하지 못했어요. 다시 요청해 주세요.';
}

export const authRedirectNotice = readAuthRedirectNotice();

// Magic-link redirects land on this origin with hash tokens.
// detectSessionInUrl (true) stores that session on load.
//
// Operator must confirm in Supabase Dashboard → Authentication → URL Configuration
// (this repo cannot change the dashboard):
// Site URL: https://managementmbox.netlify.app
// Redirect URLs:
//   https://managementmbox.netlify.app
//   https://managementmbox.netlify.app/**
//   http://localhost:3000
//   http://localhost:3000/**
//   http://127.0.0.1:3000
//   http://127.0.0.1:3000/**
// Local vite port is 3000 (vite.config.ts). See README.md.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'implicit',
    },
});

// Database types
export interface SalesData {
    id?: string;
    date: string;
    spec: string;
    client: string;
    amount: number;
    transport: number;
    created_at?: string;
    updated_at?: string;
}

export interface InOutData {
    id?: string;
    date: string;
    spec: string;
    client: string;
    type: string;
    created_at?: string;
    updated_at?: string;
}

export interface PurchaseData {
    id?: string;
    date: string;
    spec: string;
    client: string;
    amount: number;
    created_at?: string;
    updated_at?: string;
}

export interface RentalData {
    id?: string;
    spec: string;
    client: string;
    address: string;
    contact: string;
    start_date: string;
    end_date: string;
    days_left: number | null;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export interface UploadMetadata {
    id?: string;
    filename: string;
    upload_date: string;
    sales_count: number;
    inout_count: number;
    purchase_count: number;
    rental_count: number;
    asset_count: number;
    asset_stats?: any[];
    created_at?: string;
}

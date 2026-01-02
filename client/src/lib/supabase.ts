import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다. Netlify 설정을 확인하세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

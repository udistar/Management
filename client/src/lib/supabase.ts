import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gdzzxrrxgshiiavwvqzg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkenp4cnJ4Z3NoaWlhdnd2cXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MzEzNTYsImV4cCI6MjA1MTIwNzM1Nn0.Olow-wvlAy2dcr2C6LtXEw_Tbe8Cwu5SWsK9aKHTbHI';

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
    created_at?: string;
}

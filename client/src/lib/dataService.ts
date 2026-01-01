import { supabase } from './supabase';
import type { SalesData, InOutData, PurchaseData, RentalData, UploadMetadata } from './supabase';

/**
 * Supabase에 모든 데이터를 저장합니다
 */
export async function saveDataToSupabase(data: {
    sales: any[];
    inout: any[];
    purchase: any[];
    rental: any[];
    assetCount: number;
    filename: string;
}) {
    try {
        // 기존 데이터 삭제 (전체 교체 방식)
        await supabase.from('sales_data').delete().not('id', 'is', null);
        await supabase.from('inout_data').delete().not('id', 'is', null);
        await supabase.from('purchase_data').delete().not('id', 'is', null);
        await supabase.from('rental_data').delete().not('id', 'is', null);

        // 1. Sales 데이터 저장
        if (data.sales.length > 0) {
            const salesData: Omit<SalesData, 'id' | 'created_at'>[] = data.sales.map(item => ({
                date: item.date || '',
                spec: item.spec || '',
                client: item.client || '',
                amount: item.amount || 0,
                transport: item.transport || 0,
            }));

            const { error: salesError } = await supabase
                .from('sales_data')
                .insert(salesData);

            if (salesError) throw salesError;
        }

        // 2. InOut 데이터 저장
        if (data.inout.length > 0) {
            const inoutData: Omit<InOutData, 'id' | 'created_at'>[] = data.inout.map(item => ({
                date: item.date || '',
                spec: item.spec || '',
                client: item.client || '',
                type: item.type || '',
            }));

            const { error: inoutError } = await supabase
                .from('inout_data')
                .insert(inoutData);

            if (inoutError) throw inoutError;
        }

        // 3. Purchase 데이터 저장
        if (data.purchase.length > 0) {
            const purchaseData: Omit<PurchaseData, 'id' | 'created_at'>[] = data.purchase.map(item => ({
                date: item.date || '',
                spec: item.spec || '',
                client: item.client || '',
                amount: item.amount || 0,
            }));

            const { error: purchaseError } = await supabase
                .from('purchase_data')
                .insert(purchaseData);

            if (purchaseError) throw purchaseError;
        }

        // 4. Rental 데이터 저장
        if (data.rental.length > 0) {
            const rentalData: Omit<RentalData, 'id' | 'created_at'>[] = data.rental.map(item => ({
                spec: item.spec || '',
                client: item.client || '',
                address: item.address || '',
                contact: item.contact || '',
                start_date: item.start_date || '',
                end_date: item.end_date || '',
                days_left: item.daysLeft ?? null,
                status: item.status || 'active',
            }));

            const { error: rentalError } = await supabase
                .from('rental_data')
                .insert(rentalData);

            if (rentalError) throw rentalError;
        }

        // 5. 업로드 메타데이터 저장
        const metadata: Omit<UploadMetadata, 'id' | 'created_at'> = {
            filename: data.filename,
            upload_date: new Date().toISOString().split('T')[0],
            sales_count: data.sales.length,
            inout_count: data.inout.length,
            purchase_count: data.purchase.length,
            rental_count: data.rental.length,
            asset_count: data.assetCount || 0,
        };

        const { error: metadataError } = await supabase
            .from('upload_metadata')
            .insert(metadata);

        if (metadataError) throw metadataError;

        console.log('✅ 데이터가 Supabase에 성공적으로 저장되었습니다');
        return { success: true };
    } catch (error) {
        console.error('❌ Supabase 저장 오류:', error);
        return { success: false, error };
    }
}

/**
 * Supabase에서 모든 데이터를 불러옵니다
 */
export async function loadDataFromSupabase() {
    try {
        // 1. Sales 데이터 로드
        const { data: salesData, error: salesError } = await supabase
            .from('sales_data')
            .select('*')
            .order('date', { ascending: true });

        if (salesError) throw salesError;

        // 2. InOut 데이터 로드
        const { data: inoutData, error: inoutError } = await supabase
            .from('inout_data')
            .select('*')
            .order('date', { ascending: true });

        if (inoutError) throw inoutError;

        // 3. Purchase 데이터 로드
        const { data: purchaseData, error: purchaseError } = await supabase
            .from('purchase_data')
            .select('*')
            .order('date', { ascending: true });

        if (purchaseError) throw purchaseError;

        // 4. Rental 데이터 로드
        const { data: rentalData, error: rentalError } = await supabase
            .from('rental_data')
            .select('*')
            .order('client', { ascending: true });

        if (rentalError) throw rentalError;

        // 5. 메타데이터 로드 (가장 최근 것)
        const { data: metadataData, error: metadataError } = await supabase
            .from('upload_metadata')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (metadataError) throw metadataError;

        // 데이터 변환 (Supabase 형식 → 앱 형식)
        const sales = (salesData || []).map(item => ({
            date: item.date,
            spec: item.spec,
            client: item.client,
            amount: item.amount,
            transport: item.transport,
        }));

        const inout = (inoutData || []).map(item => ({
            date: item.date,
            spec: item.spec,
            client: item.client,
            type: item.type,
        }));

        const purchase = (purchaseData || []).map(item => ({
            date: item.date,
            spec: item.spec,
            client: item.client,
            amount: item.amount,
        }));

        const rental = (rentalData || []).map(item => ({
            spec: item.spec,
            client: item.client,
            address: item.address,
            contact: item.contact,
            start_date: item.start_date,
            end_date: item.end_date,
            daysLeft: item.days_left,
            status: item.status,
        }));

        const assetCount = metadataData && metadataData.length > 0
            ? metadataData[0].asset_count
            : 0;

        console.log('✅ Supabase에서 데이터를 성공적으로 불러왔습니다');

        return {
            success: true,
            data: {
                sales,
                inout,
                purchase,
                rental,
                assetCount,
            },
        };
    } catch (error) {
        console.error('❌ Supabase 로드 오류:', error);
        return { success: false, error };
    }
}

/**
 * Supabase에 데이터가 있는지 확인합니다
 */
export async function hasDataInSupabase(): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('upload_metadata')
            .select('id')
            .limit(1);

        if (error) throw error;

        return data !== null && data.length > 0;
    } catch (error) {
        console.error('❌ Supabase 확인 오류:', error);
        return false;
    }
}

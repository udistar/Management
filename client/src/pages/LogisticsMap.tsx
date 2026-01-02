import DashboardLayout from "@/components/DashboardLayout";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertCircle, MapPin, Navigation } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
    interface Window {
        naver: any;
    }
}

interface MapLocation {
    lat: number;
    lng: number;
    address: string;
    count: number;
    clients: string[];
    urgency: 'critical' | 'overdue' | 'warning' | 'normal';
    clusterSize?: number;
}

export default function LogisticsMap() {
    const { filteredData } = useFilter();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [locations, setLocations] = useState<MapLocation[]>([]);
    const locationsRef = useRef<MapLocation[]>([]); // Listener에서 접근하기 위한 Ref
    const [clusters, setClusters] = useState<MapLocation[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const contractStats = useMemo(() => {
        const activeRentals = filteredData.rental.filter(r => r.status !== "terminated");
        const totalActive = activeRentals.length;

        const needsManagementCount = activeRentals.filter(r => r.daysLeft !== null && r.daysLeft <= 7).length;
        const safeCount = totalActive - needsManagementCount;

        const data = [
            { name: "관리요망 (7일 이하)", value: needsManagementCount },
            { name: "정상 진행중", value: safeCount },
        ];

        return { totalActive, needsManagementCount, safeCount, data };
    }, [filteredData]);

    const { totalActive: activeRentalCount, needsManagementCount: activeNeedsManagementCount, safeCount: activeSafeCount, data: rentalPieData } = contractStats;
    const RENTAL_COLORS = ['#f43f5e', '#3b82f6'];

    // locaions 상태 동기화
    useEffect(() => {
        locationsRef.current = locations;
    }, [locations]);

    // 1. 임대 데이터에서 주소별 그룹화
    useEffect(() => {
        if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
            return;
        }

        const processAddresses = async () => {
            setIsGeocoding(true);
            const addressGroups: Record<string, { count: number; clients: Set<string>; urgency: 'critical' | 'overdue' | 'warning' | 'normal' }> = {};

            // 데이터 집계
            filteredData.rental.forEach(item => {
                const addr = item.address?.trim();
                const days = item.daysLeft;

                if (addr && addr !== "-" && addr.length > 2) {
                    if (!addressGroups[addr]) {
                        addressGroups[addr] = { count: 0, clients: new Set(), urgency: 'normal' };
                    }
                    addressGroups[addr].count += 1;
                    if (item.client) addressGroups[addr].clients.add(item.client);

                    let currentUrgency: 'critical' | 'overdue' | 'warning' | 'normal' = 'normal';

                    if (days !== undefined && days !== null) {
                        if (days <= -30) currentUrgency = 'critical';
                        else if (days < 0) currentUrgency = 'overdue';
                        else if (days <= 7) currentUrgency = 'warning';
                    }

                    const urgencyRank = { normal: 0, warning: 1, overdue: 2, critical: 3 };
                    if (urgencyRank[currentUrgency] > urgencyRank[addressGroups[addr].urgency]) {
                        addressGroups[addr].urgency = currentUrgency;
                    }
                }
            });

            const newLocations: MapLocation[] = [];
            const uniqueAddresses = Object.keys(addressGroups);

            const geocodePromises = uniqueAddresses.map(address => {
                return new Promise<void>((resolve) => {
                    window.naver.maps.Service.geocode({
                        query: address
                    }, (status: any, response: any) => {
                        if (status === window.naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                            const item = response.v2.addresses[0];
                            newLocations.push({
                                lat: parseFloat(item.y),
                                lng: parseFloat(item.x),
                                address: address,
                                count: addressGroups[address].count,
                                clients: Array.from(addressGroups[address].clients),
                                urgency: addressGroups[address].urgency
                            });
                        }
                        resolve();
                    });
                });
            });

            await Promise.all(geocodePromises);
            setLocations(newLocations);
            setClusters(newLocations);
            setIsGeocoding(false);
        };

        processAddresses();
    }, [filteredData.rental]);

    // 클러스터링 로직 (줌 레벨 고려한 화면 거리 계산)
    const updateClusters = () => {
        if (!mapInstance.current) return;

        const currentLocations = locationsRef.current;
        if (currentLocations.length === 0) return;

        const map = mapInstance.current;
        const zoom = map.getZoom();
        const proj = map.getProjection();

        const clusterThreshold = 60;

        const points = currentLocations.map(loc => {
            const coord = new window.naver.maps.LatLng(loc.lat, loc.lng);
            const point = proj.fromCoordToPoint(coord);
            return {
                ...loc,
                pixelX: point.x * Math.pow(2, zoom),
                pixelY: point.y * Math.pow(2, zoom)
            };
        });

        const merged: any[] = [];
        const urgencyRank = { normal: 0, warning: 1, overdue: 2, critical: 3 };

        points.forEach(p => {
            const existing = merged.find(c => {
                const dist = Math.sqrt(Math.pow(c.pixelX - p.pixelX, 2) + Math.pow(c.pixelY - p.pixelY, 2));
                return dist <= clusterThreshold;
            });

            if (existing) {
                existing.count += p.count;
                p.clients.forEach((client: string) => {
                    if (!existing.clients.includes(client)) existing.clients.push(client);
                });

                if (urgencyRank[p.urgency as 'normal' | 'warning' | 'overdue' | 'critical'] > urgencyRank[existing.urgency as 'normal' | 'warning' | 'overdue' | 'critical']) {
                    existing.urgency = p.urgency;
                }

                existing.clusterSize = (existing.clusterSize || 1) + 1;
            } else {
                merged.push({
                    ...p,
                    clusterSize: 1,
                    clients: [...p.clients]
                });
            }
        });

        const displayClusters = merged.map(c => ({
            ...c,
            address: c.clusterSize > 1 ? `${c.address} 외 ${c.clusterSize - 1}곳` : c.address
        }));

        setClusters(displayClusters);
    };

    // 2. 지도 초기화
    useEffect(() => {
        if (!mapRef.current || !window.naver) return;

        if (!mapInstance.current) {
            const mapOptions = {
                center: new window.naver.maps.LatLng(37.4, 127.1),
                zoom: 10,
                mapTypeId: window.naver.maps.MapTypeId.NORMAL,
                zoomControl: true,
                zoomControlOptions: {
                    position: window.naver.maps.Position.TOP_RIGHT
                }
            };
            mapInstance.current = new window.naver.maps.Map(mapRef.current, mapOptions);

            window.naver.maps.Event.addListener(mapInstance.current, 'idle', updateClusters);
            window.naver.maps.Event.addListener(mapInstance.current, 'zoom_changed', updateClusters);
        }
    }, []);

    useEffect(() => {
        if (mapInstance.current) {
            updateClusters();
        } else {
            setClusters(locations);
        }
    }, [locations]);

    // 3. 마커 렌더링
    useEffect(() => {
        if (!mapInstance.current || !window.naver) return;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const newMarkers = clusters.map(loc => {
            let markerColor = 'bg-chart-1';
            let blurColor = 'bg-chart-1/20';
            let titleColor = '#3b82f6';
            let animate = '';
            let zIndex = 1;

            if (loc.urgency === 'critical') {
                markerColor = 'bg-red-600';
                blurColor = 'bg-red-600/30';
                titleColor = '#dc2626';
                animate = 'animate-pulse';
                zIndex = 100;
            } else if (loc.urgency === 'overdue') {
                markerColor = 'bg-orange-500';
                blurColor = 'bg-orange-500/30';
                titleColor = '#f97316';
                zIndex = 50;
            } else if (loc.urgency === 'warning') {
                markerColor = 'bg-yellow-500';
                blurColor = 'bg-yellow-500/30';
                titleColor = '#eab308';
                zIndex = 50;
            }

            // @ts-ignore
            const clusterCount = loc.clusterSize || 1;

            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(loc.lat, loc.lng),
                map: mapInstance.current,
                title: loc.address,
                zIndex: zIndex,
                icon: {
                    content: `
                        <div class="relative group">
                            <div class="absolute -inset-4 rounded-full ${blurColor} scale-100 blur-sm ${animate}"></div>
                            <div class="${markerColor} text-white shadow-lg px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/20 whitespace-nowrap hover:scale-110 transition-transform">
                                <div class="text-xs font-bold">${loc.count}</div>
                                <div class="text-[10px] font-bold opacity-80 max-w-[100px] truncate">${loc.address}</div>
                                ${clusterCount > 1 ? `<div class="bg-white/20 px-1 rounded text-[9px]">+${clusterCount - 1}</div>` : ''}
                            </div>
                        </div>
                    `,
                    anchor: new window.naver.maps.Point(15, 15)
                }
            });

            const clientsList = loc.clients.slice(0, 3).join(", ") + (loc.clients.length > 3 ? " 외" : "");

            let statusText = '';
            if (loc.urgency === 'critical') statusText = '<div style="font-size: 11px; color: #dc2626; font-weight: bold; margin-bottom: 4px;">🚨 장기 연체 (30일 이상)</div>';
            else if (loc.urgency === 'overdue') statusText = '<div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 4px;">⚠️ 계약 만료 (연체 중)</div>';
            else if (loc.urgency === 'warning') statusText = '<div style="font-size: 11px; color: #eab308; font-weight: bold; margin-bottom: 4px;">⚡ 계약 만료 임박 (7일 이내)</div>';

            const contentString = `
                <div style="padding: 12px; background: rgba(0,0,0,0.85); color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(8px); min-width: 200px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    <div style="font-size: 13px; font-weight: 800; margin-bottom: 8px;">${loc.address}</div>
                    <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">배치 수량: <span style="color: ${titleColor}; font-weight: bold;">${loc.count}대</span></div>
                    ${statusText}
                    ${clusterCount > 1 ? `<div style="font-size: 10px; color: #e2e8f0; margin-top: 4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1);">* 인근 ${clusterCount}개 현장 통합됨</div>` : ''}
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                        거래처: ${clientsList}
                    </div>
                </div>
            `;

            const infowindow = new window.naver.maps.InfoWindow({
                content: contentString,
                borderWidth: 0,
                backgroundColor: 'transparent',
                disableAnchor: true,
                pixelOffset: new window.naver.maps.Point(0, -10)
            });

            window.naver.maps.Event.addListener(marker, "mouseover", () => {
                infowindow.open(mapInstance.current, marker);
            });

            window.naver.maps.Event.addListener(marker, "mouseout", () => {
                infowindow.close();
            });

            return marker;
        });

        markersRef.current = newMarkers;
    }, [clusters]);

    const totalContainers = locations.reduce((sum, l) => sum + l.count, 0);

    const criticalCount = locations.filter(l => l.urgency === 'critical').length;
    const overdueCount = locations.filter(l => l.urgency === 'overdue').length;
    const warningCount = locations.filter(l => l.urgency === 'warning').length;
    const normalCount = locations.filter(l => l.urgency === 'normal').length;

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-glow mb-2">물류 지도</h1>
                        <p className="text-muted-foreground text-lg">
                            전국 임대 현장 및 자산 배치 현황
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-primary" />
                            <div>
                                <div className="text-xs text-muted-foreground uppercase">배치 현장</div>
                                <div className="text-lg font-bold">{locations.length}개소</div>
                            </div>
                        </div>
                        <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
                            <Navigation className="h-5 w-5 text-chart-2" />
                            <div>
                                <div className="text-xs text-muted-foreground uppercase">배치 자산</div>
                                <div className="text-lg font-bold">{totalContainers}대</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 flex-1 aspect-square md:min-h-[600px]">
                    <Card className="glass-panel border-white/10 overflow-hidden relative group">
                        <CardHeader className="absolute top-0 left-0 z-10 p-4 w-full pointer-events-none">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white pointer-events-auto">
                                <div className={`w-2 h-2 rounded-full ${isGeocoding ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'} `} />
                                {isGeocoding ? '주소 변환 중...' : '네이버 맵 실시간 연동 (임대 현황)'}
                            </div>
                        </CardHeader>

                        <div className="w-full h-full relative">
                            <div
                                ref={mapRef}
                                className="w-full h-full"
                                style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(1.1) contrast(0.9)' }}
                            />

                            <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
                                <div className="glass-panel p-4 rounded-xl border-white/10 space-y-3 w-64 shadow-2xl">
                                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">이용 현황 및 범례</div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-left bg-chart-1 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            <span className="text-xs text-white">정상 이용 ({normalCount}개소)</span>
                                        </div>
                                        {warningCount > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                                <span className="text-xs text-white">만료 임박 ({warningCount}개소)</span>
                                            </div>
                                        )}
                                        {overdueCount > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                                <span className="text-xs text-white">기간 만료 ({overdueCount}개소)</span>
                                            </div>
                                        )}
                                        {criticalCount > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse" />
                                                <span className="text-xs text-white">장기 연체 ({criticalCount}개소)</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-[10px] text-yellow-500 pt-2 border-t border-white/5">
                                            <AlertCircle className="h-3 w-3" />
                                            줌 아웃 시 근접 현장 자동 통합
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Contract Management Status Section */}
                <div className="grid gap-6">
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>계약 관리 상태</CardTitle>
                            <CardDescription>관리요망(7일 이하) vs 정상 계약 비율</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col lg:flex-row items-center gap-8 py-8">
                                <div className="h-[350px] w-full lg:w-1/2 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={rentalPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {rentalPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={RENTAL_COLORS[index % RENTAL_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(20, 20, 30, 0.9)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    color: '#fff'
                                                }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                                        <div className="text-4xl font-bold text-white">{activeRentalCount}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-widest">Total Active</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-1/2">
                                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">관리요망 (7일 이하)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold text-red-500">{activeNeedsManagementCount}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                전체 계약의 {activeRentalCount > 0 ? ((activeNeedsManagementCount / activeRentalCount) * 100).toFixed(1) : 0}% 차지
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">정상 진행중</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold text-blue-400">{activeSafeCount}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                전체 계약의 {activeRentalCount > 0 ? ((activeSafeCount / activeRentalCount) * 100).toFixed(1) : 0}% 차지
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

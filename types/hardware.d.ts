export interface ISensorReading {
    hr: number;           // BPM
    spo2: number;         // %
    temperature: number;  // °C
    ppgRaw: number[];     // 25Hz buffer, last 5 seconds
    imuAccel: { x: number; y: number; z: number };
    timestamp: number;    // Unix ms
    patchId?: string;
    patchSku?: 'ARA-P1' | 'ARA-P2' | 'ARA-P3' | 'ARA-P4' | null;
}

export interface IPatchInfo {
    id: string;
    sku: string;
    firmwareVersion: string;
}

export interface IHardwareService {
    connect(): Promise<boolean>;
    disconnect(): void;
    subscribe(callback: (data: ISensorReading) => void): () => void;
    getPatchInfo(): Promise<IPatchInfo | null>;
}

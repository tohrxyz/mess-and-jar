export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const decimals = 2;
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
    
    return `${size} ${units[i]}`;
}

export function extractIdFromImageSource(val: string) {
    const splitted = val?.split("/")
    const result = splitted?.[splitted.length - 1]
    return result
}
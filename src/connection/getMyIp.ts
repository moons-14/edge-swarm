export const getMyIp = async () => {
    const response = await fetch('https://ipinfo.io/json');
    const data = await response.json() as { ip: string };
    return data.ip;
}
import dayjs from 'dayjs';

// Sử dụng import động thay vì import tĩnh
const loadPlugins = async () => {
    try {
        const utc = await import('dayjs/plugin/utc.js');
        const timezone = await import('dayjs/plugin/timezone.js');
        const customParseFormat = await import('dayjs/plugin/customParseFormat.js');

        dayjs.extend(utc.default);
        dayjs.extend(timezone.default);
        dayjs.extend(customParseFormat.default);

        console.log('Dayjs plugins loaded successfully');
    } catch (error) {
        console.error('Failed to load dayjs plugins:', error);
    }
};

// Gọi hàm load plugins
loadPlugins();

// Hàm định dạng ngày tháng theo yêu cầu của VNPay không phụ thuộc vào plugins
const formatVNPayDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

export { formatVNPayDate };
export default dayjs; 
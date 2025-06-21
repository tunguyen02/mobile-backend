import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import dayjs from "dayjs";
import ExcelJS from 'exceljs';

const exportFileController = {
    exportProductExcel: async (req, res) => {
        try {
            // Tạo workbook và worksheet mới
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Tech Planet';
            workbook.lastModifiedBy = 'Tech Planet Admin';
            workbook.created = new Date();
            workbook.modified = new Date();

            // Thêm ngày xuất báo cáo
            const currentDate = dayjs().format('DD/MM/YYYY HH:mm');

            // 1. Tạo dữ liệu tổng quan về sản phẩm theo thương hiệu
            const brands = await Brand.find();
            const productsByBrand = [];
            let totalProductCount = 0;

            for (const brand of brands) {
                const productCount = await Product.countDocuments({ brand: brand._id });
                totalProductCount += productCount;

                productsByBrand.push({
                    Thương_hiệu: brand.name,
                    Số_lượng_sản_phẩm: productCount,
                });
            }

            // 2. Tính toán thông tin đơn hàng
            const orders = await Order.find();
            const totalOrderCount = orders.length;
            const validOrderCount = orders.filter(order => order.shippingStatus !== 'Cancelled').length;
            let totalOrderValue = 0;

            // Chỉ tính doanh thu cho các đơn hàng không bị hủy
            orders.forEach(order => {
                if (order.shippingStatus !== 'Cancelled') {
                    totalOrderValue += order.totalPrice;
                }
            });

            // Thêm dòng tổng kết
            productsByBrand.push({
                Thương_hiệu: "Tổng số sản phẩm",
                Số_lượng_sản_phẩm: totalProductCount,
            });

            // 3. Tạo dữ liệu chi tiết đơn hàng
            const payments = await Payment.find()
                .populate("orderId", "userId products totalPrice shippingStatus shippingInfo createdAt")
                .populate({
                    path: "orderId",
                    populate: {
                        path: "products.product",
                        select: "name color price originalPrice",
                    },
                })
                .populate({
                    path: "orderId",
                    populate: {
                        path: "userId",
                        select: "name email phoneNumber",
                    },
                });

            const orderDetails = payments.map((payment) => {
                const order = payment.orderId;
                if (!order) return null;

                const user = order?.userId || {};
                const shippingInfo = order?.shippingInfo || {};

                // Format ngày tạo đơn hàng
                const orderDate = order?.createdAt ? dayjs(order.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A';
                const orderMonth = order?.createdAt ? dayjs(order.createdAt).format('MM/YYYY') : 'N/A';

                return {
                    orderId: order._id || "N/A",
                    userName: user.name || "No Name",
                    userEmail: user.email || "No Email",
                    userPhone: user.phoneNumber || "No Phone",
                    products: order.products.map(item => ({
                        name: item.product?.name || "Unknown",
                        quantity: item.quantity,
                        price: item.price,
                        isFlashSale: item.isFlashSale
                    })),
                    totalPrice: order.totalPrice || 0,
                    paymentMethod: payment.paymentMethod || "N/A",
                    paymentStatus: payment.paymentStatus || "N/A",
                    shippingStatus: order.shippingStatus || "N/A",
                    orderDate: orderDate,
                    orderMonth: orderMonth,
                    shippingName: shippingInfo.name || "N/A",
                    shippingPhone: shippingInfo.phoneNumber || "N/A",
                    shippingAddress: `${shippingInfo.detailedAddress || ''}, ${shippingInfo.ward || ''}, ${shippingInfo.district || ''}, ${shippingInfo.city || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
                    isCancelled: order.shippingStatus === 'Cancelled'
                };
            }).filter(Boolean);

            // 4. Tạo dữ liệu tổng quan về đơn hàng và doanh thu
            const orderSummary = [
                {
                    Chỉ_số: "Tổng số đơn hàng",
                    Giá_trị: validOrderCount
                },
                {
                    Chỉ_số: "Tổng doanh thu",
                    Giá_trị: totalOrderValue
                },
                {
                    Chỉ_số: "Giá trị đơn hàng trung bình",
                    Giá_trị: validOrderCount > 0
                        ? totalOrderValue / validOrderCount
                        : 0
                }
            ];

            // 5. Tạo dữ liệu chi tiết từng đơn hàng cho Excel
            const flattenedOrderDetails = orderDetails.map(order => {
                return {
                    orderId: order.orderId,
                    userName: order.userName,
                    userEmail: order.userEmail,
                    userPhone: order.userPhone,
                    productsList: order.products.map(p => `${p.name} (x${p.quantity})`).join(", "),
                    totalPrice: order.totalPrice,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                    shippingStatus: order.shippingStatus,
                    orderDate: order.orderDate,
                    orderMonth: order.orderMonth,
                    shippingName: order.shippingName,
                    shippingPhone: order.shippingPhone,
                    shippingAddress: order.shippingAddress,
                    isCancelled: order.isCancelled
                };
            });

            // 6. Nhóm đơn hàng theo tháng
            const ordersByMonth = {};
            let monthlyValidOrderCount = 0;

            flattenedOrderDetails.forEach(order => {
                if (!ordersByMonth[order.orderMonth]) {
                    ordersByMonth[order.orderMonth] = {
                        orders: [],
                        totalRevenue: 0,
                        orderCount: 0,
                        validOrderCount: 0
                    };
                }

                ordersByMonth[order.orderMonth].orders.push(order);
                ordersByMonth[order.orderMonth].orderCount += 1;

                // Chỉ tính doanh thu và đếm đơn hàng hợp lệ cho đơn hàng không bị hủy
                if (!order.isCancelled) {
                    ordersByMonth[order.orderMonth].totalRevenue += order.totalPrice;
                    ordersByMonth[order.orderMonth].validOrderCount += 1;
                    monthlyValidOrderCount += 1;
                }
            });

            // Định nghĩa các style cho Excel
            const headerStyle = {
                font: { bold: true, color: { argb: 'FFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
            };

            const sectionHeaderStyle = {
                font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
            };

            const titleStyle = {
                font: { bold: true, size: 16 },
                alignment: { horizontal: 'center' }
            };

            const dateStyle = {
                font: { bold: true, italic: true },
                alignment: { horizontal: 'center' }
            };

            const totalRowStyle = {
                font: { bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } }
            };

            const currencyFormat = '#,##0 ₫';

            // ===== SHEET 1: THÔNG TIN TỔNG QUAN =====
            const overviewSheet = workbook.addWorksheet('Thông tin tổng quan');

            // Thiết lập độ rộng cột cho sheet 1
            overviewSheet.columns = [
                { width: 25 }, { width: 20 }, { width: 15 }, { width: 15 },
                { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
            ];

            // Thêm tiêu đề báo cáo cho sheet 1
            overviewSheet.mergeCells('A1:H1');
            const titleCell1 = overviewSheet.getCell('A1');
            titleCell1.value = 'BÁO CÁO TỔNG QUAN CỬA HÀNG';
            titleCell1.style = titleStyle;

            overviewSheet.mergeCells('A2:H2');
            const dateCell1 = overviewSheet.getCell('A2');
            dateCell1.value = `Ngày xuất báo cáo: ${currentDate}`;
            dateCell1.style = dateStyle;

            // Thêm dòng trống
            overviewSheet.addRow([]);

            // PHẦN 1: Thống kê sản phẩm theo thương hiệu
            overviewSheet.mergeCells('A4:H4');
            const section1Cell = overviewSheet.getCell('A4');
            section1Cell.value = 'THỐNG KÊ SẢN PHẨM THEO THƯƠNG HIỆU';
            section1Cell.style = sectionHeaderStyle;

            // Thêm header cho phần 1
            const brandHeader = overviewSheet.addRow(['Thương hiệu', 'Số lượng sản phẩm']);
            brandHeader.eachCell((cell) => {
                cell.style = headerStyle;
            });

            // Thêm dữ liệu thương hiệu
            productsByBrand.forEach((item, index) => {
                const row = overviewSheet.addRow([
                    item.Thương_hiệu,
                    String(item.Số_lượng_sản_phẩm)
                ]);

                if (item.Thương_hiệu === 'Tổng số sản phẩm') {
                    row.eachCell((cell) => {
                        cell.style = totalRowStyle;
                    });
                }
            });

            // Thêm dòng trống
            overviewSheet.addRow([]);
            overviewSheet.addRow([]);

            // PHẦN 2: Tổng quan đơn hàng và doanh thu
            const section2StartRow = overviewSheet.rowCount;
            overviewSheet.mergeCells(`A${section2StartRow}:H${section2StartRow}`);
            const section2Cell = overviewSheet.getCell(`A${section2StartRow}`);
            section2Cell.value = 'TỔNG QUAN ĐƠN HÀNG VÀ DOANH THU';
            section2Cell.style = sectionHeaderStyle;

            // Thêm header cho phần tổng quan
            const summaryHeader = overviewSheet.addRow(['Chỉ số', 'Giá trị']);
            summaryHeader.eachCell((cell) => {
                cell.style = headerStyle;
            });

            // Thêm dữ liệu tổng quan
            orderSummary.forEach(item => {
                let displayValue;

                if (item.Chỉ_số === 'Tổng số đơn hàng') {
                    displayValue = String(item.Giá_trị);
                } else if (item.Chỉ_số === 'Tổng doanh thu' || item.Chỉ_số === 'Giá trị đơn hàng trung bình') {
                    displayValue = item.Giá_trị;
                } else {
                    displayValue = item.Giá_trị;
                }

                const row = overviewSheet.addRow([item.Chỉ_số, displayValue]);

                if (item.Chỉ_số === 'Tổng doanh thu' || item.Chỉ_số === 'Giá trị đơn hàng trung bình') {
                    row.getCell(2).numFmt = currencyFormat;
                }
            });

            // Thêm dòng trống
            overviewSheet.addRow([]);
            overviewSheet.addRow([]);

            // PHẦN 3: Thống kê đơn hàng theo tháng
            const section3StartRow = overviewSheet.rowCount;
            overviewSheet.mergeCells(`A${section3StartRow}:H${section3StartRow}`);
            const section3Cell = overviewSheet.getCell(`A${section3StartRow}`);
            section3Cell.value = 'THỐNG KÊ ĐƠN HÀNG THEO THÁNG';
            section3Cell.style = sectionHeaderStyle;

            // Thêm header cho phần thống kê theo tháng
            const monthlyHeader = overviewSheet.addRow(['Tháng', 'Số lượng đơn hàng', 'Tổng doanh thu']);
            monthlyHeader.eachCell((cell) => {
                cell.style = headerStyle;
            });

            // Thêm dữ liệu thống kê theo tháng
            let totalMonthlyRevenue = 0;
            Object.keys(ordersByMonth).sort().forEach(month => {
                const monthData = ordersByMonth[month];
                totalMonthlyRevenue += monthData.totalRevenue;

                const row = overviewSheet.addRow([
                    month,
                    String(monthData.validOrderCount),
                    monthData.totalRevenue
                ]);

                // Chỉ định dạng cột giá tiền
                row.getCell(3).numFmt = currencyFormat;
            });

            // Thêm dòng tổng kết cho thống kê theo tháng
            const totalMonthlyRow = overviewSheet.addRow([
                'Tổng cộng',
                String(monthlyValidOrderCount),
                totalMonthlyRevenue
            ]);

            totalMonthlyRow.eachCell((cell) => {
                cell.style = totalRowStyle;
            });
            totalMonthlyRow.getCell(3).numFmt = currencyFormat;

            // ===== SHEET 2: CHI TIẾT ĐƠN HÀNG =====
            const orderSheet = workbook.addWorksheet('Chi tiết đơn hàng');

            // Thiết lập độ rộng cột cho sheet 2
            orderSheet.columns = [
                { width: 20 }, { width: 20 }, { width: 25 }, { width: 15 },
                { width: 40 }, { width: 15 }, { width: 15 }, { width: 15 },
                { width: 15 }, { width: 15 }, { width: 20 }, { width: 15 },
                { width: 40 }
            ];

            // Thêm tiêu đề báo cáo cho sheet 2
            orderSheet.mergeCells('A1:M1');
            const titleCell2 = orderSheet.getCell('A1');
            titleCell2.value = 'CHI TIẾT ĐƠN HÀNG';
            titleCell2.style = titleStyle;

            orderSheet.mergeCells('A2:M2');
            const dateCell2 = orderSheet.getCell('A2');
            dateCell2.value = `Ngày xuất báo cáo: ${currentDate}`;
            dateCell2.style = dateStyle;

            // Thêm dòng trống
            orderSheet.addRow([]);

            // Thêm header cho chi tiết đơn hàng
            const detailsHeader = orderSheet.addRow([
                'Mã đơn hàng', 'Tên khách hàng', 'Email', 'Số điện thoại',
                'Danh sách sản phẩm', 'Tổng giá trị', 'Phương thức thanh toán',
                'Trạng thái thanh toán', 'Trạng thái vận chuyển', 'Ngày đặt hàng',
                'Tên người nhận', 'SĐT người nhận', 'Địa chỉ giao hàng'
            ]);
            detailsHeader.eachCell((cell) => {
                cell.style = headerStyle;
            });

            // Thêm dữ liệu chi tiết đơn hàng
            flattenedOrderDetails.forEach(order => {
                const row = orderSheet.addRow([
                    order.orderId,
                    order.userName,
                    order.userEmail,
                    order.userPhone,
                    order.productsList,
                    order.isCancelled ? "-" : order.totalPrice,
                    order.paymentMethod,
                    order.paymentStatus,
                    order.shippingStatus,
                    order.orderDate,
                    order.shippingName,
                    order.shippingPhone,
                    order.shippingAddress
                ]);

                // Định dạng cột giá tiền (chỉ áp dụng nếu không phải đơn hàng bị hủy)
                if (!order.isCancelled) {
                    row.getCell(6).numFmt = currencyFormat;
                }

                // Định dạng màu cho trạng thái
                const paymentStatusCell = row.getCell(8);
                const shippingStatusCell = row.getCell(9);

                // Màu cho trạng thái thanh toán
                if (order.paymentStatus === 'Completed') {
                    paymentStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
                } else if (order.paymentStatus === 'Pending') {
                    paymentStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEB9C' } };
                } else if (order.paymentStatus === 'Expired' || order.paymentStatus.includes('Failed')) {
                    paymentStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
                } else if (order.paymentStatus.includes('Refund')) {
                    paymentStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } };
                }

                // Màu cho trạng thái vận chuyển
                if (order.shippingStatus === 'Completed') {
                    shippingStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
                } else if (order.shippingStatus === 'Pending' || order.shippingStatus === 'Processing') {
                    shippingStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEB9C' } };
                } else if (order.shippingStatus === 'Cancelled') {
                    shippingStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
                } else if (order.shippingStatus === 'Shipping') {
                    shippingStatusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } };
                }
            });

            // Thêm dòng tổng kết ở cuối bảng chi tiết đơn hàng
            const totalRow = orderSheet.addRow([
                'TỔNG CỘNG',
                '',
                '',
                '',
                `${validOrderCount} đơn hàng`,
                totalOrderValue,
                '',
                '',
                '',
                '',
                '',
                '',
                ''
            ]);

            // Định dạng dòng tổng kết
            totalRow.eachCell((cell, colNumber) => {
                if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
                    cell.style = {
                        font: { bold: true },
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } }
                    };
                    if (colNumber === 6) {
                        cell.numFmt = currencyFormat;
                    }
                }
            });

            // Thiết lập filter cho bảng chi tiết đơn hàng
            orderSheet.autoFilter = {
                from: { row: 4, column: 1 },
                to: { row: orderSheet.rowCount - 1, column: 13 } // Trừ 1 để không bao gồm dòng tổng kết
            };

            // Đặt tên file và gửi response
            const fileName = `bao_cao_cua_hang_${dayjs().format('DDMMYYYY_HHmm')}.xlsx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

            // Ghi workbook vào response
            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error("Error exporting Excel:", error);
            res.status(400).json({
                message: "Failed to export Excel file.",
                error: error.message
            });
        }
    },
};

export default exportFileController;

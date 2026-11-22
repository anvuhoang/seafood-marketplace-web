# Danh mục đơn vị hành chính (`dvhcvn.json`)

- **Nguồn gốc:** Danh mục hành chính của Tổng cục Thống kê, https://danhmuchanhchinh.gso.gov.vn
- **Lấy qua:** https://github.com/dvhcvn/data, file `data.json`, commit `5393138f97bf5dd32a6b92d88d99691ed09e931d`. Dữ liệu ở commit này hiệu lực từ 01/03/2025.
- **SHA-256 của file:** `beafdf95426a2a558425dd2ced9b676da6ab23212c17bd0492d8bf2674e78cd1`
- **Quy mô:** 63 tỉnh/thành, 696 quận/huyện, 10.047 xã/phường/thị trấn.
- **Hệ thống:** địa giới **3 cấp, trước 01/07/2025**. Dùng hệ này vì schema `Vendor` có cột `district` bắt buộc và dữ liệu seed theo tỉnh/huyện cũ. Đổi sang hệ 2 cấp (34 tỉnh) thì phải sửa schema trong một issue riêng.
- **Giấy phép:** repo `dvhcvn/data` không ghi giấy phép. Dữ liệu gốc là danh mục công khai của cơ quan nhà nước.

File được giữ nguyên, không sửa tay. Muốn cập nhật thì tải lại file từ nguồn trên, sau đó cập nhật commit và SHA-256 ở đây.

Tên lưu vào database được bỏ tiền tố loại đơn vị ("Tỉnh", "Thành phố", "Huyện", "Phường", ...) để khớp định dạng seed, ví dụ "Kiên Giang" / "Phú Quốc". Hai trường hợp vẫn giữ tên đầy đủ:
- Phần còn lại là số, ví dụ "Quận 1".
- Bỏ tiền tố làm trùng tên với một đơn vị khác trong cùng cấp cha, ví dụ "Huyện Cai Lậy" và "Thị xã Cai Lậy".

Logic xem `administrative-unit.service.ts`.

**Lỗi bất thường đã biết trong nguồn:** Thành phố Thanh Hóa (mã 380) có hai xã cùng tên "Xã Đông Khê" (mã 16387 và 16408). Hai xã này lưu cùng một tên nên khi điền sẵn form gửi lại, ô xã/phường để trống để người dùng chọn lại. Việc kiểm tra mã khi gửi lên vẫn đúng.

# thien-le-ngoc

Trang cá nhân — HTML/CSS thuần, song ngữ (VI/EN), host trên GitHub Pages.

## Cấu trúc

```
index.html            Trang chủ: giới thiệu, sở thích, blog, dự án, kinh nghiệm
blog/index.html       Danh sách bài viết + lọc theo thẻ (?tag=...)
blog/hello-world.html Bài viết mẫu (copy để viết bài mới)
assets/css/style.css  Toàn bộ style (màu ở :root, có dark mode)
assets/js/main.js     Nút chuyển ngôn ngữ + giao diện sáng/tối
.nojekyll             Báo GitHub Pages phục vụ file nguyên trạng
```

## Chỉnh nội dung

- Tìm `TODO` trong `index.html` để thay nội dung mẫu.
- Song ngữ: đặt bản tiếng Việt trong phần tử `data-l="vi"`, bản tiếng Anh trong `data-l="en"`. Phần tử nào không có `data-l` thì hiện ở cả hai ngôn ngữ.
- Ảnh đại diện: bỏ ảnh vào `assets/img/avatar.jpg` rồi thay khối `<div class="avatar">` bằng `<img class="avatar" src="assets/img/avatar.jpg" alt="">`.
- CV: bỏ file `cv.pdf` vào thư mục gốc (hoặc xoá nút "Tải CV").

## Viết bài blog

1. Copy `blog/hello-world.html` thành `blog/<slug>.html` rồi sửa nội dung và thẻ.
2. Thêm một `<li data-tags="...">` vào đầu danh sách trong `blog/index.html`.
3. (Tuỳ chọn) Thêm vào mục "Bài viết mới" ở `index.html`.

### Thẻ (sở thích)

Mỗi bài có một hoặc nhiều thẻ trong `data-tags`, cách nhau bằng dấu cách, ví dụ `data-tags="photography travel"`.

| Slug          | Hiển thị                |
|---------------|-------------------------|
| `photography` | Nhiếp ảnh / Photography |
| `travel`      | Du lịch / Travel        |
| `gamedev`     | Làm game / Game dev     |
| `gaming`      | Chơi game / Gaming      |
| `movies`      | Phim / Movies           |
| `music`       | Âm nhạc / Music         |
| `tech`        | Kỹ thuật / Tech         |

Lọc theo thẻ bằng `blog/?tag=<slug>`. Các thẻ ở mục Sở thích trên trang chủ dẫn tới đúng link này. Thêm thẻ mới: thêm nút vào `.filters` trong `blog/index.html` (và một thẻ ở trang chủ nếu muốn).

### Ảnh

Chỉ commit ảnh **đã nén** vào `blog/img/`. Ảnh gốc để trong `photos-src/` (đã gitignore, không bao giờ lên GitHub).

Cài đặt một lần:

```sh
python3 -m venv tools/.venv
tools/.venv/bin/pip install -r tools/requirements.txt
```

Mỗi album / bài viết:

```sh
# 1. Copy ảnh gốc (JPG, HEIC từ iPhone, PNG...) vào photos-src/<slug>/
# 2. Chạy script — nó in sẵn đoạn HTML gallery
tools/.venv/bin/python tools/add_photos.py photos-src/<slug>
# 3. Dán đoạn HTML vào blog/<slug>.html, điền alt cho từng ảnh
```

Script sẽ:
- xoay ảnh đúng chiều theo EXIF,
- **xoá toàn bộ metadata, gồm cả toạ độ GPS** nơi chụp,
- tạo bản lớn (2000px, WebP) và bản thumbnail (800px) trong `blog/img/<slug>/`,
- bỏ qua ảnh đã xử lý (dùng `--force` để làm lại), cảnh báo khi `blog/img/` vượt 800 MB.

Tuỳ chọn: `--size 1600`, `--thumb 600`, `--quality 75` để file nhỏ hơn.

Trong bài, bấm vào ảnh sẽ mở lightbox (←/→ để chuyển, Esc để đóng). Thêm class `wide` vào `.gallery` để mỗi ảnh chiếm trọn một dòng, giữ nguyên tỉ lệ.

**Giới hạn của GitHub:** site Pages tối đa 1 GB. Git giữ lại mọi file đã từng commit, nên xoá ảnh sau này *không* làm repo nhỏ lại — hãy kiểm tra trước khi commit. Mỗi ảnh sau khi nén khoảng 300–600 KB, nên còn chỗ cho khoảng 1500–2500 ảnh.

## Xem trên máy

```sh
python3 -m http.server 8000
# mở http://localhost:8000
```

## Deploy lên GitHub Pages

1. Push lên nhánh `main`.
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, chọn `main` / `/ (root)`.
3. Site sẽ có ở `https://lnthien97.github.io/thien-le-ngoc/`.

Muốn có địa chỉ `https://lnthien97.github.io/` thì đổi tên repo thành `lnthien97.github.io`. Đường dẫn trong site đều là tương đối nên chạy được ở cả hai kiểu.

# thien-le-ngoc

Trang cá nhân: **Ảnh**, **Chuyện**, **Công việc**. HTML/CSS thuần, song ngữ (VI/EN), host trên GitHub Pages.

## Cấu trúc

```
index.html               Trang chủ: giới thiệu, bộ sưu tập mới, truyện mới, công việc
anh/index.html           Trang ảnh (danh sách bộ sưu tập, hoặc 1 bộ qua ?c=<slug>)
anh/collections.json     Danh sách bộ sưu tập  (script tự cập nhật)
anh/<slug>/photos.json   Danh sách ảnh của 1 bộ (script tự cập nhật)
anh/<slug>/*.webp        Ảnh đã nén
chuyen/index.html        Trang truyện (danh sách, hoặc 1 truyện qua ?s=<slug>)
chuyen/stories.json      Danh sách truyện (sửa tay)
chuyen/<slug>.md         Nội dung từng truyện
assets/                  CSS + JS
tools/add_photos.py      Script thêm ảnh
```

Trang ảnh và trang truyện đọc dữ liệu từ các file JSON nên **không cần sửa HTML** khi thêm nội dung.

## Ảnh — bộ sưu tập

Mỗi bộ sưu tập là một chủ đề, ví dụ "Mây trời", "Góc cà phê"... Có thể thêm ảnh vào bất cứ lúc nào.

Cài đặt một lần:

```sh
python3 -m venv tools/.venv
tools/.venv/bin/pip install -r tools/requirements.txt
```

Thêm ảnh (cho bộ mới hoặc bộ cũ):

```sh
# 1. Bỏ ảnh gốc (JPG, HEIC từ iPhone, PNG...) vào photos-src/<Tên chủ đề>/
# 2. Chạy:
tools/.venv/bin/python tools/add_photos.py "photos-src/<Tên chủ đề>"
# 3. Commit thư mục anh/
```

Script sẽ:
- chỉ xử lý ảnh mới, bỏ qua ảnh đã có,
- xoay ảnh đúng chiều, **xoá toàn bộ metadata, gồm cả GPS**,
- tạo bản lớn (2000px) và thumbnail (800px) dạng WebP,
- sắp ảnh theo ngày chụp, mới nhất lên đầu,
- cập nhật `anh/collections.json`: số ảnh, ngày cập nhật. Bộ vừa thêm ảnh sẽ nổi lên đầu.

Lần đầu tạo bộ mới, tên bộ lấy theo tên thư mục. Sửa tiêu đề và mô tả song ngữ trong `anh/collections.json`:

```json
{
  "slug": "may-troi",
  "title": { "vi": "Mây trời", "en": "Skies" },
  "description": { "vi": "Những bầu trời mình gặp trên đường.", "en": "Skies I've met along the way." },
  "cover": "img-0012-thumb.webp",
  ...
}
```

- `cover`: ảnh bìa, là tên một file `-thumb.webp` trong thư mục của bộ đó.
- Chú thích ảnh: sửa trường `caption` trong `anh/<slug>/photos.json`, có thể là chuỗi hoặc `{ "vi": "...", "en": "..." }`.
- Xoá ảnh: xoá 2 file `.webp` của nó rồi chạy lại script.

**Giới hạn:** GitHub Pages tối đa 1 GB. Mỗi ảnh khoảng 300–600 KB, tức chứa được khoảng 1500–2500 ảnh. Git giữ mọi file đã commit, nên xoá sau này không làm repo nhỏ lại. Script cảnh báo khi `anh/` vượt 800 MB.

## Chuyện

1. Viết truyện vào `chuyen/<slug>.md`, ví dụ `chuyen/nguoi-gac-den.md`.
2. Thêm vào **đầu** danh sách `chuyen/stories.json`:

```json
[
  {
    "slug": "nguoi-gac-den",
    "title": "Người gác đèn",
    "date": "2026-10-27",
    "summary": "Một đêm bão, ngọn đèn không chịu sáng."
  }
]
```

`title` và `summary` có thể là chuỗi hoặc `{ "vi": "...", "en": "..." }`.

Cách viết trong file `.md`:

| Viết                    | Hiển thị                         |
|-------------------------|----------------------------------|
| dòng trống              | sang đoạn mới                    |
| xuống dòng 1 lần        | xuống dòng trong cùng đoạn       |
| `*nghiêng*`             | *nghiêng*                        |
| `**đậm**`               | **đậm**                          |
| `## Tiêu đề`            | tiêu đề chương                   |
| `> câu trích`           | trích dẫn                        |
| `***`                   | ngắt cảnh (* * *)                |

## Công việc

Sửa trực tiếp mục `#work` trong `index.html`. Repo là public, nên không ghi tên hệ thống nội bộ, khách hàng hay thông tin công ty.

## Xem trên máy

```sh
python3 -m http.server 8000
# mở http://localhost:8000
```

Phải chạy qua server. Mở file trực tiếp (`file://`) sẽ không tải được JSON.

## Deploy

GitHub → **Settings → Pages → Deploy from a branch** → `main` / `/ (root)`.
Site: `https://lnthien97.github.io/thien-le-ngoc/`

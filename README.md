# Tourism & Accommodation Booking Web App

  
هدف پروژه، شبیه‌سازی یک پلتفرم رزرو اقامتگاه با نقش‌های مختلف کاربری (گردشگر، میزبان، ادمین) و پیاده‌سازی مفاهیم واقعی بک‌اند و فرانت‌اند است.

---

## Features

### Authentication & Users
- ثبت‌نام و ورود کاربران با JWT
- مدیریت نقش‌ها: `tourist`، `host`، `admin`
- ذخیره اطلاعات کاربر در LocalStorage
- کنترل دسترسی بر اساس نقش کاربر (Role-based Access)

### Accommodations
- ثبت اقامتگاه توسط میزبان
- مشاهده لیست اقامتگاه‌ها
- مشاهده جزئیات اقامتگاه
- فیلتر و مرتب‌سازی (قیمت، ستاره، امتیاز)
- تایید یا رد اقامتگاه توسط ادمین

### Booking
- ثبت رزرو توسط گردشگر
- مشاهده رزروهای کاربر
- مدیریت وضعیت رزرو
- جلوگیری از رزروهای تکراری

### Favorites
- افزودن و حذف اقامتگاه از علاقه‌مندی‌ها
- ذخیره و بازیابی از بک‌اند

### Admin Panel
- مشاهده لیست کاربران
- فیلتر کاربران بر اساس نقش
- ویرایش دسترسی‌ها (`can_book` / `can_host`)
- تغییر وضعیت کاربر (`active` / `suspended`)

### UI / UX
- پیاده‌سازی SPA با Vanilla JavaScript
- استفاده از Swiper.js برای اسلایدرها و فیلترها
- طراحی Responsive با Flexbox و Grid
- Onboarding اولیه برای کاربران جدید

---

## Technologies Used

### Frontend
- HTML5
- CSS3 (Flexbox, Grid)
- Vanilla JavaScript
- Swiper.js
- LocalStorage

### Backend
- Node.js
- Express.js
- SQLite
- JWT (jsonwebtoken)
- RESTful API

### Tools
- VS Code
- Thunder Client (API Testing)
- http-server

---

## Several pages for example
![Home Page](screenshots/Screenshot(383).png)
![Home Page](screenshots/Screenshot(403).png)
![Home Page](screenshots/Screenshot(406).png)
![Home Page](screenshots/Screenshot(405).png)


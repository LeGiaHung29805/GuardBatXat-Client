# Sử dụng môi trường Node.js nhẹ (Alpine)
FROM node:18-alpine

# Cài đặt thư mục làm việc trong container
WORKDIR /app

# Copy các file cấu hình thư viện vào trước để tận dụng cache của Docker
COPY package.json package-lock.json* ./

# Cài đặt các thư viện (React, Leaflet, Next.js...)
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở cổng 3000 cho Next.js
EXPOSE 3000

# Lệnh khởi chạy server ở chế độ Development (để bạn code đến đâu web tự cập nhật đến đó)
CMD ["npm", "run", "dev"]
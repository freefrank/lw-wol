# lw-wol · Wake-on-LAN PWA ⚡

> A lightweight progressive web app and Fastify backend that sends Wake-on-LAN magic packets, discovers target IPs, and tracks wake status — now with multilingual UI and theme syncing.
>
> 轻量级 Wake-on-LAN 渐进式 Web 应用与 Fastify 后端，支持发送唤醒包、自动发现 IP、跟踪唤醒状态，并提供中英文界面与主题联动。

---

## ✨ Highlights · 功能亮点

- **PWA everywhere** – Installable UI that works on desktop & mobile without extra apps.  
  **随处可用的 PWA** – 可安装到桌面/移动端，无需额外客户端。
- **Auto IP discovery** – Broadcasts, inspects `ip neigh`, and monitors reachability via ping loops.  
  **自动发现 IP** – 广播唤醒包、解析 `ip neigh` 表，并持续 Ping 直到主机上线。
- **Multi-target console** – Save, activate, and remove hosts with per-target wake history.  
  **多目标控制台** – 支持保存/激活/删除多个主机，独立记录唤醒状态。
- **Theme & language sync** – Follows OS/browser defaults with in-app toggles (EN ⇄ 中文, Dark ⇄ Light).  
  **主题与语言同步** – 跟随系统/浏览器默认值，界面内可快速切换中英与明暗模式。
- **Zero-config Docker** – Single container serves API + static assets on port 8086 using host networking.  
  **一键 Docker** – 单容器即提供 API 与静态资源，通过 host network 直连局域网。

---

## 🚀 Quick Start · 快速上手

```bash
# 1. Copy example env, edit APP_PASSWORD before first run
cp .env.example .env

# 2. Pull latest image & start (host network required for WOL / ARP)
docker compose pull
docker compose up -d

# 3. Visit the console
#    http://<server-ip>:8086  or configure your reverse proxy
```

> Default password must be supplied via `.env` (`APP_PASSWORD`).
> 初次启动前请在 `.env` 中设置 `APP_PASSWORD`。

---

## ⚙️ Configuration · 配置说明

| Setting | Description | 说明 |
| --- | --- | --- |
| `APP_PASSWORD` | Required login password (plaintext) | 登录所需密码（明文） |
| `PORT` | HTTP bind port (default `8086`) | HTTP 监听端口（默认 `8086`） |
| `SERVE_STATIC` | Serve built PWA (`true`/`false`) | 是否同时提供前端静态资源 |
| `.env` | Inline overrides consumed by Compose | Compose 运行时的 `.env` 配置 |
| `backend/data/config.json` | Persists targets, ping strategy | 保存目标与 Ping 策略 |

*Copy `.env.example` then adjust values before start-up.*  
*请先复制 `.env.example`，启动前修改变量。*

---

## 🖥️ Frontend Controls · 前端控制

| Control | Action | 控件 | 说明 |
| --- | --- | --- | --- |
| Wake Action | Trigger selected/active target | 唤醒操作 | 立即唤醒当前目标 |
| Target Manager | Create / edit / delete / activate hosts | 目标管理 | 新增、修改、删除、激活主机 |
| Wake Sessions | View job logs & status timeline | 唤醒记录 | 查看日志与状态进度 |
| Bottom Bar | Theme / language / logout | 底部工具栏 | 主题、语言、退出切换 |

*Tokens are stored in memory only; refresh requires re-authentication.*  
*令牌仅存在内存中，刷新页面需重新登录。*

---

## 🔐 Reverse Proxy Notes · 反向代理提示

- Forward both `Authorization` **and** `X-Auth-Token` headers so authenticated requests remain valid.  
  转发 `Authorization` 与 `X-Auth-Token` 头部以确保鉴权有效。
- Serve over HTTPS if exposing to the public internet.  
  面向公网时请务必通过 HTTPS 提供服务。

Example (Nginx):
```nginx
proxy_set_header Authorization $http_authorization;
proxy_set_header X-Auth-Token $http_x_auth_token;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## 🛠️ Development · 开发模式

```bash
# Install dependencies
npm install

# Run frontend / backend separately
npm run dev:frontend
npm run dev:backend

# Trigger wake from REST client (example)
curl -X POST http://localhost:8086/api/wake \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetId": "primary"}'
```

---

## 📄 License · 许可

This project is provided under the MIT License.  
本项目以 MIT 许可证开源。

---

**lw-wol** — Wake smarter, anywhere.  
**lw-wol** — 随时唤醒，触手可及。

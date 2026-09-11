# 🎭 兩真一假 破冰對話 | Two Truths & A Lie

> **面向企業培訓與迎新活動的純前端、無痕私隱、點對點（P2P）破冰 Web 應用程式**  
> **An Ephemeral, Privacy-by-Design, Peer-to-Peer (P2P) Icebreaker Web App for Enterprise Training & Onboarding**

---

## 繁體中文 (Traditional Chinese)

### 🌟 專案簡介
本應用專為 **企業迎新會（New Joiner Onboarding）、管理層團隊建設（Team Building）及培訓工作坊（Facilitation Sessions）** 設計。採用 **純瀏覽器記憶體運作、無後端伺服器、無資料庫持久化** 的 WebRTC 點對點架構，徹底杜絕個人私隱外洩與資料留存風險，活動結束後所有數據隨瀏覽器分頁關閉即刻銷毀。

---

### 🛡️ 法律合規與治理架構 (Legal Compliance & Governance)
本系統於系統架構層面落實 **從設計著手保護私隱（Privacy by Design, PbD）**，並經嚴謹合規審查判定技術邊界：
1. **香港《個人資料（私隱）條例》（Cap. 486 PDPO）**：
   * **資料最小化（DPP 1）**：僅即時收集稱呼與 3 句短文，不索取任何敏感聯絡方式或帳號。
   * **零持久化留存（DPP 2）**：純揮發性 RAM 儲存，關閉分頁徹底銷毀，無日誌、無歸檔。
2. **歐盟《通用資料保護條例》（GDPR）**：
   * 符合第 5(1)(c) 條（Data Minimisation）與第 5(1)(e) 條（Storage Limitation）。
   * 關閉瀏覽器即自動達成第 17 條「被遺忘權（Right to Erasure）」。
3. **資訊安全與私隱標準（ISO/IEC 27001 & 27701 Alignment）**：
   * WebRTC 全程強制 DTLS/SRTP 端到端加密傳輸，攻擊面幾乎為零。
   * 落實原生 DOM-based XSS 轉義防禦、欄位長度截斷與嚴格之內容安全策略（CSP）。
4. **AI 監管排除判定（EU AI Act & ISO/IEC 42001 Exemption）**：
   * 本系統純屬**確定性邏輯（Deterministic Logic）**傳輸工具，**不包含任何 AI / ML 模型，絕不將用戶分享數據用於演算法訓練或資料探勘**，正式判定豁免於相關 AI 監管範疇。
   * *詳細法規適用性矩陣請參閱根目錄之 [`GOVERNANCE_AND_COMPLIANCE.md`](GOVERNANCE_AND_COMPLIANCE.md)。*

---

### 🚀 核心功能與工程亮點
* **無伺服器 P2P 星型通訊**：基於 PeerJS，由主持人筆電擔任本地房間通訊中心（上限 15 人），免除伺服器託管費用與資安疑慮。
* **會話 Token 身份解耦（Session Token Decoupling）**：
  * 將「業務身份（`clientToken`）」與「連線識別（`PeerID`）」徹底分離。
  * 手機鎖屏或休眠喚醒時，自動攜帶 Token 重連，**徹底消滅 WebRTC `unavailable-id` 競態問題**。
* **啟動冪等防護鎖（Idempotent Launch Lock）**：底層限制單次 Peer 實例建立，防範並行雙重實例引致的幽靈 Socket 記憶體洩漏。
* **狀態機嚴格閉環**：
  * 題目輪次（`currentRound`）誕生於主持人開題，嚴格銷毀於返回大廳或結案，**重連同仁絕不接收過期幽靈題目**。
  * 滿員重連優先權：舊同仁重連直接換線放行，絕不被誤判為第 16 人阻擋。
* **現場培訓師專屬設計**：
  * **🖥️ 1200px 投影模式**：一鍵全局文字與排版等比放大，百吋投影布幕最後一排清晰可見。
  * **手機端 52vh 零滑動佈局**：投票選項垂直均分可視區域，單手拿咖啡也能輕鬆點選。
  * **三段式節奏軟計時器**：90 秒交流時間，剩餘 30 秒轉黃、超時轉紅，溫和提示控時。
  * **即時未投同仁名單**：大螢幕即時顯示「已投票 X / Y 人（XX 仲未投票）」，協助主持人精準掌握活動節奏。
  * **全雙語即時切換**：繁體中文（地道廣東話口語引導）與 English（Professional Facilitation Tone）一鍵無縫切換（含 Form Placeholder）。
  * **PWA 支援**：支援手機端「加入主畫面」，享受無網址列全螢幕類原生體驗。

---

### 📂 目錄結構 (Repository Structure)
```text
.
├── index.html                  # 語義化 HTML5 骨架（含 SVG 插圖、合規折疊框、SEO/CSP 標頭）
├── README.md                   # 專案雙語核心說明文件
├── GOVERNANCE_AND_COMPLIANCE.md# 企業法規治理、AI 適用性排除及資料保護合規備忘錄
├── manifest.json               # PWA 應用設定檔（支援加入手機主畫面）
├── 2truths1lie192icon.png      # 192x192 簡約風桌面圖示
├── 2truths1lie512icon.png      # 512x512 高保真社交分享與啟動圖示
├── css/
│   └── style.css               # 企業級樣式表（投影 1200px、深色模式、安全區域適配）
└── js/
    ├── i18n.js                 # 雙語字典檔（全 Key 覆蓋，支援 Placeholder 動態替換）
    ├── p2p.js                  # WebRTC 冪等安全通訊層（多 STUN 池、斷線自癒）
    └── app.js                  # 狀態機、UI 路由、XSS 原生消毒與會話管理

```

---

### 🛠️ 快速部署（GitHub Pages）

1. 將本專案所有檔案推送至你的 GitHub 儲存庫（Repository）。
2. 進入專案的 **Settings** $\rightarrow$ **Pages**。
3. 在 **Branch** 選項中選擇 `main`（或 `master`），資料夾選擇 `/ (root)`，點擊 **Save**。
4. 等待 30 秒構建完成，即可透過 `https://<username>.github.io/<repo>/` 存取。

---

### 🎙️ 主持人現場操作指引

1. **開場前 10 分鐘**：
* 筆電接上會議室投影機與電源線，確保連線至內部 Wi-Fi。
* 使用 Chrome / Edge 開啟網頁，選填「活動主題（如：2026 Q1 新同事迎新會）」與「主持人稱呼」。
* 點擊「**我是主持人（電腦開房投屏）**」，大螢幕展開投影。
* 點擊右上角「**🖥️ 投影模式**」將字體擴展至 1200px 寬幅。


2. **開場報到（1–2 分鐘）**：
* 同事手機掃描大螢幕 QR Code 加入房間（可提示同事點選瀏覽器選單「加入主畫面」以獲全螢幕最佳體驗）。
* 參考大螢幕提詞板宣讀「30 秒安全契約」：「*可出題、可純猜、可旁聽。不想回答隨時說 Pass，嚴禁追問私隱！*」


3. **猜題與揭曉**：
* 點選名單卡片開題，手機端同步展開單手投票面板。
* 觀察進度條點名未投同仁，全員投畢後點擊「**揭曉答案**」展開故事分享。


4. **圓滿結束**：
* 點擊「**圓滿結束遊戲，產生現場回顧**」，大螢幕展示本場精彩亮點。
* 拍照留念後直接關閉分頁，所有私隱紀錄瞬間自動徹底銷毀。



---

## English

### 🌟 Project Overview

Designed specifically for **New Joiner Onboarding, Corporate Team Building, and Leadership Facilitation Workshops**, this application operates on an **ephemeral, database-free, zero-persistence WebRTC Peer-to-Peer (P2P)** architecture. Participant data resides strictly within the volatile browser memory (RAM) of connected devices, guaranteeing zero server footprints and total privacy eradication once the session is closed.

---

### 🛡️ Legal Compliance & Governance

Built in strict alignment with global data protection and technical governance standards:

1. **Hong Kong Personal Data (Privacy) Ordinance (Cap. 486 PDPO)**:
* **Data Minimisation (DPP 1)**: Collects only voluntary display names and 3 brief statements without requesting emails, phone numbers, or corporate credentials.
* **Zero Persistence (DPP 2)**: Ephemeral storage only. RAM data is purged instantly upon closing the browser tab, exceeding standard retention compliance.


2. **EU General Data Protection Regulation (GDPR)**:
* Full alignment with Art. 5(1)(c) (Data Minimisation) and Art. 5(1)(e) (Storage Limitation).
* Closing the browser tab automatically fulfills Art. 17 ("Right to Erasure").


3. **Information Security & Privacy Standards (ISO/IEC 27001 & 27701 Alignment)**:
* Peer-to-peer data channels are strictly encrypted via DTLS/SRTP end-to-end protocols with zero intermediate storage.
* Hardened with native DOM-based XSS sanitization, payload bounds checking, and restrictive Content Security Policy (CSP).


4. **AI Regulatory Scoping Verdict (EU AI Act & ISO/IEC 42001 Out-of-Scope)**:
* Explicitly operating on **deterministic logic**, this tool uses **zero AI/ML models, executes zero automated decisions, and never ingests personal data for training**, formally exempted from AI regulatory compliance frameworks.
* *For the full governance dossier, refer to [`GOVERNANCE_AND_COMPLIANCE.md`](https://www.google.com/search?q=GOVERNANCE_AND_COMPLIANCE.md).*



---

### 🚀 Key Technical & Facilitation Highlights

* **Serverless P2P Star Topology**: Powered by PeerJS, the facilitator's laptop acts as the local signaling coordinator (capped at 15 participants) with zero cloud infrastructure overhead.
* **Session Token Decoupling**:
* Decouples business identity (`clientToken`) from network identity (`PeerID`).
* When mobile screens sleep or lock, devices reconnect with dynamic PeerIDs under the same Token, **eliminating WebRTC `unavailable-id` race conditions**.


* **Idempotent Launch Guard**: Enforces single-execution locks on WebRTC client instantiations, preventing dual-socket ghost connections upon device wake-up.
* **Strict State Machine Lifecycle**:
* Round state (`currentRound`) is instantiated upon presenter selection and strictly nullified upon returning to lobby or session wrap-up, preventing stale round data from propagating to reconnecting clients.
* Reconnection priority: Existing participants reconnecting bypass full-room limits seamlessly.


* **Facilitation-First Design**:
* **🖥️ 1200px Presentation Mode**: Scales typography and container widths up to 1200px, ensuring high readability across large projection displays.
* **52vh Single-Hand Mobile UI**: Choices occupy 52vh of vertical viewport space without requiring page scroll.
* **3-Tier Soft Timer**: 90-second pacing bar transitions to amber at 30s and red at 0s for psychological comfort.
* **Live Voter Attendance Tracking**: Displays live vote tallies alongside names of pending voters for unobtrusive pacing control.
* **Bilingual Switcher**: Instant switching between Traditional Chinese (authentic Cantonese phrasing) and Professional Facilitation English (including dynamic form placeholder translations).
* **PWA Enabled**: Native "Add to Home Screen" support for standalone, distraction-free mobile web experiences.



---

### 📂 Repository Structure

```text
.
├── index.html                  # Semantic HTML5 skeleton (SVG hero, legal notice, SEO/CSP headers)
├── README.md                   # Bilingual project core documentation
├── GOVERNANCE_AND_COMPLIANCE.md# Formal Regulatory Governance & AI Exemption Dossier
├── manifest.json               # PWA configuration manifest for mobile installation
├── 2truths1lie192icon.png      # 192x192 Minimalist app icon
├── 2truths1lie512icon.png      # 512x512 High-fidelity social preview & splash icon
├── css/
│   └── style.css               # Responsive styling (Presentation mode, Dark mode, Safe-area insets)
└── js/
    ├── i18n.js                 # Bilingual dictionary supporting dynamic placeholder localization
    ├── p2p.js                  # WebRTC idempotent communication layer (multi-STUN pool, self-healing)
    └── app.js                  # State machine, routing, timers, native XSS escaping & session handling

```

---

### 🛠️ Quick Deployment (GitHub Pages)

1. Push all project files to your GitHub repository.
2. Navigate to **Settings** $\rightarrow$ **Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/(root)`, then click **Save**.
4. The application will be deployed and available at `https://<username>.github.io/<repo>/` within seconds.

---

### 🎙️ Facilitator Quick-Start Runbook

1. **T-10 Minutes (Setup)**:
* Connect laptop to the meeting room projector and power outlet; connect to corporate Wi-Fi.
* Open in Chrome/Edge, input the Event Title (e.g., `2026 Q1 New Joiner Onboarding`) and Facilitator Name.
* Click **"I'm Facilitator (Big Screen / Projector)"** to expand the lobby.
* Click top-right **"🖥️ Present Mode"** to scale up to 1200px.


2. **Kick-Off (1–2 Minutes)**:
* Attendees scan the big screen QR code using their smartphones (optionally tap "Add to Home Screen" for a full-screen view).
* Facilitator opens the 30s cheat sheet and contracts the psychological safety rules: *"Feel free to present, vote, or just listen. Pass whenever you want—no grilling!"*


3. **Rounds & Debriefing**:
* Click attendee cards to launch guessing rounds; participants cast votes on mobile.
* Monitor pending voter names on the big screen, then click **"Reveal Answer"** to hear the personal backstory.


4. **Wrap-Up & Clean Exit**:
* Click **"Wrap Up & View Session Summary"** for the session highlights.
* Take a group photo of the retrospective board, then close the browser tab to immediately and permanently destroy all data.



---

### 📄 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE). Engineered for corporate facilitators, HR leaders, and privacy-conscious organizations.




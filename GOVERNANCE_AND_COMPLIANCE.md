# 🏛️ 企業法規治理、AI 適用性排除及資料保護合規備忘錄
# Regulatory Governance, AI Scope Exemption & Data Protection Dossier

**文件編號 / Document Reference**: GOV-2026-P2P-001  
**生效日期 / Effective Date**: 2026-09-11  
**審查範圍 / Scope**: 兩真一假 破冰對話應用程式 (Two Truths & A Lie Web Application)  
**治理架構 / Framework Alignment**: 
- 香港《個人資料（私隱）條例》(Cap. 486 PDPO)
- 歐盟《通用資料保護條例》(EU GDPR 2016/679)
- 歐盟《人工智能法案》(EU AI Act, Regulation (EU) 2024/1689)
- ISO/IEC 27001:2022 (資訊安全管理系統 / ISMS)
- ISO/IEC 27701:2019 (私隱資訊管理系統 / PIMS)
- ISO/IEC 42001:2023 (人工智能管理系統 / AIMS - 邊界排除審查)

---

## 繁體中文 (Traditional Chinese)

### 1. 執行摘要 (Executive Summary)
本專案為企業內部培訓、迎新與團隊建設設計之點對點（P2P）即時互動系統。本文件旨在正式記錄本系統於「資料保護」、「資訊安全」及「新興技術法規（如 AI）」層面之適用性評估與工程防禦措施，為企業管理層、法務與外部稽核員提供具法律說服力之審查依據。

---

### 2. AI 監管適用性排除評估 (AI Exemption Assessment)
本專案經合規架構審查，**正式判定不屬於 AI 監管範疇，免受相關法規義務約束**：

| 法規 / 標準 | 評估標準 | 系統實際情況 | 合規判定 |
| :--- | :--- | :--- | :--- |
| **歐盟 EU AI Act** (Art. 3(1)) | 系統需具備不同程度之自主性，且能基於輸入進行「推斷（Infer）」以產生預測、內容或決策。 | 本系統純屬**確定性邏輯（Deterministic Logic）**之 WebRTC 通訊轉發，不含任何推論引擎。 | **完全不適用 (Out of Scope)** |
| **ISO/IEC 42001:2023** | 組織內建立、實施或使用 AI 系統之管理框架。 | 系統生命週期中**無機器學習、無演算法調用、無模型權重、無資料探勘**。 | **不適用 (Not Applicable)** |
| **國家網信辦《生成式 AI 服務管理暫行辦法》** | 規範面向公眾生成文本、圖片等內容之生成式技術。 | 本系統不生成內容，僅作為同仁文字之即時加密通道。 | **完全不適用 (Out of Scope)** |

> **專業治理結論**：對本系統強加 AI 評估或標註屬於「過度合規（Over-compliance）」之無效開銷。本系統明確自我宣告：**零 AI 組件、零演算法決策、零模型訓練調用**。

---

### 3. 資料保護與私隱合規矩陣 (Data Privacy Dossier)
本系統嚴格執行 **從設計著手保護私隱（Privacy by Design, PbD）**，全面符合全球最高私隱標準：

#### A. 香港《個人資料（私隱）條例》(Cap. 486 PDPO)
* **DPP 1 (收集目的與合法性)**：僅收集同仁自願提供之暱稱與生活經歷，用途限定於現場破冰，不索取身份證、電話或公司帳號。
* **DPP 2 (準確性與留存期限)**：**實施零持久化（Zero-Persistence）架構**。所有數據僅在主持人與學員設備的揮發性記憶體（RAM）內暫存，分頁關閉瞬間物理蒸發，無磁碟存檔，超越法規留存要求。
* **DPP 3 (資料使用)**：現場產生、現場消費，絕無轉售、再利用或次級使用。
* **DPP 4 (資料保安)**：WebRTC 底層強制透過 DTLS（數據報傳輸層安全）及 SRTP 進行端到端傳輸加密，內網無法監聽明文。
* **DPP 5 (公開政策)**：系統於入口頁面提供透明之《私隱與架構聲明》。
* **DPP 6 (查閱與更正)**：參與者可於提交前隨意修改，活動結束後所有數據已自動銷毀，不再存在留存個人資料。

#### B. 歐盟通用資料保護條例 (EU GDPR)
* **資料最小化 (Art. 5(1)(c))**：不索取任何非業務必要資料。
* **儲存限制原則 (Art. 5(1)(e))**：生命週期等於活動時間（Session Lifetime），結束即銷毀。
* **被遺忘權 (Art. 17)**：關閉網頁即自動且不可逆地履行被遺忘權。
* **跨境傳輸與外部處理者 (Third-Party Processors)**：
  * PeerJS 官方雲端信令伺服器僅短暫協調 SDP/ICE 候選地址（NAT 穿透握手），不經手且不存儲任何應用層個人資料（Payloads）。

---

### 4. 資訊安全架構實踐 (ISO/IEC 27001:2022 Controls Alignment)
* **A.8.20 網絡安全**：不依賴自建伺服器，無伺服器被黑客攻擊入侵之風險（Zero Server Attack Surface）。
* **A.8.24 密碼技術的使用**：強制 WebRTC 點對點 DTLS-SRTP 加密通道。
* **A.8.28 安全編碼原則**：
  * 實施嚴格之 **Content Security Policy (CSP)** 標頭防禦。
  * 原生防護 DOM-based XSS 攻擊，所有文字皆經過字符轉義與截斷處理。
  * 設置輸入字元上限（防止記憶體耗盡 DoS 攻擊）。

---

## English

### 1. Executive Summary
This application is a peer-to-peer (P2P) synchronous interactive system designed exclusively for corporate onboarding, executive facilitation, and team workshops. This document formally establishes the legal and architectural compliance boundaries across Data Privacy, Information Security, and Emerging AI Regulations, serving as an audit-ready compliance dossier for corporate stakeholders, Legal counsel, and Data Protection Officers (DPOs).

---

### 2. AI Regulatory Exemption & Scoping Memorandum
Following a thorough regulatory scoping exercise, this application is **formally classified as an Exempt, Non-AI System**:

| Regulation / Standard | Criteria / Threshold | Actual System Implementation | Scoping Verdict |
| :--- | :--- | :--- | :--- |
| **EU AI Act** (Reg. 2024/1689, Art. 3(1)) | Systems with varying autonomy that infer from inputs to generate outputs (content, predictions, decisions). | Pure **deterministic, rule-based WebRTC signaling** without automated inference capabilities. | **Exempt / Out of Scope** |
| **ISO/IEC 42001:2023** | Management framework for AI development, provisioning, and internal deployment. | **Zero machine learning, zero algorithmic processing, zero training datasets, zero inference calls.** | **Not Applicable** |
| **OECD AI Principles** | Autonomous systems producing recommendations or decisions influencing environments. | Passive transport layer facilitating human-to-human corporate storytelling. | **Exempt / Out of Scope** |

> **Governance Finding**: Applying AI impact assessments or ISO 42001 controls to this deterministic tool constitutes redundant compliance. The system explicitly certifies: **No AI components, no algorithmic profiling, and zero model training ingestion.**

---

### 3. Data Privacy & Protection Compliance Matrix

#### A. Hong Kong Personal Data (Privacy) Ordinance (PDPO, Cap. 486)
* **DPP 1 (Purpose & Manner)**: Data collection is strictly limited to voluntary display names and 3 brief personal narratives. No HKID, corporate credentials, or contact vectors are requested.
* **DPP 2 (Retention & Accuracy)**: **Engineered on a Zero-Persistence Architecture**. All participant statements reside exclusively within volatile client-side RAM and evaporate permanently upon tab termination.
* **DPP 3 (Use of Data)**: Strictly ephemeral and consumed intra-session. Zero secondary profiling or commercial reuse.
* **DPP 4 (Data Security)**: Fully encrypted over WebRTC via Datagram Transport Layer Security (DTLS) and SRTP. Zero unencrypted in-transit exposures across local intranets.
* **DPP 5 (Openness & Transparency)**: Prominent, bilingual Privacy & Architecture notice embedded on the landing portal.
* **DPP 6 (Access & Correction)**: Users maintain full autonomy to edit statements prior to submission; data is completely eradicated post-event.

#### B. EU General Data Protection Regulation (GDPR)
* **Data Minimisation (Art. 5(1)(c))**: Proportional and non-excessive data gathering.
* **Storage Limitation (Art. 5(1)(e))**: Storage duration strictly equals session runtime.
* **Right to Erasure (Art. 17)**: Automatically executed upon browser session closure.
* **Signaling & Third-Party Processors**: Public STUN/Signaling relays act strictly as transient connection brokers (SDP exchange); zero application payload data is ingested or stored.

---

### 4. Information Security Governance (ISO/IEC 27001:2022 Controls)
* **Control A.8.20 (Network Security)**: Elimination of persistent centralized databases, nullifying database breach and SQL injection vectors.
* **Control A.8.24 (Cryptography)**: Native enforcement of DTLS-SRTP cryptographic tunneling for browser-to-browser payloads.
* **Control A.8.28 (Secure Coding)**:
  * Strict Content Security Policy (CSP) mitigating cross-site scripting and unauthorized data exfiltration.
  * Native escaping of all user-generated strings, neutralizing DOM-based XSS vectors.
  * Field-level payload truncation preventing buffer saturation and denial-of-service attempts.



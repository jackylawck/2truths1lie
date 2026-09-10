/* =========================================================================
 * 🌐 i18n.js - 中英文雙語字典（全功能鍵值完整對齊版）
 * ========================================================================= */
const I18N_DICT = {
  zh: {
    // 頂部與全域
    app_title: "兩真一假 破冰對話",
    net_badge_standalone: "純內聯無存檔",
    btn_presentation_on: "🖥️ 投影模式",
    btn_presentation_off: "🖥️ 退出投影",

    // 入口選單 (Landing)
    landing_desc: "今日想以咩角色加入？",
    host_note_title: "💻 主持人注意：",
    host_note_desc: "請務必使用電腦（Chrome / Edge）開房投屏！嚴禁用手機當 Host，以免過熱卡頓。",
    lbl_setup_title: "活動主題 / 班別（選填）：",
    lbl_setup_host: "主持人稱呼（選填）：",
    ph_setup_title: "例如：2026 Q1 新同事迎新會",
    ph_setup_host: "例如：Jacky",
    btn_as_host: "我是主持人（電腦開房投屏）",
    btn_as_player: "我是參與者（手機掃碼）",

    // 主持人大廳 (Host Lobby)
    host_notice: "⚠️ 主持人注意事項： 請勿重新整理或關閉此分頁！筆電請接上電源線，並確保全體成員連上同一個會議室 Wi-Fi。",
    default_activity_title: "團隊破冰對話",
    txt_host_prefix: "現場主持：",
    txt_room_id: "房號",
    txt_qr_hint: "手機掃碼或輸入 8 位數連線（上限 15 人）",
    guide_summary: "🎙️ 主持人引導提詞板（30秒開場契約）",
    guide_script_opening: "「今日純粹認識彼此有趣嘅一面。規則：2 真 1 假。可出題、可純猜、可旁聽。唔想答隨時講 Pass，嚴禁追問私隱！」",
    lbl_player_roster: "已就緒名單（點擊名字開題）：",
    txt_online: "在線人數",
    txt_waiting_submissions: "⏳ 等緊大家寫低你嘅 2 真 1 假...",
    btn_wrap_up: "🎉 圓滿結束遊戲，產生現場回顧",
    txt_chip_ready: "已就緒 💬",

    // 遊戲展示 (Game Presenting)
    badge_guessing: "當前環節：估下邊句係假話",
    txt_sharing_suffix: "嘅個人分享",
    lbl_chat_time: "提問交流時間（建議 90 秒）",
    btn_reveal: "揭曉答案",
    btn_next_person: "下一位主角",
    lbl_story_title: "背後故事分享：",
    lbl_voted_progress: "已投票：",
    lbl_unit_people: "人",
    txt_all_voted: "🎉 全員已投票完畢！隨時可以揭曉",
    txt_pending_suffix: "仲未投票",

    // 參與者端：加入 (Join)
    title_join_room: "加入迎新房間",
    lbl_room_code: "房間代碼（8 位數）：",
    ph_room_code: "例如：12345678",
    lbl_nickname: "你嘅稱呼：",
    ph_nickname: "例如：Alex / 詠思",
    btn_join: "連線進入",
    btn_joining: "連線中，請稍候...",

    // 參與者端：出題 (Write)
    badge_write_truths: "填寫你嘅 2 真 1 假",
    txt_tips_title: "💡 填寫小提示（隨心分享，唔使太嚴肅）：",
    tip_food: "飲食怪癖：完全唔飲奶茶、食叉燒飯一定要加辣椒油...",
    tip_exp: "特別經歷：讀書考過潛水牌、喺街度撞過發哥影合照...",
    tip_lie: "假話靈感：可以寫一個你好想做但未做過嘅願望（例如：想去太空旅行、想學滑雪）！",
    lbl_stmt_1: "敘述 1：",
    ph_stmt_1: "例如：我完全唔識游水 / 我曾經見過發哥合照",
    lbl_stmt_2: "敘述 2：",
    ph_stmt_2: "例如：我每日一定要飲兩杯美式黑咖啡",
    lbl_stmt_3: "敘述 3：",
    ph_stmt_3: "例如：我細個學過 8 年芭蕾舞",
    lbl_select_lie: "邊一句係【假話】？",
    opt_lie_prompt: "-- 請選擇邊一句係假話 --",
    opt_lie_1: "敘述 1 係假話 ❌",
    opt_lie_2: "敘述 2 係假話 ❌",
    opt_lie_3: "敘述 3 係假話 ❌",
    lbl_story_desc: "背後故事（揭曉時分享真話／點解會咁寫）：",
    ph_story: "例如：點解會作出呢個假話？或者嗰兩件真事背後有咩好笑嘅細節？",
    btn_submit: "提交題目",

    // 參與者端：投票 (Vote)
    txt_submit_success: "✅ 已成功連線！",
    txt_wait_host_select: "等待主持人點擊大螢幕名單開始...",
    lbl_target_person: "當前主角",
    txt_vote_recorded: "已記錄投票！請睇大螢幕揭曉...",

    // 現場總結與回顧 (Summary)
    badge_summary: "現場破冰總結",
    txt_summary_suffix: "— 精彩回顧",
    closing_welcome: "✨ 再次熱烈歡迎大家加入團隊！多謝今日每一位真誠又精彩嘅分享。<br>大家已經成功打破第一道隔閡，下週不妨搵同你最有共通點嘅同事飲杯咖啡，延續呢份默契！☕",
    closing_general: "✨ 多謝大家今日嘅真誠分享！希望大家發現咗身邊隊友有趣、意想不到嘅另一面。<br>下週不妨搵同你最有共通點嘅同事飲杯咖啡，延續呢份連結！☕",
    privacy_note: "🔒 私隱保障：本系統不設伺服器資料庫，此頁面關閉或重新整理後所有紀錄會自動銷毀。",
    lbl_fooled_prefix: "🎭 成功騙過",
    lbl_votes_suffix: "票",
    lbl_the_lie_is: "❌ 假話是：第 #",
    lbl_item_suffix: " 項",
    lbl_no_records: "無特別說明",

    // 系統提示、彈窗與防呆
    confirm_end_activity: "確定要結束本場活動嗎？結束後將產生現場總結，當前房間將無法繼續投票。",
    err_fill_all: "請填妥 3 句陳述！",
    err_select_lie: "請明確選擇邊一句係【假話】！",
    err_room_id: "請輸入 8 位數房號與姓名！",
    alert_room_full: "⚠️ 房間已達 15 人上限！請直接在大螢幕共同觀戰。",
    alert_disconnected: "⚠️ 與主持人連線已中斷（可能主持人已關閉頁面）。",
    alert_not_found: "找不到房號，請確認主持人已在電腦大螢幕開房！",
    alert_ended: "🎉 本場破冰已圓滿結束！請睇大螢幕精彩回顧。"
  },

  en: {
    // Top & Global
    app_title: "Two Truths & A Lie",
    net_badge_standalone: "Ephemeral P2P",
    btn_presentation_on: "🖥️ Present Mode",
    btn_presentation_off: "🖥️ Exit Present",

    // Landing
    landing_desc: "How would you like to join today?",
    host_note_title: "💻 Facilitator Note:",
    host_note_desc: "Please host on a Laptop (Chrome / Edge)! Avoid hosting on mobile devices to prevent overheating and latency.",
    lbl_setup_title: "Event Title / Cohort (Optional):",
    lbl_setup_host: "Facilitator Name (Optional):",
    ph_setup_title: "e.g., 2026 Q1 New Joiner Onboarding",
    ph_setup_host: "e.g., Jacky",
    btn_as_host: "I'm Facilitator (Big Screen / Projector)",
    btn_as_player: "I'm Participant (Mobile Scan)",

    // Host Lobby
    host_notice: "⚠️ Facilitator Note: Do not refresh or close this tab! Keep the laptop plugged in, and ensure all participants are on the same Wi-Fi network.",
    default_activity_title: "Team Icebreaker Session",
    txt_host_prefix: "Facilitated by: ",
    txt_room_id: "Room ID",
    txt_qr_hint: "Scan QR code or enter 8-digit code (Max 15 participants)",
    guide_summary: "🎙️ Facilitator Opening Script (30-sec Ground Rules)",
    guide_script_opening: "\"Today is purely about discovering unexpected, fun facets of each other. 2 Truths, 1 Lie. Feel free to present, vote, or just listen. Pass whenever you want—no grilling!\"",
    lbl_player_roster: "Ready Roster (Click name to start):",
    txt_online: "Online",
    txt_waiting_submissions: "⏳ Waiting for participants to craft their 2 Truths & 1 Lie...",
    btn_wrap_up: "🎉 Wrap Up & View Session Summary",
    txt_chip_ready: "Ready 💬",

    // Game Presenting
    badge_guessing: "Guessing Round: Spot the Lie",
    txt_sharing_suffix: "'s Profile",
    lbl_chat_time: "Q&A & Discussion Time (Suggested 90s)",
    btn_reveal: "Reveal Answer",
    btn_next_person: "Next Presenter",
    lbl_story_title: "The Backstory:",
    lbl_voted_progress: "Votes Cast: ",
    lbl_unit_people: "participants",
    txt_all_voted: "🎉 Everyone has voted! Ready to reveal",
    txt_pending_suffix: "haven't voted yet",

    // Participant: Join
    title_join_room: "Join Icebreaker",
    lbl_room_code: "Room Code (8 digits):",
    ph_room_code: "e.g., 12345678",
    lbl_nickname: "Your Name / Nickname:",
    ph_nickname: "e.g., Alex",
    btn_join: "Connect",
    btn_joining: "Connecting, please wait...",

    // Participant: Write
    badge_write_truths: "Write Your 2 Truths & 1 Lie",
    txt_tips_title: "💡 Brainstorming Seeds (Keep it casual!):",
    tip_food: "Food quirks: Never drink milk tea, must add chili oil to everything...",
    tip_exp: "Unusual past: Certified scuba diver in college, took a selfie with a celebrity...",
    tip_lie: "Lie inspiration: Write a bucket-list dream you haven't done yet (e.g., space travel, learn to ski)!",
    lbl_stmt_1: "Statement 1:",
    ph_stmt_1: "e.g., I cannot swim at all / I once met a movie star",
    lbl_stmt_2: "Statement 2:",
    ph_stmt_2: "e.g., I drink two cups of black coffee every day",
    lbl_stmt_3: "Statement 3:",
    ph_stmt_3: "e.g., I practiced ballet for 8 years as a child",
    lbl_select_lie: "Which statement is the LIE?",
    opt_lie_prompt: "-- Select which one is false --",
    opt_lie_1: "Statement 1 is the Lie ❌",
    opt_lie_2: "Statement 2 is the Lie ❌",
    opt_lie_3: "Statement 3 is the Lie ❌",
    lbl_story_desc: "The Backstory (Shared upon reveal):",
    ph_story: "e.g., Why did you fabricate this lie? Or what is the hilarious context behind the truths?",
    btn_submit: "Submit Statements",

    // Participant: Vote
    txt_submit_success: "✅ Connected & Ready!",
    txt_wait_host_select: "Waiting for facilitator to pick a name on the big screen...",
    lbl_target_person: "Current Presenter",
    txt_vote_recorded: "Vote recorded! Watch the big screen...",

    // Summary
    badge_summary: "Live Icebreaker Summary",
    txt_summary_suffix: "— Highlights",
    closing_welcome: "✨ A warm welcome to the team! Thank you all for your authentic and delightful stories.<br>The first ice has been broken—grab a coffee with someone you found an unexpected commonality with next week! ☕",
    closing_general: "✨ Thank you everyone for sharing so authentically today! We hope you discovered delightful, unexpected sides of your teammates.<br>Grab a coffee next week to keep the connection going! ☕",
    privacy_note: "🔒 Privacy Guard: Zero server footprint. All records evaporate permanently once this window is closed or refreshed.",
    lbl_fooled_prefix: "🎭 Fooled",
    lbl_votes_suffix: "votes",
    lbl_the_lie_is: "❌ The Lie is: #",
    lbl_item_suffix: "",
    lbl_no_records: "No context provided",

    // Alerts
    confirm_end_activity: "Are you sure you want to wrap up this session? This will finalize the summary and voting will be closed.",
    err_fill_all: "Please fill in all 3 statements!",
    err_select_lie: "Please specify which statement is the LIE!",
    err_room_id: "Please enter an 8-digit Room ID and your name!",
    alert_room_full: "⚠️ Room has reached its 15-participant limit! Please enjoy the session on the big screen.",
    alert_disconnected: "⚠️ Lost connection with facilitator (the host tab may have been closed).",
    alert_not_found: "Room not found. Please ensure the facilitator has opened the room on the projector screen!",
    alert_ended: "🎉 Session wrapped up! Check the big screen for the highlights."
  }
};

let currentLang = 'zh';

function setLanguage(lang) {
  currentLang = lang;

  // 1. 文字替換
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (I18N_DICT[lang] && I18N_DICT[lang][key]) {
      el.innerText = I18N_DICT[lang][key];
    }
  });

  // 2. 表單 Placeholder 動態替換
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (I18N_DICT[lang] && I18N_DICT[lang][key]) {
      el.setAttribute('placeholder', I18N_DICT[lang][key]);
    }
  });

  // 3. 投影模式切換按鈕文字同步
  const presBtn = document.getElementById('btn-presentation');
  if (presBtn) {
    const isPres = document.body.classList.contains('presentation-mode');
    presBtn.innerText = isPres ? I18N_DICT[lang].btn_presentation_off : I18N_DICT[lang].btn_presentation_on;
  }

  // 4. 切換語言標籤
  const langBtn = document.getElementById('lang-switch-btn');
  if (langBtn) {
    langBtn.innerText = lang === 'zh' ? 'EN' : '繁中';
  }
}

function toggleLanguage() {
  setLanguage(currentLang === 'zh' ? 'en' : 'zh');
}

function t(key) {
  return (I18N_DICT[currentLang] && I18N_DICT[currentLang][key]) || key;
}

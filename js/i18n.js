/* =========================================================================
 * 🌐 i18n.js - 中英文雙語字典
 * ========================================================================= */
const I18N_DICT = {
  zh: {
    app_title: "兩真一假 破冰對話",
    landing_desc: "請選擇您的角色進入遊戲：",
    btn_as_host: "我是主持人（大螢幕 / 投屏）",
    btn_as_player: "我是參與者（手機端）",
    badge_host_lobby: "HOST 大螢幕大廳",
    txt_room_id: "房號",
    txt_qr_hint: "手機掃碼或輸入 8 位數即可連線",
    lbl_player_roster: "已就緒名單（點擊名字開始）：",
    txt_online: "在線",
    txt_waiting_submissions: "⏳ 等待大家進入或提交「2真1假」...",
    badge_guessing: "當前環節：猜猜誰是假話",
    txt_sharing_suffix: "的個人分享",
    lbl_chat_time: "提問交流時間 (建議 90s)",
    btn_reveal: "揭曉答案 (Tick & Cross)",
    btn_next_person: "返回名單大廳（下一位）",
    lbl_story_title: "背後故事分享：",
    debrief_title: "💬 主持人隨機銜接（挑一題聊聊）：",
    title_join_room: "加入迎新房間",
    lbl_room_code: "房間代碼 (8 位數)：",
    lbl_nickname: "你的名字 / 稱呼：",
    lbl_join_mode: "今日參與方式：",
    opt_mode_full: "🌟 我想出題並參與投票",
    opt_mode_listen: "👂 我只想旁聽放鬆（純觀眾）",
    btn_join: "連線進入",
    badge_write_truths: "填寫你的 2 真 1 假",
    txt_tips_title: "💡 出題小提示（越猜不到越有趣！）：",
    txt_tip_truth: "真話：看似假但千真萬確的奇特經歷",
    txt_tip_lie: "假話：聽起來很真實且合理的日常習慣",
    lbl_stmt_1: "敘述 1：",
    lbl_stmt_2: "敘述 2：",
    lbl_stmt_3: "敘述 3：",
    lbl_select_lie: "哪一句是【假話】？",
    opt_lie_1: "敘述 1 是假話 ❌",
    opt_lie_2: "敘述 2 是假話 ❌",
    opt_lie_3: "敘述 3 是假話 ❌",
    lbl_story_desc: "背後故事（揭曉時同大家分享）：",
    btn_submit: "提交至房間保險箱",
    txt_submit_success: "✅ 已連線就緒！",
    txt_wait_host_select: "等待主持人點擊大螢幕名單開始猜謎...",
    badge_voting_active: "正在猜謎",
    lbl_target_person: "當前主角",
    txt_vote_which_lie: "哪一句才是假話？點擊投票：",
    txt_vote_recorded: "已記錄投票！請看大螢幕揭曉...",
    btn_wrap_up: "🎉 圓滿結束遊戲，產生永久總結回顧",
    guide_summary: "🎙️ 主持人引導提詞板（點擊展開 30 秒腳本與安全契約）",
    guide_script_opening: "「今天我們純粹認識彼此有趣的一面。規則很簡單：2 真 1 假。大家可以自由選擇出題、只猜不說，或者只當聽眾。不想回答隨時說『Pass』，嚴禁查家宅！」",
    guide_script_icebreak: "「大家如果猶豫，建議先挑一個你最直覺『不可能』的敘述，問他細節是哪一年發生的！」",
    debrief_q1: "剛才哪個故事讓你最意外？",
    debrief_q2: "有沒有發現誰和你有意想不到的共通點？",
    txt_truth_badge: "✔️ 真話",
    txt_lie_badge: "❌ 假話",
    err_fill_all: "請填妥 3 句陳述！",
    err_room_id: "請輸入 8 位數房號與姓名！"
  },
  en: {
    app_title: "Two Truths & A Lie",
    landing_desc: "Select your role to get started:",
    btn_as_host: "Host (Big Screen / Projector)",
    btn_as_player: "Participant (Mobile Entry & Vote)",
    badge_host_lobby: "HOST Big Screen Lobby",
    txt_room_id: "Room ID",
    txt_qr_hint: "Scan QR or enter 8-digit code on mobile",
    lbl_player_roster: "Ready Roster (Click to start):",
    txt_online: "Online",
    txt_waiting_submissions: "⏳ Waiting for participants to submit...",
    badge_guessing: "Guessing Round",
    txt_sharing_suffix: "'s Profile",
    lbl_chat_time: "Q&A Time (Recommended 90s)",
    btn_reveal: "Reveal Answer (Tick & Cross)",
    btn_next_person: "Back to Lobby (Next)",
    lbl_story_title: "The Backstory:",
    debrief_title: "💬 Facilitator Debrief Seeds:",
    title_join_room: "Join Icebreaker",
    lbl_room_code: "8-digit Room Code:",
    lbl_nickname: "Your Name / Nickname:",
    lbl_join_mode: "Participation Mode:",
    opt_mode_full: "🌟 Submit My Own & Vote",
    opt_mode_listen: "👂 Spectator / Listener Only",
    btn_join: "Connect",
    badge_write_truths: "Write Your 2 Truths & 1 Lie",
    txt_tips_title: "💡 Tips (The more unexpected, the better!):",
    txt_tip_truth: "Truth: Strange but 100% real experiences",
    txt_tip_lie: "Lie: Sounds completely plausible and routine",
    lbl_stmt_1: "Statement 1:",
    lbl_stmt_2: "Statement 2:",
    lbl_stmt_3: "Statement 3:",
    lbl_select_lie: "Which one is the LIE?",
    opt_lie_1: "Statement 1 is the Lie ❌",
    opt_lie_2: "Statement 2 is the Lie ❌",
    opt_lie_3: "Statement 3 is the Lie ❌",
    lbl_story_desc: "Backstory (shared upon reveal):",
    btn_submit: "Submit to Room Vault",
    txt_submit_success: "✅ Ready & Connected!",
    txt_wait_host_select: "Waiting for host to pick a person...",
    badge_voting_active: "Voting Round",
    lbl_target_person: "Current Presenter",
    txt_vote_which_lie: "Which statement is false? Tap to vote:",
    txt_vote_recorded: "Vote recorded! Watch the big screen...",
    btn_wrap_up: "🎉 Finish Game & Generate Permanent Summary",
    guide_summary: "🎙️ Host Cheat Sheet (Click to view 30s opening script & ground rules)",
    guide_script_opening: "\"Today is purely about discovering unexpected facets of each other. 2 Truths, 1 Lie. Feel free to present, vote-only, or just listen. Pass whenever you want!\"",
    guide_script_icebreak: "\"If you're unsure, pick the statement that feels the most improbable and ask for specific details!\"",
    debrief_q1: "Which story surprised you the most?",
    debrief_q2: "Did anyone discover an unexpected commonality?",
    txt_truth_badge: "✔️ TRUTH",
    txt_lie_badge: "❌ LIE",
    err_fill_all: "Please fill in all 3 statements!",
    err_room_id: "Please enter a valid 8-digit Room ID and your name!"
  }
};

let currentLang = 'zh';

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N_DICT[lang] && I18N_DICT[lang][key]) {
      el.innerText = I18N_DICT[lang][key];
    }
  });
  const btn = document.getElementById('lang-switch-btn');
  if (btn) btn.innerText = lang === 'zh' ? 'EN' : '繁中';
}

function toggleLanguage() {
  setLanguage(currentLang === 'zh' ? 'en' : 'zh');
}

function t(key) {
  return (I18N_DICT[currentLang] && I18N_DICT[currentLang][key]) || key;
}

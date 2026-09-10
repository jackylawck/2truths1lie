-- =========================================================================
-- 🛡️ 兩真一假破冰系統 - Production Ready SQL Schema
-- 冪等設計：可重複執行，自動清理舊結構
-- =========================================================================

-- 0. 清理舊結構
DROP TRIGGER IF EXISTS trg_vote_increment ON public.votes;
DROP TRIGGER IF EXISTS trg_vote_rate_limit ON public.votes;
DROP TRIGGER IF EXISTS trg_sync_submission ON public.submissions;
DROP TRIGGER IF EXISTS trg_summary_expiry ON public.summaries;

DROP FUNCTION IF EXISTS public.increment_vote_count() CASCADE;
DROP FUNCTION IF EXISTS public.check_vote_rate_limit() CASCADE;
DROP FUNCTION IF EXISTS public.sync_member_submission_status() CASCADE;
DROP FUNCTION IF EXISTS public.claim_host_atomic(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.host_start_round_atomic(TEXT, UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS public.archive_and_end_room(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.set_summary_expiry() CASCADE;

DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TYPE IF EXISTS public.room_status CASCADE;

-- 1. 類型定義
CREATE TYPE public.room_status AS ENUM ('idle', 'presenting', 'revealed', 'ended');

-- 2. rooms 表（權威狀態）
CREATE TABLE public.rooms (
    id                    TEXT PRIMARY KEY,
    host_id               UUID NOT NULL,
    status                public.room_status DEFAULT 'idle' NOT NULL,
    round_counter         INT DEFAULT 0 NOT NULL,
    current_presenter     TEXT DEFAULT '',
    current_presenter_id  UUID DEFAULT NULL,
    statements            JSONB DEFAULT '[]'::jsonb,
    lie_index             INT DEFAULT -1,
    story                 TEXT DEFAULT '',
    vote_summary          JSONB DEFAULT '{"0":0, "1":0, "2":0}'::jsonb,
    host_last_seen        TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at              TIMESTAMPTZ DEFAULT NULL,
    updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. room_members 表（Presence 在線狀態）
CREATE TABLE public.room_members (
    room_id        TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL,
    display_name   TEXT NOT NULL,
    role           TEXT DEFAULT 'player' CHECK (role IN ('host', 'co-host', 'player', 'spectator')),
    has_submitted  BOOLEAN DEFAULT false NOT NULL,
    last_seen      TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT check_display_name_len CHECK (char_length(display_name) <= 50)
);

-- 4. submissions 表（私密題目保險箱）
CREATE TABLE public.submissions (
    id             BIGSERIAL PRIMARY KEY,
    room_id        TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL,
    display_name   TEXT NOT NULL,
    statements     JSONB NOT NULL,
    lie_index      INT NOT NULL CHECK (lie_index IN (0, 1, 2)),
    story          TEXT DEFAULT '',
    round_counter  INT DEFAULT NULL,
    submitted_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT check_statements_len CHECK (jsonb_array_length(statements) = 3),
    UNIQUE (room_id, user_id)
);

-- 5. votes 表（投票紀錄）
CREATE TABLE public.votes (
    room_id        TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
    round_counter  INT NOT NULL,
    voter_id       UUID NOT NULL,
    choice         INT NOT NULL CHECK (choice IN (0, 1, 2)),
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (room_id, round_counter, voter_id)
);

-- 6. summaries 表（活動永久快照）
CREATE TABLE public.summaries (
    id             TEXT PRIMARY KEY,
    room_id        TEXT NOT NULL,
    host_name      TEXT DEFAULT '主持人',
    summary_data   JSONB NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. 索引優化
CREATE INDEX IF NOT EXISTS idx_submissions_room_round ON public.submissions(room_id, round_counter);
CREATE INDEX IF NOT EXISTS idx_votes_room_round ON public.votes(room_id, round_counter);
CREATE INDEX IF NOT EXISTS idx_room_members_last_seen ON public.room_members(room_id, last_seen);
CREATE INDEX IF NOT EXISTS idx_summaries_expires ON public.summaries(expires_at);

-- 8. 觸發器函數
-- 8.1 O(1) 增量票數聚合
CREATE OR REPLACE FUNCTION public.increment_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.rooms
    SET vote_summary = jsonb_set(
            vote_summary,
            ARRAY[NEW.choice::text],
            (COALESCE((vote_summary->>NEW.choice::text)::int, 0) + 1)::text::jsonb
        ),
        updated_at = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vote_increment
AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.increment_vote_count();

-- 8.2 投票速率限制 (房間隔離防刷)
CREATE OR REPLACE FUNCTION public.check_vote_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (
        SELECT COUNT(*) FROM public.votes
        WHERE voter_id = NEW.voter_id
          AND room_id = NEW.room_id
          AND created_at > now() - interval '1 minute'
    ) >= 15 THEN
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vote_rate_limit
BEFORE INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.check_vote_rate_limit();

-- 8.3 題目提交同步 Presence 狀態
CREATE OR REPLACE FUNCTION public.sync_member_submission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.room_members
    SET has_submitted = true, last_seen = now()
    WHERE room_id = NEW.room_id AND user_id = NEW.user_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_submission
AFTER INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.sync_member_submission_status();

-- 8.4 summaries 動態到期觸發器 (+90天)
CREATE OR REPLACE FUNCTION public.set_summary_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := now() + interval '90 days';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_summary_expiry
BEFORE INSERT ON public.summaries
FOR EACH ROW EXECUTE FUNCTION public.set_summary_expiry();

-- 9. RLS 啟用
ALTER TABLE public.rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries    ENABLE ROW LEVEL SECURITY;

-- 10. RLS 政策
-- 10.1 rooms
CREATE POLICY "Public Read Rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Host Insert Rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host Update Rooms" ON public.rooms FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host Delete Rooms" ON public.rooms FOR DELETE USING (auth.uid() = host_id);

-- 10.2 room_members
CREATE POLICY "Public Read Members" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "User Insert Own Member" ON public.room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User Update Own Member" ON public.room_members FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10.3 submissions (嚴密隔離)
CREATE POLICY "Host Read All Submissions" ON public.submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rooms WHERE id = submissions.room_id AND host_id = auth.uid())
);
CREATE POLICY "User Read Own Submission" ON public.submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User Insert Own Submission" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User Update Own Submission" ON public.submissions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User Delete Own Submission" ON public.submissions FOR DELETE USING (auth.uid() = user_id);

-- 10.4 votes
CREATE POLICY "Public Read Votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "User Cast Own Vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- 10.5 summaries
CREATE POLICY "Public Read Summaries" ON public.summaries FOR SELECT USING (expires_at IS NULL OR expires_at > now());
CREATE POLICY "Host Insert Summary" ON public.summaries FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms WHERE id = summaries.room_id AND host_id = auth.uid())
);

-- 11. 原子化 RPC 函數
-- 11.1 主持人無競態搶佔 (CAS)
CREATE OR REPLACE FUNCTION public.claim_host_atomic(p_room_id TEXT, p_caller_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated INT;
    v_current_host UUID;
BEGIN
    UPDATE public.rooms
    SET host_id = p_caller_id,
        host_last_seen = now(),
        updated_at = now()
    WHERE id = p_room_id
      AND host_last_seen < now() - interval '45 seconds'
      AND status != 'ended'
      AND EXISTS (
          SELECT 1 FROM public.room_members
          WHERE room_id = p_room_id AND user_id = p_caller_id AND role IN ('co-host', 'player')
      );

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated > 0 THEN
        UPDATE public.room_members
        SET role = 'host', last_seen = now()
        WHERE room_id = p_room_id AND user_id = p_caller_id;

        RETURN jsonb_build_object('success', true, 'message', 'CLAIMED');
    ELSE
        SELECT host_id INTO v_current_host FROM public.rooms WHERE id = p_room_id;
        RETURN jsonb_build_object('success', false, 'message', 'LOCKED_OR_ACTIVE', 'current_host', v_current_host);
    END IF;
END;
$$;

-- 11.2 原子化開題 (解除 RLS 死鎖)
CREATE OR REPLACE FUNCTION public.host_start_round_atomic(
    p_room_id TEXT,
    p_presenter_id UUID,
    p_next_round INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_host_id UUID;
    v_sub RECORD;
BEGIN
    SELECT host_id INTO v_host_id FROM public.rooms WHERE id = p_room_id;
    IF v_host_id IS NULL THEN
        RAISE EXCEPTION 'ROOM_NOT_FOUND';
    END IF;
    IF v_host_id != auth.uid() THEN
        RAISE EXCEPTION 'FORBIDDEN_NOT_HOST';
    END IF;

    SELECT * INTO v_sub FROM public.submissions 
    WHERE room_id = p_room_id AND user_id = p_presenter_id;
    
    IF v_sub IS NULL THEN
        RAISE EXCEPTION 'SUBMISSION_NOT_FOUND';
    END IF;

    -- 以 SECURITY DEFINER 權限更新輪次
    UPDATE public.submissions
    SET round_counter = p_next_round
    WHERE room_id = p_room_id AND user_id = p_presenter_id;

    UPDATE public.rooms
    SET status = 'presenting',
        round_counter = p_next_round,
        current_presenter = v_sub.display_name,
        current_presenter_id = p_presenter_id,
        statements = v_sub.statements,
        lie_index = -1,
        story = '',
        vote_summary = '{"0":0, "1":0, "2":0}'::jsonb,
        updated_at = now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'round', p_next_round, 'presenter', v_sub.display_name);
END;
$$;

-- 11.3 原子化歸檔 (精準 Join 與總結生成)
CREATE OR REPLACE FUNCTION public.archive_and_end_room(
    p_room_id TEXT,
    p_summary_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_host_id UUID;
    v_summary_data JSONB;
BEGIN
    SELECT host_id INTO v_host_id FROM public.rooms WHERE id = p_room_id;
    IF v_host_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'ROOM_NOT_FOUND');
    END IF;
    IF v_host_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'FORBIDDEN_NOT_HOST');
    END IF;

    SELECT jsonb_agg(sub) INTO v_summary_data
    FROM (
        SELECT
            s.user_id,
            s.display_name,
            s.statements,
            s.lie_index,
            s.story,
            s.round_counter,
            COALESCE(
                (SELECT jsonb_object_agg(choice::text, cnt)
                 FROM (
                     SELECT choice, COUNT(*) AS cnt
                     FROM public.votes v
                     WHERE v.room_id = p_room_id AND v.round_counter = s.round_counter
                     GROUP BY choice
                 ) c
                ),
                '{"0":0, "1":0, "2":0}'::jsonb
            ) AS vote_distribution,
            COALESCE(
                (SELECT COUNT(*) FROM public.votes v
                 WHERE v.room_id = p_room_id
                   AND v.round_counter = s.round_counter
                   AND v.choice = s.lie_index),
                0
            ) AS fooled_count
        FROM public.submissions s
        WHERE s.room_id = p_room_id AND s.round_counter IS NOT NULL
        ORDER BY s.round_counter ASC
    ) sub;

    INSERT INTO public.summaries (id, room_id, summary_data, expires_at)
    VALUES (p_summary_token, p_room_id, COALESCE(v_summary_data, '[]'::jsonb), NULL);

    UPDATE public.rooms
    SET status = 'ended',
        ended_at = now(),
        updated_at = now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'token', p_summary_token);
END;
$$;

-- 12. 啟用 Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13. pg_cron 定時清理
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('cleanup-expired-rooms')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-rooms');

SELECT cron.schedule(
    'cleanup-expired-rooms',
    '0 3 * * *',
    $$
        DELETE FROM public.rooms
        WHERE (ended_at IS NOT NULL AND ended_at < now() - interval '7 days')
           OR (updated_at < now() - interval '7 days');

        DELETE FROM public.summaries WHERE expires_at < now();
    $$
);

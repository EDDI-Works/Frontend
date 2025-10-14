// meeting/pages/MeetingPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetingEditorBody, { type MeetingCore, type MeetingMeta } from "../components/MeetingEditorBody";
import { useMeeting } from "../hooks/useMeeting.ts";
import { meetingApi, type ReadMeetingResponse } from "../../api/meetingApi"; // [CHANGED] 타입 import

// 로컬 저장 키
const notesKey = (id: string) => `meeting:notes:${id}`;
const metaKey  = (id: string) => `meeting:meta:${id}`;
const titleKey = (id: string) => `meeting:title:${id}`;

// Date | string → ISO 문자열 보정 유틸
function toISO(v?: Date | string): string | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// [NEW] 서버 응답 → 에디터 메타로 변환
function normalizeMetaFromServer(d: ReadMeetingResponse): MeetingMeta {
    const participants =
        (d.participantList ?? [])
            .map((m) => (m.nickname ?? m.name ?? m.displayName ?? "").toString().trim())
            .filter(Boolean)
            .join(", ");

    return {
        location: "",
        participants,           // ", " 문자열
        links: [],
        notes: d.noteContent ?? "",
    };
}

export default function MeetingPage() {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const { meetings } = useMeeting();

    // [CHANGED] 서버 상세 타입 명시
    const [serverDetail, setServerDetail] = React.useState<ReadMeetingResponse | null>(null);

    // 캘린더에서 대상 미팅 찾기
    const meeting = React.useMemo(
        () => (meetings ?? []).find((m: any) => String(m?.id) === String(id)) || null,
        [meetings, id]
    );

    // 기본 meta/notes 로드(없으면 빈값)
    const baseMeta: MeetingMeta = { location: "", participants: "", links: [], notes: "" };
    let loadedMeta = baseMeta;
    let loadedTitle = "";
    try {
        const raw = localStorage.getItem(metaKey(id));
        if (raw) loadedMeta = { ...loadedMeta, ...JSON.parse(raw) };
        const n = localStorage.getItem(notesKey(id));
        if (n) loadedMeta.notes = n;
        const t = localStorage.getItem(titleKey(String(id)));
        if (t) loadedTitle = t;
    } catch {}

    // [CHANGED] 상세 진입 시 서버 단건 조회 + 로컬 동기화
    React.useEffect(() => {
        let alive = true;
        if (!id || id === "new") return;

        (async () => {
            try {
                const data = await meetingApi.getMeetingDetail(id); // ReadMeetingResponse
                if (!alive || !data) return;
                setServerDetail(data);

                // ▼ 기존 data.content / data.meta 접근을 noteContent/participantList로 치환
                if (data.title) localStorage.setItem(titleKey(id), data.title);
                localStorage.setItem(notesKey(id), data.noteContent ?? "");
                localStorage.setItem(
                    metaKey(id),
                    JSON.stringify({ ...loadedMeta, ...normalizeMetaFromServer(data) })
                );
            } catch {
                // 404/권한 오류 등은 조용히 패스
            }
        })();

        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // 초기값 구성 (서버 상세 > 리스트 캐시 > 로컬)
    const now = React.useMemo(() => new Date(), []);
    const initial = React.useMemo(() => {
        const src = serverDetail ?? meeting;
        const title = loadedTitle || (src?.title ?? "");
        const start = src?.start ? new Date(src.start) : now;
        const end   = src?.end   ? new Date(src.end)   : new Date(now.getTime() + 60 * 60 * 1000);

        // team: 서버는 teamList로 오므로 문자열로 합쳐 호환
        const team =
            serverDetail
                ? (serverDetail.teamList?.map((t) => (t.name ?? t.teamName ?? "")).filter(Boolean).join(", ") || undefined)
                : (meeting?.team ?? undefined);

        const meta = serverDetail ? normalizeMetaFromServer(serverDetail) : loadedMeta;

        return {
            meeting: src ? ({
                id, title, start, end, allDay: !!src.allDay, team,
            }) : ({
                id, title: title || "", start, end, allDay: false,
            } as MeetingCore),
            meta,
        };
    }, [serverDetail, meeting, id, loadedMeta, loadedTitle, now]);

    // 저장(자동 저장이 이 함수를 호출)
    const handleSave = React.useCallback(async ({ meeting: next, meta: nextMeta }: { meeting: MeetingCore; meta: MeetingMeta }) => {
        const hasPublicId = !!next.id && next.id.trim() !== "" && next.id !== "new";

        try {
            if (hasPublicId) {
                await meetingApi.updateMeeting(String(next.id), {
                    title: next.title,
                    start: toISO(next.start),
                    end:   toISO(next.end),
                    allDay: !!next.allDay,
                    meetingVersion: serverDetail?.meetingVersion, // [KEEP] 낙관적 잠금
                    // content: nextMeta.notes, // ← 노트도 PATCH로 보낼 때 주석 해제
                });
            } else {
                const created = await meetingApi.createMeeting({
                    title: next.title || "제목 없음",
                    allDay: !!next.allDay,
                    start: toISO(next.start)!,
                    end:   toISO(next.end)!,
                    projectId: null,
                    participantAccountIds: [],
                    teamIds: [],
                });

                const newPublicId = created.publicId;
                // 로컬 키 이관
                localStorage.setItem(titleKey(newPublicId), next.title ?? "");
                if (nextMeta.notes != null) localStorage.setItem(notesKey(newPublicId), nextMeta.notes);
                localStorage.setItem(metaKey(newPublicId), JSON.stringify(nextMeta));
                navigate(`/meeting/${newPublicId}`, { replace: true });
                return;
            }
        } catch (e) {
            console.warn("[MeetingPage] save failed", e);
        } finally {
            // 로컬 백업
            localStorage.setItem(titleKey(String(id)), next.title ?? "");
            if (nextMeta.notes != null) localStorage.setItem(notesKey(String(id)), nextMeta.notes);
            localStorage.setItem(metaKey(String(id)), JSON.stringify(nextMeta));
        }
    }, [id, navigate, serverDetail?.meetingVersion]);

    const noData =
        !meeting && !serverDetail &&
        !loadedMeta.notes && !loadedMeta.location && !loadedMeta.participants &&
        !(loadedMeta.links?.length);

    if (noData) {
        // 안내 UI 필요 시 여기에
    }

    return (
        <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
            <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
                <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(31,41,55,0.06)] min-h-0">
                    <MeetingEditorBody
                        mode="detail"                // 항상 detail 모드
                        initial={initial}
                        onCancel={() => navigate(-1)}
                        onSave={handleSave}          // 자동 저장이 600ms 디바운스로 호출됨
                    />
                </div>
            </div>
        </div>
    );
}

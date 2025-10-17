// MeetingPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetingEditorBody, { type MeetingCore, type MeetingMeta } from "../components/MeetingEditorBody";
import { useMeeting } from "../hooks/useMeeting.ts";
import { meetingApi, type ReadMeetingResponse } from "../../api/meetingApi";

const notesKey = (id: string) => `meeting:notes:${id}`;
const metaKey  = (id: string) => `meeting:meta:${id}`;
const titleKey = (id: string) => `meeting:title:${id}`;

function toLocalISOSeconds(v?: Date | string): string | undefined {
    if (!v) return undefined;
    const d = v instanceof Date ? new Date(v) : new Date(v);
    if (isNaN(d.getTime())) return undefined;

    // ★ 서버가 '로컬 시각을 UTC로' 읽는다고 가정하고, 미리 offset만큼 빼서 보냄
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm   = pad(d.getMonth() + 1);
    const dd   = pad(d.getDate());
    const HH   = pad(d.getHours());
    const MM   = pad(d.getMinutes());
    const SS   = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}`; // 오프셋 없이!
}

// 서버 기본 시드 문자열을 빈 문자열로 강제 변환 (표시/캐시에만 적용)
function coerceServerNotes(v?: string | null): string {
    if (!v) return "";
    const s = String(v).trim();
    if (/^#{0,6}\s*notes?\s*$/i.test(s)) return "";
    return v;
}

function normalizeMetaFromServer(d: ReadMeetingResponse): MeetingMeta {
    const participants =
        (d.participantList ?? [])
            .map((m) => (m.nickname ?? m.name ?? m.displayName ?? "").toString().trim())
            .filter(Boolean)
            .join(", ");
    return {
        location: "",
        participants,
        links: [],
        notes: coerceServerNotes(d.noteContent), // [CHANGED]
    };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function MeetingPage() {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const { meetings } = useMeeting();

    // 새 미팅 여부/모드 계산
    const isNew = !id || id === "new" || !UUID_RE.test(String(id));
    const mode: "new" | "detail" = isNew ? "new" : "detail";

    const isInvalidId = id && id !== "new" && !UUID_RE.test(id);
    React.useEffect(() => { if (isInvalidId) navigate("/meeting/new", { replace: true }); }, [isInvalidId, navigate]);

    const [serverDetail, setServerDetail] = React.useState<ReadMeetingResponse | null>(null);
    const [editorResetKey, setEditorResetKey] = React.useState(0);
    const creatingRef = React.useRef(false);

    const meeting = React.useMemo(
        () => (meetings ?? []).find((m: any) => String(m?.id) === String(id)) || null,
        [meetings, id]
    );

    // ===== 로컬 캐시 로드 (detail일 때만) =====
    const baseMeta: MeetingMeta = { location: "", participants: "", links: [], notes: "" };
    let loadedMeta: MeetingMeta = baseMeta;
    let loadedTitle = "";

    try {
        if (!isNew) {
            const raw = localStorage.getItem(metaKey(id));
            if (raw) loadedMeta = { ...loadedMeta, ...JSON.parse(raw) };
            const n = localStorage.getItem(notesKey(id));
            if (n != null) loadedMeta.notes = String(n);
            const t = localStorage.getItem(titleKey(String(id)));
            if (t) loadedTitle = t;
        }
    } catch {}

    // ===== 서버 상세 로드 (detail일 때만) =====
    React.useEffect(() => {
        let alive = true;
        if (isNew) return;
        (async () => {
            try {
                const data = await meetingApi.getMeetingDetail(id!);
                if (!alive || !data) return;
                setServerDetail(data);

                // [CHANGED] 캐시에 저장할 때도 시드 -> 빈 문자열로
                if (data.title) localStorage.setItem(titleKey(id!), data.title);
                localStorage.setItem(notesKey(id!), coerceServerNotes(data.noteContent));
                localStorage.setItem(metaKey(id!), JSON.stringify({ ...loadedMeta, ...normalizeMetaFromServer(data) }));
            } catch {
                setServerDetail(null);
            }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isNew]);

    // ===== 에디터 initial =====
    const now = React.useMemo(() => new Date(), []);

    // 새 미팅용 깨끗한 initial (시간/종일값은 유지; 텍스트 필드만 비움)
    const blankInitial = React.useMemo(() => {
        const start = now;
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        return {
            meeting: { id: undefined, title: "", start, end, allDay: false } as MeetingCore,
            meta: { location: "", participants: "", links: [], notes: "" } as MeetingMeta,
        };
    }, [now]);

    const initial = React.useMemo(() => {
        if (mode === "new") return blankInitial;
        const src = serverDetail ?? meeting;
        const title = loadedTitle || (src?.title ?? "");
        const start = src?.start ? new Date(src.start) : now;
        const end   = src?.end   ? new Date(src.end)   : new Date(now.getTime() + 60 * 60 * 1000);
        const team =
            serverDetail
                ? (serverDetail.teamList?.map((t) => (t.name ?? t.teamName ?? "")).filter(Boolean).join(", ") || undefined)
                : (meeting?.team ?? undefined);
        const meta = serverDetail ? normalizeMetaFromServer(serverDetail) : loadedMeta;

        return {
            meeting: src
                ? ({ id, title, start, end, allDay: !!src.allDay, team })
                : ({ id, title: title || "", start, end, allDay: false } as MeetingCore),
            meta,
        };
    }, [mode, serverDetail, meeting, id, loadedMeta, loadedTitle, now, blankInitial]);

    // ===== 저장 =====
    const handleSave = React.useCallback(
        async ({ meeting: next, meta: nextMeta }: { meeting: MeetingCore; meta: MeetingMeta }) => {
            const isUuid = UUID_RE.test(String(next.id ?? ""));
            const canPatch = isUuid && !!serverDetail && String(serverDetail.publicId) === String(next.id);

            const buildUpdatePayload = (version?: number) => ({
                title: next.title,
                start: toLocalISOSeconds(next.start),
                end:   toLocalISOSeconds(next.end),
                allDay: !!next.allDay,
                meetingVersion: typeof version === "number" ? version : Number(version),
                content: nextMeta.notes, // ★ 원문 그대로 (빈 문자열 허용)
            });

            try {
                if (canPatch) {
                    try {
                        await meetingApi.updateMeeting(
                            String(next.id),
                            buildUpdatePayload(
                                typeof serverDetail?.meetingVersion === "number" ? serverDetail?.meetingVersion : Number(serverDetail?.meetingVersion)
                            )
                        );
                    } catch (e: any) {
                        if (e?.response?.status === 409) {
                            const latest = await meetingApi.getMeetingDetail(String(next.id));
                            setServerDetail(latest);

                            // 재조회 후 캐시에도 시드 제거해서 저장
                            if (latest.title) localStorage.setItem(titleKey(String(next.id)), latest.title);
                            localStorage.setItem(notesKey(String(next.id)), coerceServerNotes(latest.noteContent));
                            localStorage.setItem(metaKey(String(next.id)), JSON.stringify({ ...normalizeMetaFromServer(latest) }));
                            setEditorResetKey(k => k + 1);
                            return;
                        } else {
                            throw e;
                        }
                    }
                } else {
                    // create → 곧바로 content 포함 update
                    if (creatingRef.current) return;
                    creatingRef.current = true;
                    const payload = {
                        title: next.title || "제목 없음",
                        allDay: !!next.allDay,
                        start: toLocalISOSeconds(next.start)!,
                        end:   toLocalISOSeconds(next.end)!,
                    };
                    try {
                        // 1) 생성
                        const created = await meetingApi.createMeeting(payload as any);
                        const newPublicId = created.publicId;

                        // 2) 최신 버전 조회
                        const latest = await meetingApi.getMeetingDetail(newPublicId);

                        // 3) 내용 포함 update (빈 문자열도 그대로)
                        await meetingApi.updateMeeting(newPublicId, {
                            title: next.title || latest.title,
                            start: toLocalISOSeconds(next.start) ?? toLocalISOSeconds(latest.start),
                            end:   toLocalISOSeconds(next.end)   ?? toLocalISOSeconds(latest.end),
                            allDay: !!next.allDay,
                            meetingVersion: Number(latest.meetingVersion),
                            content: nextMeta.notes ?? "",
                        });

                        // 4) 로컬 캐시 (표시용 캐시엔 시드 제거 불필요 — 이미 원문)
                        localStorage.setItem(titleKey(newPublicId), next.title ?? "");
                        localStorage.setItem(notesKey(newPublicId), nextMeta.notes ?? "");
                        localStorage.setItem(metaKey(newPublicId), JSON.stringify(nextMeta));

                        // 5) 상세 이동
                        navigate(`/meeting/${newPublicId}`, { replace: true });
                        return;
                    } finally {
                        creatingRef.current = false;
                    }
                }
            } catch (e: any) {
                console.warn("[MeetingPage] save failed", e);
            } finally {
                // id가 UUID일 때만 현재 id 키에 씀 (“new” 키 오염 방지)
                if (UUID_RE.test(String(id))) {
                    localStorage.setItem(titleKey(String(id)), next.title ?? "");
                    localStorage.setItem(notesKey(String(id)), nextMeta.notes ?? "");
                    localStorage.setItem(metaKey(String(id)), JSON.stringify(nextMeta));
                }
            }
        },
        [id, navigate, serverDetail]
    );

    // ===== 삭제 =====
    const handleDelete = React.useCallback(async () => {
        if (!id || id === "new") return;
        try {
            const version =
                typeof serverDetail?.meetingVersion === "number"
                    ? serverDetail?.meetingVersion
                    : Number(serverDetail?.meetingVersion);

            // If-Match로 낙관적 잠금
            await meetingApi.deleteMeeting(String(id), {
                ifMatch: isFinite(version) ? version : undefined,
            });

            // 로컬 캐시 정리
            try {
                localStorage.removeItem(titleKey(String(id)));
                localStorage.removeItem(notesKey(String(id)));
                localStorage.removeItem(metaKey(String(id)));
            } catch {}

            // 이전 화면으로
            navigate(-1);
        } catch (e: any) {
            if (e?.response?.status === 409) {
                const latest = await meetingApi.getMeetingDetail(String(id));
                setServerDetail(latest);
                window.alert("다른 변경이 먼저 저장되었습니다. 다시 삭제를 시도해 주세요.");
            } else if (e?.response?.status === 403) {
                window.alert("삭제 권한이 없습니다.");
            } else if (e?.response?.status === 404) {
                // 이미 삭제됨으로 보고 뒤로가기
                navigate(-1);
            } else {
                console.warn("[MeetingPage] delete failed", e);
                window.alert("삭제 중 오류가 발생했습니다.");
            }
        }
    }, [id, navigate, serverDetail]);

    // 상세 조회가 성공했을 때만 보드 영속 허용
    const canPersistBoards = !!serverDetail && !isNew;

    if (isInvalidId) return null;

    const editorKey = mode === "new" ? "new" : String(id);

    return (
        <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
            <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
                <MeetingEditorBody
                    key={editorKey}
                    mode={mode}
                    initial={initial}
                    onCancel={() => navigate(-1)}
                    onSave={handleSave}
                    onDelete={mode === "detail" ? handleDelete : undefined}
                    canPersistBoards={canPersistBoards}
                    resetKey={editorResetKey}
                    onSync={
                        isNew
                            ? undefined
                            : async () => {
                                const pid = String(id);
                                const latest = await meetingApi.getMeetingDetail(pid);
                                setServerDetail(latest);
                                if (latest.title) localStorage.setItem(titleKey(pid), latest.title);
                                localStorage.setItem(notesKey(pid), coerceServerNotes(latest.noteContent));
                                localStorage.setItem(
                                    metaKey(pid),
                                    JSON.stringify({ ...normalizeMetaFromServer(latest) })
                                );
                                setEditorResetKey(k => k + 1);
                            }
                    }
                />
            </div>
        </div>
    );
}

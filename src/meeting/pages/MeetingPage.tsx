// import React from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import MeetingEditorBody, { type MeetingCore, type MeetingMeta } from "../components/MeetingEditorBody";
// import { useMeeting } from "../hooks/useMeeting.ts";
// import { meetingApi, type ReadMeetingResponse } from "../../api/meetingApi";
//
// // 로컬 저장 키
// const notesKey = (id: string) => `meeting:notes:${id}`;
// const metaKey  = (id: string) => `meeting:meta:${id}`;
// const titleKey = (id: string) => `meeting:title:${id}`;
//
// // Date | string → ISO 문자열 보정 유틸 (기존)
// function toISO(v?: Date | string): string | undefined {
//     if (!v) return undefined;
//     if (v instanceof Date) return v.toISOString();
//     const d = new Date(v);
//     return isNaN(d.getTime()) ? undefined : d.toISOString();
// }
//
// // [NEW] 서버가 요구하는 포맷: YYYY-MM-DDTHH:mm:ss (Z 없음)
// function toLocalISOSeconds(v?: Date | string): string | undefined {
//     if (!v) return undefined;
//     const d = v instanceof Date ? v : new Date(v);
//     if (isNaN(d.getTime())) return undefined;
//     const pad = (n: number) => String(n).padStart(2, "0");
//     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
// }
//
// // 서버 응답 → 에디터 메타로 변환
// function normalizeMetaFromServer(d: ReadMeetingResponse): MeetingMeta {
//     const participants =
//         (d.participantList ?? [])
//             .map((m) => (m.nickname ?? m.name ?? m.displayName ?? "").toString().trim())
//             .filter(Boolean)
//             .join(", ");
//
//     return { location: "", participants, links: [], notes: d.noteContent ?? "" };
// }
//
// const UUID_RE =
//     /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
//
// export default function MeetingPage() {
//     const navigate = useNavigate();
//     const { id = "" } = useParams();
//     const { meetings } = useMeeting();
//
//     // 잘못된 id는 useEffect에서 리다이렉트 (렌더 중 navigate 금지)
//     const isInvalidId = id && id !== "new" && !UUID_RE.test(id);
//     React.useEffect(() => {
//         if (isInvalidId) navigate("/meeting/new", { replace: true });
//     }, [isInvalidId, navigate]);
//
//     const [serverDetail, setServerDetail] = React.useState<ReadMeetingResponse | null>(null);
//
//     // 중복 생성 가드 (StrictMode + autosave)
//     const creatingRef = React.useRef(false);
//
//     // 리스트 캐시에서 찾기
//     const meeting = React.useMemo(
//         () => (meetings ?? []).find((m: any) => String(m?.id) === String(id)) || null,
//         [meetings, id]
//     );
//
//     // 로컬 초깃값 로드
//     const baseMeta: MeetingMeta = { location: "", participants: "", links: [], notes: "" };
//     let loadedMeta = baseMeta;
//     let loadedTitle = "";
//     try {
//         const raw = localStorage.getItem(metaKey(id));
//         if (raw) loadedMeta = { ...loadedMeta, ...JSON.parse(raw) };
//         const n = localStorage.getItem(notesKey(id));
//         if (n) loadedMeta.notes = n;
//         const t = localStorage.getItem(titleKey(String(id)));
//         if (t) loadedTitle = t;
//     } catch {}
//
//     // 상세 조회
//     React.useEffect(() => {
//         let alive = true;
//         if (!id || id === "new" || !UUID_RE.test(id)) return;
//
//         (async () => {
//             try {
//                 const data = await meetingApi.getMeetingDetail(id);
//                 if (!alive || !data) return;
//                 setServerDetail(data);
//
//                 if (data.title) localStorage.setItem(titleKey(id), data.title);
//                 localStorage.setItem(notesKey(id), data.noteContent ?? "");
//                 localStorage.setItem(
//                     metaKey(id),
//                     JSON.stringify({ ...loadedMeta, ...normalizeMetaFromServer(data) })
//                 );
//             } catch {
//                 setServerDetail(null);
//             }
//         })();
//
//         return () => { alive = false; };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [id]);
//
//     // 에디터 초기값
//     const now = React.useMemo(() => new Date(), []);
//     const initial = React.useMemo(() => {
//         const src = serverDetail ?? meeting;
//         const title = loadedTitle || (src?.title ?? "");
//         const start = src?.start ? new Date(src.start) : now;
//         const end   = src?.end   ? new Date(src.end)   : new Date(now.getTime() + 60 * 60 * 1000);
//
//         const team =
//             serverDetail
//                 ? (serverDetail.teamList?.map((t) => (t.name ?? t.teamName ?? "")).filter(Boolean).join(", ") || undefined)
//                 : (meeting?.team ?? undefined);
//
//         const meta = serverDetail ? normalizeMetaFromServer(serverDetail) : loadedMeta;
//
//         return {
//             meeting: src ? ({ id, title, start, end, allDay: !!src.allDay, team }) : ({ id, title: title || "", start, end, allDay: false } as MeetingCore),
//             meta,
//         };
//     }, [serverDetail, meeting, id, loadedMeta, loadedTitle, now]);
//
//     // 저장
//     const handleSave = React.useCallback(
//         async ({ meeting: next, meta: nextMeta }: { meeting: MeetingCore; meta: MeetingMeta }) => {
//             const isUuid = UUID_RE.test(String(next.id ?? ""));
//             const canPatch = isUuid && !!serverDetail && String(serverDetail.publicId) === String(next.id);
//
//             // 서버가 받는 포맷으로 변환 + 버전 number 강제
//             const buildUpdatePayload = (version?: number) => ({
//                 title: next.title,
//                 start: toLocalISOSeconds(next.start),
//                 end:   toLocalISOSeconds(next.end),
//                 allDay: !!next.allDay,
//                 meetingVersion: typeof version === "number" ? version : Number(version),
//                 content: nextMeta.notes, // ← 노트도 함께 저장하고 싶으면 유지
//             });
//
//             try {
//                 if (canPatch) {
//                     // 1차 시도
//                     try {
//                         await meetingApi.updateMeeting(String(next.id), buildUpdatePayload(
//                             typeof serverDetail?.meetingVersion === "number"
//                                 ? serverDetail?.meetingVersion
//                                 : Number(serverDetail?.meetingVersion)
//                         ));
//                     } catch (e: any) {
//                         // 409면 최신 버전으로 1회 재시도
//                         if (e?.response?.status === 409) {
//                             const latest = await meetingApi.getMeetingDetail(String(next.id));
//                             setServerDetail(latest);
//
//                             await meetingApi.updateMeeting(
//                                 String(next.id),
//                                 buildUpdatePayload(
//                                     typeof latest.meetingVersion === "number"
//                                         ? latest.meetingVersion
//                                         : Number(latest.meetingVersion)
//                                 )
//                             );
//                         } else {
//                             throw e;
//                         }
//                     }
//                 } else {
//                     // === CREATE === (그대로)
//                     if (creatingRef.current) return;
//                     creatingRef.current = true;
//
//                     const payload = {
//                         title: next.title || "제목 없음",
//                         allDay: !!next.allDay,
//                         start: toLocalISOSeconds(next.start)!,
//                         end:   toLocalISOSeconds(next.end)!,
//                     };
//
//                     try {
//                         const created = await meetingApi.createMeeting(payload as any);
//                         const newPublicId = created.publicId;
//                         localStorage.setItem(titleKey(newPublicId), next.title ?? "");
//                         if (nextMeta.notes != null) localStorage.setItem(notesKey(newPublicId), nextMeta.notes);
//                         localStorage.setItem(metaKey(newPublicId), JSON.stringify(nextMeta));
//                         navigate(`/meeting/${newPublicId}`, { replace: true });
//                         return;
//                     } finally {
//                         creatingRef.current = false;
//                     }
//                 }
//             } catch (e: any) {
//                 console.warn("[MeetingPage] save failed", e);
//                 if (e?.response?.data) {
//                     console.error("[create/update Meeting] server response:", e.response.data);
//                 }
//             } finally {
//                 // 로컬 백업 유지
//                 localStorage.setItem(titleKey(String(id)), next.title ?? "");
//                 if (nextMeta.notes != null) localStorage.setItem(notesKey(String(id)), nextMeta.notes);
//                 localStorage.setItem(metaKey(String(id)), JSON.stringify(nextMeta));
//             }
//         },
//         [id, navigate, serverDetail]
//     );
//
//     const canPersistBoards = !!serverDetail;
//
//     if (isInvalidId) return null;
//
//     return (
//         <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
//             <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
//                 <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(31,41,55,0.06)] min-h-0">
//                     <MeetingEditorBody
//                         mode="detail"
//                         initial={initial}
//                         onCancel={() => navigate(-1)}
//                         onSave={handleSave}
//                         canPersistBoards={canPersistBoards}
//                     />
//                 </div>
//             </div>
//         </div>
//     );
// }

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetingEditorBody, { type MeetingCore, type MeetingMeta } from "../components/MeetingEditorBody";
import { useMeeting } from "../hooks/useMeeting.ts";
import { meetingApi, type ReadMeetingResponse } from "../../api/meetingApi";

// 로컬 저장 키
const notesKey = (id: string) => `meeting:notes:${id}`;
const metaKey  = (id: string) => `meeting:meta:${id}`;
const titleKey = (id: string) => `meeting:title:${id}`;

// Date | string → ISO 문자열 보정 유틸 (기존)
function toISO(v?: Date | string): string | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// 서버가 요구하는 포맷: YYYY-MM-DDTHH:mm:ss (Z 없음)
function toLocalISOSeconds(v?: Date | string): string | undefined {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return undefined;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 서버 응답 → 에디터 메타로 변환
function normalizeMetaFromServer(d: ReadMeetingResponse): MeetingMeta {
    const participants =
        (d.participantList ?? [])
            .map((m) => (m.nickname ?? m.name ?? m.displayName ?? "").toString().trim())
            .filter(Boolean)
            .join(", ");

    return { location: "", participants, links: [], notes: d.noteContent ?? "" };
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function MeetingPage() {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const { meetings } = useMeeting();

    // 잘못된 id는 useEffect에서 리다이렉트 (렌더 중 navigate 금지)
    const isInvalidId = id && id !== "new" && !UUID_RE.test(id);
    React.useEffect(() => {
        if (isInvalidId) navigate("/meeting/new", { replace: true });
    }, [isInvalidId, navigate]);

    const [serverDetail, setServerDetail] = React.useState<ReadMeetingResponse | null>(null);
    const [editorResetKey, setEditorResetKey] = React.useState(0); // 🔁 에디터 리셋 트리거

    // 중복 생성 가드 (StrictMode 등에서 2번 방지)
    const creatingRef = React.useRef(false);

    // 리스트 캐시에서 찾기
    const meeting = React.useMemo(
        () => (meetings ?? []).find((m: any) => String(m?.id) === String(id)) || null,
        [meetings, id]
    );

    // 로컬 초깃값 로드
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

    // 상세 조회
    React.useEffect(() => {
        let alive = true;
        if (!id || id === "new" || !UUID_RE.test(id)) return;

        (async () => {
            try {
                const data = await meetingApi.getMeetingDetail(id);
                if (!alive || !data) return;
                setServerDetail(data);

                if (data.title) localStorage.setItem(titleKey(id), data.title);
                localStorage.setItem(notesKey(id), data.noteContent ?? "");
                localStorage.setItem(
                    metaKey(id),
                    JSON.stringify({ ...loadedMeta, ...normalizeMetaFromServer(data) })
                );
            } catch {
                setServerDetail(null);
            }
        })();

        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // 에디터 초기값
    const now = React.useMemo(() => new Date(), []);
    const initial = React.useMemo(() => {
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
            meeting: src ? ({ id, title, start, end, allDay: !!src.allDay, team }) : ({ id, title: title || "", start, end, allDay: false } as MeetingCore),
            meta,
        };
    }, [serverDetail, meeting, id, loadedMeta, loadedTitle, now]);

    // 저장
    const handleSave = React.useCallback(
        async ({ meeting: next, meta: nextMeta }: { meeting: MeetingCore; meta: MeetingMeta }) => {
            const isUuid = UUID_RE.test(String(next.id ?? ""));
            const canPatch = isUuid && !!serverDetail && String(serverDetail.publicId) === String(next.id);

            // 서버가 받는 포맷으로 변환 + 버전 number 강제
            const buildUpdatePayload = (version?: number) => ({
                title: next.title,
                start: toLocalISOSeconds(next.start),
                end:   toLocalISOSeconds(next.end),
                allDay: !!next.allDay,
                meetingVersion: typeof version === "number" ? version : Number(version),
                content: nextMeta.notes, // 서버가 note까지 PATCH 허용하면 유지
            });

            try {
                if (canPatch) {
                    try {
                        await meetingApi.updateMeeting(String(next.id), buildUpdatePayload(
                            typeof serverDetail?.meetingVersion === "number"
                                ? serverDetail?.meetingVersion
                                : Number(serverDetail?.meetingVersion)
                        ));
                    } catch (e: any) {
                        if (e?.response?.status === 409) {
                            // 🔁 409: 최신 불러오고 에디터 리셋 (자동 재시도 없음)
                            const latest = await meetingApi.getMeetingDetail(String(next.id));
                            setServerDetail(latest);

                            if (latest.title) localStorage.setItem(titleKey(String(next.id)), latest.title);
                            localStorage.setItem(notesKey(String(next.id)), latest.noteContent ?? "");
                            localStorage.setItem(
                                metaKey(String(next.id)),
                                JSON.stringify({ ...normalizeMetaFromServer(latest) })
                            );

                            setEditorResetKey(k => k + 1);
                            // 원하면 사용자 안내 토스트/알럿 추가 가능
                            return;
                        } else {
                            throw e;
                        }
                    }
                } else {
                    // === CREATE ===
                    if (creatingRef.current) return;
                    creatingRef.current = true;

                    const payload = {
                        title: next.title || "제목 없음",
                        allDay: !!next.allDay,
                        start: toLocalISOSeconds(next.start)!,
                        end:   toLocalISOSeconds(next.end)!,
                    };

                    try {
                        const created = await meetingApi.createMeeting(payload as any);
                        const newPublicId = created.publicId;
                        localStorage.setItem(titleKey(newPublicId), next.title ?? "");
                        if (nextMeta.notes != null) localStorage.setItem(notesKey(newPublicId), nextMeta.notes);
                        localStorage.setItem(metaKey(newPublicId), JSON.stringify(nextMeta));
                        navigate(`/meeting/${newPublicId}`, { replace: true });
                        return;
                    } finally {
                        creatingRef.current = false;
                    }
                }
            } catch (e: any) {
                console.warn("[MeetingPage] save failed", e);
                if (e?.response?.data) {
                    console.error("[create/update Meeting] server response:", e.response.data);
                }
            } finally {
                // 로컬 백업 유지
                localStorage.setItem(titleKey(String(id)), next.title ?? "");
                if (nextMeta.notes != null) localStorage.setItem(notesKey(String(id)), nextMeta.notes);
                localStorage.setItem(metaKey(String(id)), JSON.stringify(nextMeta));
            }
        },
        [id, navigate, serverDetail]
    );

    const canPersistBoards = !!serverDetail;

    if (isInvalidId) return null;

    return (
        <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
            <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
                <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(31,41,55,0.06)] min-h-0">
                    <MeetingEditorBody
                        mode="detail"
                        initial={initial}
                        onCancel={() => navigate(-1)}
                        onSave={handleSave}
                        canPersistBoards={canPersistBoards}
                        resetKey={editorResetKey}   // 🔁 리셋 트리거 전달
                    />
                </div>
            </div>
        </div>
    );
}

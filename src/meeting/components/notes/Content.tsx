import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownEditor from "./MarkdownEditor.tsx";
import Link from "./Link.tsx";
import BoardsPanel from "./BoardsPanel.tsx";

import { meetingApi, type MeetingTemplate } from "../../../api/meetingApi";

type Props = {
    publicId: string;
    title: string;
    setTitle: (v: string) => void;
    notes: string;
    setNotes: (v: string) => void;
    links: string[];
    setLinks: (v: string[]) => void;
    linkOpen: boolean;
    setLinkOpen: (v: boolean) => void;

    participants: string;

    canPersistBoards?: boolean; // 서버에 존재 확인(200)된 경우에만 보드 API 호출 허용
};

export default function Content({
                                    publicId,
                                    title, setTitle,
                                    notes, setNotes,
                                    links, setLinks,
                                    linkOpen, setLinkOpen,
                                    participants,
                                    canPersistBoards = false,
                                }: Props) {

    // 참가자 파싱(유지)
    const participantList = useMemo(
        () => participants.split(",").map(s => s.trim()).filter(Boolean),
        [participants]
    );

    // ===== 보드 더티/템플릿 표시 =====
    const [boardDirty, setBoardDirty] = useState(false);
    const currentTemplateRef = useRef<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(true);

    // 서버 템플릿 목록 상태
    const [templates, setTemplates] = useState<MeetingTemplate[] | null>(null);
    const [tplError, setTplError] = useState<string | null>(null);

    // 템플릿 목록 로드 (마운트 시 1회)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const list = await meetingApi.getMeetingTemplateList();
                if (!alive) return;
                setTemplates(list);
            } catch (e) {
                if (!alive) return;
                setTemplates(null);
                setTplError("템플릿을 불러오지 못했습니다."); // [INFO] UI는 폴백 버튼으로 대체됨
            }
        })();
        return () => { alive = false; };
    }, []);

    // BoardsPanel 이벤트 수신
    useEffect(() => {
        const onEdited   = () => setBoardDirty(true);
        const onCleared  = () => setBoardDirty(false);
        const onNonEmpty = () => setShowTemplates(false);
        const onEmpty    = () => { setShowTemplates(true); setBoardDirty(false); };
        window.addEventListener("boards:edited" as any, onEdited);
        window.addEventListener("boards:cleared" as any, onCleared);
        window.addEventListener("boards:nonempty" as any, onNonEmpty);
        window.addEventListener("boards:empty" as any, onEmpty);
        return () => {
            window.removeEventListener("boards:edited" as any, onEdited);
            window.removeEventListener("boards:cleared" as any, onCleared);
            window.removeEventListener("boards:nonempty" as any, onNonEmpty);
            window.removeEventListener("boards:empty" as any, onEmpty);
        };
    }, []);

    // 서버 템플릿으로 보드 초기화
    function initBoardFromServerTemplate(tpl: MeetingTemplate) {
        // BoardsPanel이 column.id를 필요로 할 수 있으니, 없으면 안정적 id 생성
        const columns = (tpl.columns ?? []).map((c, i) => ({
            id: `c${i + 1}`,
            key: c.key,
            label: c.label,
            badgeClass: c.badgeClass ?? null,
            users: [],
        }));

        const payload = {
            template: tpl.id,
            title: tpl.title,
            columns,
            ts: Date.now(),
        };

        try {
            window.dispatchEvent(new CustomEvent("boards:init", { detail: payload }) as any);
        } catch {}

        currentTemplateRef.current = tpl.id;
        setBoardDirty(false);
        setShowTemplates(false);
    }

    // 템플릿 클릭 시 곧바로 보드 초기화(패널 제거)
    function onTemplateClick(tplId: string) {
        if (currentTemplateRef.current && currentTemplateRef.current !== tplId && boardDirty) {
            const ok = window.confirm("현재 보드에 추가된 내용이 사라질 수 있어요. 템플릿을 변경할까요?");
            if (!ok) return;
        }

        const found = templates?.find(t => t.id === tplId);
        if (found) {
            initBoardFromServerTemplate(found);
            return;
        }

        (async () => {
            try {
                const one = await meetingApi.getMeetingTemplate(tplId);
                initBoardFromServerTemplate(one);
            } catch (e) {
                setTplError("템플릿을 불러오지 못했습니다.");
            }
        })();
    }

    // ===== 노트 입력 핸들러 (그대로 저장; 빈 문자열 포함) =====
    const handleNotesChange = (v: string) => {
        setNotes(v);
    };

    return (
        <div className="space-y-6">
            {/* 제목 */}
            <div className="flex items-start gap-2">
                <span className="mt-[10px] inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#BCE18D" }} />
                <textarea
                    id="title"
                    rows={1}
                    placeholder="제목을 입력해 주세요."
                    className="w-full resize-none bg-transparent outline-none text-[20px] font-semibold leading-[28px] scrollbar-hide"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            {/* 링크 */}
            <Link
                links={links} setLinks={setLinks}
                linkOpen={linkOpen} setLinkOpen={setLinkOpen}
            />

            {/* 노트 */}
            <div>
                <MarkdownEditor
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="빈 화면에 바로 작성하세요. (# 제목, - 목록, **굵게** 등)"
                />
            </div>

            {/* 보드 */}
            <BoardsPanel
                publicId={publicId}
                participantsStr={participants}
                canPersistBoards={canPersistBoards}
            />

            {/* 템플릿 — 보드 없을 때 항상 노출(초기 포함) */}
            {showTemplates && (
                <div className="rounded border border-[#E5E7EB] bg-white pb-2">
                    <div className="mb-1.5 border-b border-[#E5E7EB] px-3 py-2 text-sm text-[#6B7280]">템플릿</div>

                    {(templates && templates.length > 0 ? templates : [
                        { id: "standup", title: "스탠드업 미팅" },
                        { id: "4ls",     title: "4Ls 회고" },
                        { id: "kpt",     title: "KPT 회고" },
                    ]).map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className="relative flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-200/50"
                            onClick={() => onTemplateClick(t.id)}
                        >
                            <div className="max-w-full truncate">{("title" in t && (t as any).title) || t.id}</div>
                            <div className="flex-shrink-0 rounded-lg bg-[#E5E7EB] px-1.5 py-[3px] text-[10px] text-[#6B7280]">
                                기본
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

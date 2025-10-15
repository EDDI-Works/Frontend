import React from "react";
import { LayoutGroup } from "framer-motion";
import { MeetingSubnav } from "./MeetingLayout";
import { meetingApi } from "../../api/meetingApi";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 10;

export default function MeetingListPage() {
    const [page, setPage] = React.useState(1);
    const [pageItems, setPageItems] = React.useState<any[]>([]);
    const [total, setTotal] = React.useState(0);
    const navigate = useNavigate();

    // 서버 페이지네이션: page 변경 시마다 호출
    React.useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await meetingApi.getMeetingList({ page, perPage: PAGE_SIZE });
                const items = (res?.items ?? []).map((it) => ({
                    id: it.publicId, // publicId → UI id
                    title: it.title,
                    teams: undefined, // 서버 스키마에 없어서 비움(디자인 유지)
                    team: undefined,
                    start: it.start,
                    end: it.end,
                    status: undefined,
                }));

                // 시작시간 내림차순 정렬
                items.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

                if (!alive) return;
                setPageItems(items);
                setTotal(typeof res?.total === "number" ? res.total : items.length);
            } catch {
                if (!alive) return;
                setPageItems([]);
                setTotal(0);
            }
        })();
        return () => {
            alive = false;
        };
    }, [page]);

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const goPrev = () => setPage((p) => Math.max(1, p - 1));
    const goNext = () => setPage((p) => Math.min(pageCount, p + 1));

    const fmtDate = (iso?: string | Date) => {
        if (!iso) return "-";
        const d = typeof iso === "string" ? new Date(iso) : iso;
        if (isNaN(d.getTime())) return "-";
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    };

    const getStatus = (m: any): "before" | "done" => {
        if (m?.status === "DONE") return "done";
        if (m?.status === "SCHEDULED") return "before";
        const end = new Date(m?.end ?? m?.start ?? 0).getTime();
        return end && end < Date.now() ? "done" : "before";
    };

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const startIndex = (page - 1) * PAGE_SIZE;

    // Filter 버튼 숨김(최소 수정)
    React.useEffect(() => {
        const hideFilter = () => {
            const buttons = Array.from(document.querySelectorAll("button"));
            buttons.forEach((b) => {
                const t = (b.textContent || "").trim();
                if (t === "Filter" || t === "필터") {
                    (b as HTMLButtonElement).style.display = "none";
                }
            });
        };
        hideFilter();
        const id = window.setInterval(hideFilter, 300);
        return () => window.clearInterval(id);
    }, []);

    return (
        <LayoutGroup>
            <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
                {/* 페이지 타이틀 */}
                <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 mb-6 flex items-center min-h-0">
                    <div className="flex items-baseline gap-2 shrink-0">
                        <h1 className="text-[18px] font-bold text-[#1F2937] leading-none">나의 미팅 일정</h1>
                        <p className="text-[12px] text-[#98A2B3] leading-none">현재 미팅 일정을 확인해보세요</p>
                    </div>

                    {/* 구분선 */}
                    <div className="ml-3 flex-1 h-px bg-gradient-to-r from-[#E5E7EB] via-[#E5E7EB] to-transparent rounded-full" />
                </div>

                {/* 카드 래퍼 */}
                <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
                    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(31,41,55,0.06)] min-h-0">
                        {/* 상단 서브 네브 */}
                        <div className="shrink-0">
                            <MeetingSubnav />
                        </div>

                        {/* 본문 */}
                        <div className="flex-1 min-h-0 px-8 py-6 flex flex-col">
                            {/* 테이블 */}
                            <div className="flex-1 min-h-0 overflow-auto rounded-xl">
                                <div className="min-w-[980px]">
                                    {/* 헤더 */}
                                    <div className="grid grid-cols-[88px_1fr_1fr_1fr_180px] items-center px-6 h-12 bg-[#F7F8FB] rounded-2xl text-[14px] font-medium text-[#6B7280]">
                                        <div className="tracking-wide">No.</div>
                                        <div className="tracking-wide">제목</div>
                                        <div className="tracking-wide">참여팀</div>
                                        <div className="tracking-wide">회의 날짜</div>
                                        <div className="tracking-wide justify-self-end pr-2">상태</div>
                                    </div>

                                    {/* 로우 */}
                                    {pageItems.map((m: any, i: number) => {
                                        const num = startIndex + i + 1;
                                        const team =
                                            Array.isArray(m?.teams) && m.teams.length ? m.teams.join(", ") : m.team ?? m.teamName ?? "-";
                                        const status = getStatus(m);

                                        return (
                                            <div
                                                key={m.id ?? num}
                                                className="grid grid-cols-[88px_1fr_1fr_1fr_180px] items-center px-6 min-h-16 border-b border-[#EEF2F6] hover:bg-[#FAFBFF] cursor-pointer"
                                                onClick={() => m?.id && navigate(`/meeting/${m.id}`)}
                                                title="클릭하면 미팅 상세로 이동합니다."
                                            >
                                                {/* 번호 */}
                                                <div className="text-[14px]">
                          <span className="inline-flex h-6 min-w-8 items-center justify-center text-[#6B7280] font-medium px-2">
                            {pad2(num)}
                          </span>
                                                </div>

                                                {/* 제목 */}
                                                <div className="text-[14px] text-[#6B7280] font-medium line-clamp-1">{m.title ?? "-"}</div>

                                                {/* 참여팀 */}
                                                <div className="text-[14px] text-[#6B7280]">{team}</div>

                                                {/* 회의 날짜 */}
                                                <div className="text-[14px] text-[#6B7280]">{fmtDate(m.start)}</div>

                                                {/* 상태 */}
                                                <div className="justify-self-end pr-2">
                                                    <StatusPill kind={status} />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* 비어있을 때 */}
                                    {!pageItems.length && (
                                        <div className="flex items-center justify-center h-40 text-[#6B7280]">데이터가 없습니다.</div>
                                    )}
                                </div>
                            </div>

                            {/* 페이지네이션 — 버튼 톤을 미팅 페이지와 유사하게 보라 계열로 조정 */}
                            <div className="mt-4 flex items-center justify-center">
                                <div className="inline-flex items-center gap-2">
                                    <button
                                        className="px-3 h-9 rounded-md text-[#6B7280] border border-transparent hover:border-[#E5E7EB] hover:bg-[#F8F8FF]"
                                        onClick={goPrev}
                                        disabled={page <= 1}
                                    >
                                        이전
                                    </button>

                                    {/* 숫자 페이지 (최대 7개 윈도우) */}
                                    <div className="inline-flex items-center gap-1">
                                        {Array.from({ length: pageCount }, (_, i) => i + 1)
                                            .filter((n) => {
                                                const w = 3;
                                                return n === 1 || n === pageCount || (n >= page - w && n <= page + w);
                                            })
                                            .map((n, i, arr) => {
                                                const prev = arr[i - 1];
                                                const needDots = prev && n - prev > 1;
                                                return (
                                                    <React.Fragment key={n}>
                                                        {needDots && <div className="px-2 text-[#6B7280]">…</div>}
                                                        <button
                                                            className={[
                                                                "h-9 min-w-9 px-2 rounded-md border transition",
                                                                n === page
                                                                    ? "bg-[#6D6CF8] text-white font-medium border-[#6D6CF8]"
                                                                    : "border-[#E7E8F7] text-[#6B7280] hover:bg-[#F5F6FF]",
                                                            ].join(" ")}
                                                            onClick={() => setPage(n)}
                                                        >
                                                            {n}
                                                        </button>
                                                    </React.Fragment>
                                                );
                                            })}
                                    </div>

                                    <button
                                        className="px-3 h-9 rounded-md text-[#6B7280] border border-transparent hover:border-[#E5E7EB] hover:bg-[#F8F8FF]"
                                        onClick={goNext}
                                        disabled={page >= pageCount}
                                    >
                                        다음
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutGroup>
    );
}

function StatusPill({ kind }: { kind: "before" | "done" }) {
    const isBefore = kind === "before";
    const label = isBefore ? "회의 전" : "회의 완료";

    return (
        <span
            className={[
                "inline-flex items-center h-8 px-3 rounded-xl text-[12px] font-medium whitespace-nowrap border",
                isBefore
                    ? "bg-white text-[#6B7280] border-[#C9CEDA] shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                    : "bg-[#E9F6EE] text-[#2F7D32] border-[#CBE6D3]",
            ].join(" ")}
        >
      {label}
    </span>
    );
}
